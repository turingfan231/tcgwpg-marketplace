import { createClient } from "@supabase/supabase-js";

const BOOTSTRAP_LISTING_COLUMNS = [
  "id",
  "seller_id",
  "type",
  "game",
  "game_slug",
  "title",
  "price",
  "price_currency",
  "market_price",
  "market_price_currency",
  "condition",
  "neighborhood",
  "postal_code",
  "accepts_trade",
  "quantity",
  "description",
  "primary_image",
  "status",
  "featured",
  "flagged",
  "views",
  "offers",
  "created_at",
  "updated_at",
].join(",");
const BOOTSTRAP_PROFILE_COLUMNS = [
  "id",
  "role",
  "name",
  "username",
  "avatar_url",
  "neighborhood",
  "badges",
  "verified",
  "response_time",
  "completed_deals",
  "created_at",
].join(",");
const BOOTSTRAP_SITE_SETTINGS_COLUMNS = ["key", "payload", "updated_at"].join(",");
const MANUAL_EVENT_COLUMNS = [
  "id",
  "title",
  "store",
  "source",
  "source_type",
  "source_url",
  "date_str",
  "time",
  "game",
  "fee",
  "neighborhood",
  "note",
  "published",
].join(",");
const MANUAL_EVENT_FALLBACK_COLUMNS = [
  "id",
  "title",
  "store",
  "source",
  "date_str",
  "time",
  "game",
  "fee",
  "neighborhood",
  "note",
  "published",
].join(",");

const supabasePublic =
  process.env.VITE_SUPABASE_URL &&
  (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)
    ? createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      )
    : null;
const supabaseAdmin =
  process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;
const supabaseReadClient = supabaseAdmin || supabasePublic;

let bootstrapCache = {
  payload: null,
  expiresAt: 0,
};

function isMissingTableError(error, tableName) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes(String(tableName || "").toLowerCase()) &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("could not find"))
  );
}

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("column") &&
    message.includes(String(columnName || "").toLowerCase()) &&
    (message.includes("does not exist") || message.includes("schema cache"))
  );
}

function omitMissingProfileSelectColumns(columns, error) {
  const nextColumns = String(columns || "")
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean);

  const removableColumns = [
    "username",
    "avatar_url",
    "neighborhood",
    "badges",
    "verified",
    "response_time",
    "completed_deals",
    "created_at",
  ];

  return nextColumns
    .filter(
      (column) =>
        !removableColumns.some(
          (missing) => isMissingColumnError(error, missing) && column === missing,
        ),
    )
    .join(",");
}

async function selectProfilesWithFallback(profileIds = []) {
  if (!supabaseReadClient) {
    return { data: [], error: new Error("API server is not configured.") };
  }

  const normalizedIds = [...new Set((profileIds || []).map(String).filter(Boolean))];
  if (!normalizedIds.length) {
    return { data: [], error: null };
  }

  let currentColumns = BOOTSTRAP_PROFILE_COLUMNS;
  let lastResult = { data: [], error: null };
  const seen = new Set();

  while (currentColumns && !seen.has(currentColumns)) {
    seen.add(currentColumns);
    const result = await supabaseReadClient
      .from("profiles")
      .select(currentColumns)
      .in("id", normalizedIds);

    if (!result.error) {
      return result;
    }

    lastResult = result;
    const fallbackColumns = omitMissingProfileSelectColumns(currentColumns, result.error);
    if (!fallbackColumns || fallbackColumns === currentColumns) {
      break;
    }
    currentColumns = fallbackColumns;
  }

  return lastResult;
}

async function readBootstrapManualEvents() {
  if (!supabaseReadClient) {
    return { data: [], error: new Error("API server is not configured.") };
  }

  let result = await supabaseReadClient.from("manual_events").select(MANUAL_EVENT_COLUMNS);
  if (
    result.error &&
    (isMissingColumnError(result.error, "source_type") ||
      isMissingColumnError(result.error, "source_url"))
  ) {
    result = await supabaseReadClient
      .from("manual_events")
      .select(MANUAL_EVENT_FALLBACK_COLUMNS);
  }
  return result;
}

async function getOptionalActingUserId(req) {
  const authClient = supabaseAdmin || supabasePublic;
  const authHeader = String(req.headers.authorization || "");
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!authClient || !accessToken) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(accessToken);

  if (error || !user?.id) {
    return null;
  }

  return String(user.id);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!supabaseReadClient) {
    return res.status(501).json({ error: "API server is not configured." });
  }

  try {
    const actingUserId = await getOptionalActingUserId(req);
    const usePublicCache = !actingUserId;

    if (usePublicCache && bootstrapCache.payload && bootstrapCache.expiresAt > Date.now()) {
      res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=45");
      return res.status(200).json(bootstrapCache.payload);
    }

    const [listingsRes, manualEventsRes, siteSettingsRes, wishlistRes] = await Promise.all([
      supabaseReadClient
        .from("listings")
        .select(BOOTSTRAP_LISTING_COLUMNS)
        .order("updated_at", { ascending: false }),
      readBootstrapManualEvents(),
      supabaseReadClient
        .from("site_settings")
        .select(BOOTSTRAP_SITE_SETTINGS_COLUMNS)
        .eq("key", "global")
        .maybeSingle(),
      actingUserId
        ? supabaseReadClient.from("wishlists").select("listing_id").eq("user_id", actingUserId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (listingsRes.error) {
      return res.status(500).json({ error: listingsRes.error.message });
    }

    if (manualEventsRes.error) {
      return res.status(500).json({ error: manualEventsRes.error.message });
    }

    if (
      siteSettingsRes.error &&
      !isMissingTableError(siteSettingsRes.error, "site_settings")
    ) {
      return res.status(500).json({ error: siteSettingsRes.error.message });
    }

    if (wishlistRes.error && !isMissingTableError(wishlistRes.error, "wishlists")) {
      return res.status(500).json({ error: wishlistRes.error.message });
    }

    const sellerIds = [
      ...new Set(
        (listingsRes.data || [])
          .map((row) => String(row?.seller_id || "").trim())
          .filter(Boolean),
      ),
    ];
    const profilesRes = await selectProfilesWithFallback(sellerIds);
    if (profilesRes.error) {
      return res.status(500).json({ error: profilesRes.error.message });
    }

    const payload = {
      listings: listingsRes.data || [],
      profiles: profilesRes.data || [],
      manualEvents: manualEventsRes.data || [],
      siteSettings: siteSettingsRes.data || null,
      wishlist: wishlistRes.data || [],
      fetchedAt: new Date().toISOString(),
    };

    if (usePublicCache) {
      bootstrapCache = {
        payload,
        expiresAt: Date.now() + 15000,
      };
      res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=45");
    } else {
      res.setHeader("Cache-Control", "private, no-store");
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Bootstrap failed.",
    });
  }
}
