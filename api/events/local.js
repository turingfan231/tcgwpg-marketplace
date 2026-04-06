import { createClient } from "@supabase/supabase-js";

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

const supabaseReadClient =
  process.env.VITE_SUPABASE_URL &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY)
    ? createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      )
    : null;

let eventsCache = {
  payload: null,
  expiresAt: 0,
};

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("column") &&
    message.includes(String(columnName || "").toLowerCase()) &&
    (message.includes("does not exist") || message.includes("schema cache"))
  );
}

function sortEvents(rows = []) {
  return [...rows].sort((left, right) => {
    const leftTime = new Date(left?.date_str || left?.date || 0).getTime();
    const rightTime = new Date(right?.date_str || right?.date || 0).getTime();
    return leftTime - rightTime;
  });
}

async function readManualEvents() {
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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!supabaseReadClient) {
    return res.status(501).json({ error: "API server is not configured." });
  }

  try {
    if (eventsCache.payload && eventsCache.expiresAt > Date.now()) {
      res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=45");
      return res.status(200).json(eventsCache.payload);
    }

    const manualEventsRes = await readManualEvents();
    if (manualEventsRes.error) {
      return res.status(500).json({ error: manualEventsRes.error.message });
    }

    const events = sortEvents(
      (manualEventsRes.data || []).filter((event) => event?.published !== false),
    );

    const payload = {
      events,
      sources: [
        {
          id: "database-cache",
          label: "Database cache",
          mode: "Preloaded",
          note: "Serving preloaded event rows from Supabase.",
        },
      ],
      fetchedAt: new Date().toISOString(),
    };

    eventsCache = {
      payload,
      expiresAt: Date.now() + 15000,
    };

    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=45");
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to load local events." });
  }
}
