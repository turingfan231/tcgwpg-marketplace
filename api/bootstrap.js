const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

const PROFILE_COLUMNS = [
  "id",
  "role",
  "name",
  "username",
  "default_listing_game",
  "avatar_url",
  "neighborhood",
  "postal_code",
  "badges",
  "verified",
  "account_status",
  "banner_style",
  "favorite_games",
  "response_time",
  "completed_deals",
  "created_at",
  "onboarding_complete",
].join(",");

const LISTING_COLUMNS = [
  "id",
  "seller_id",
  "type",
  "game",
  "game_slug",
  "title",
  "price",
  "price_currency",
  "previous_price",
  "market_price",
  "condition",
  "neighborhood",
  "postal_code",
  "accepts_trade",
  "primary_image",
  "status",
  "featured",
  "views",
  "offers",
  "created_at",
  "updated_at",
].join(",");

const EVENT_COLUMNS = [
  "id",
  "title",
  "store",
  "date_str",
  "time",
  "game",
  "fee",
  "neighborhood",
  "note",
  "published",
].join(",");

const SITE_SETTINGS_COLUMNS = "key,payload";

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

  const missingProfileColumns = [
    "username",
    "avatar_url",
    "default_listing_game",
    "followed_seller_ids",
    "followed_store_slugs",
    "favorite_games",
    "banner_style",
    "onboarding_complete",
    "response_time",
    "completed_deals",
    "meetup_preferences",
    "badges",
    "verified",
    "account_status",
    "postal_code",
    "bio",
    "email",
  ];

  return nextColumns
    .filter(
      (column) =>
        !missingProfileColumns.some(
          (missing) => isMissingColumnError(error, missing) && column === missing,
        ),
    )
    .join(",");
}

async function selectProfilesWithFallback(buildQuery, initialColumns) {
  let currentColumns = String(initialColumns || "").trim();
  let lastResult = { data: null, error: null };
  const seen = new Set();

  while (currentColumns && !seen.has(currentColumns)) {
    seen.add(currentColumns);
    const result = await buildQuery(currentColumns);
    if (!result.error) {
      return { ...result, resolvedColumns: currentColumns };
    }

    lastResult = result;
    const fallbackColumns = omitMissingProfileSelectColumns(currentColumns, result.error);
    if (!fallbackColumns || fallbackColumns === currentColumns) {
      break;
    }

    currentColumns = fallbackColumns;
  }

  return { ...lastResult, resolvedColumns: currentColumns };
}

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

async function fetchSupabaseJson(path, timeoutMs = 8000) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase bootstrap client is not configured.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = data?.message || data?.error || text || `Supabase request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(_req, res) {
  try {
    const [listings, manualEvents, siteSettingsRows] = await Promise.all([
      fetchSupabaseJson(
        `listings?select=${encodeURIComponent(LISTING_COLUMNS)}&status=eq.active&order=created_at.desc&limit=120`,
      ),
      fetchSupabaseJson(
        `manual_events?select=${encodeURIComponent(EVENT_COLUMNS)}&published=eq.true&order=date_str.asc&limit=24`,
      ),
      fetchSupabaseJson(
        `site_settings?select=${encodeURIComponent(SITE_SETTINGS_COLUMNS)}&key=eq.global&limit=1`,
      ).catch(() => []),
    ]);

    const sellerIds = [...new Set((listings || []).map((listing) => String(listing.seller_id || "")).filter(Boolean))];
    let users = [];
    if (sellerIds.length) {
      const profileResult = await selectProfilesWithFallback(
        (columns) =>
          fetchSupabaseJson(
            `profiles?select=${encodeURIComponent(columns)}&id=in.(${sellerIds.join(",")})`,
          )
            .then((data) => ({ data, error: null }))
            .catch((error) => ({ data: null, error })),
        PROFILE_COLUMNS,
      );

      if (profileResult.error) {
        throw profileResult.error;
      }

      users = profileResult.data || [];
    }

    return json(res, 200, {
      users,
      listings: listings || [],
      manualEvents: manualEvents || [],
      siteSettings: Array.isArray(siteSettingsRows) ? siteSettingsRows[0] || null : null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json(res, 500, {
      error: error?.name === "AbortError" ? "Marketplace bootstrap timed out." : error?.message || "Marketplace bootstrap failed.",
    });
  }
}
