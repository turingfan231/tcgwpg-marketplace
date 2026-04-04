const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

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

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

async function fetchSupabaseJson(path, timeoutMs = 8000) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase events client is not configured.");
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
    const events = await fetchSupabaseJson(
      `manual_events?select=${encodeURIComponent(EVENT_COLUMNS)}&published=eq.true&order=date_str.asc&limit=40`,
    );

    return json(res, 200, {
      events: events || [],
      sources: [
        {
          id: "cache",
          label: "Database cache",
          mode: "Cached schedule",
          note: "Served from manual_events",
        },
      ],
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json(res, 500, {
      error: error?.name === "AbortError" ? "Local events fetch timed out." : error?.message || "Local events fetch failed.",
    });
  }
}
