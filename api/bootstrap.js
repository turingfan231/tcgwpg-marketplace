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
    const users = sellerIds.length
      ? await fetchSupabaseJson(
          `profiles?select=${encodeURIComponent(PROFILE_COLUMNS)}&id=in.(${sellerIds.join(",")})`,
        )
      : [];

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
