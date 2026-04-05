import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import {
  getOfferCounterpartyId,
  resolveOfferResponse,
} from "../src/lib/offerState.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const supabaseReadKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
const supabaseReadClient =
  process.env.VITE_SUPABASE_URL && supabaseReadKey
    ? createClient(process.env.VITE_SUPABASE_URL, supabaseReadKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
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

const API_VERSION = "v1.39.0";
const API_ROOT = `https://api.tcgplayer.com/${API_VERSION}`;
const TOKEN_ENDPOINT = "https://api.tcgplayer.com/token";
const TCGDEX_SEARCH_ENDPOINT = "https://api.tcgdex.net/v2/en/cards";
const TCGDEX_CARD_ENDPOINT = "https://api.tcgdex.net/v2/en/cards";
const OPTCG_ENDPOINT_CANDIDATES = {
  sets: [
    "https://www.optcgapi.com/api/sets/filtered/",
    "https://optcgapi.com/api/sets/filtered/",
  ],
  decks: [
    "https://www.optcgapi.com/api/decks/filtered/",
    "https://optcgapi.com/api/decks/filtered/",
  ],
  promos: [
    "https://www.optcgapi.com/api/promos/filtered/",
    "https://optcgapi.com/api/promos/filtered/",
  ],
};
const POKEMON_ENDPOINT = "https://api.pokemontcg.io/v2/cards";
const SCRYFALL_SEARCH_ENDPOINT = "https://api.scryfall.com/cards/search";
const SCRYFALL_NAMED_ENDPOINT = "https://api.scryfall.com/cards/named";
const PRICECHARTING_SEARCH_ENDPOINT =
  "https://www.pricecharting.com/search-products";
const BANK_OF_CANADA_ENDPOINT =
  "https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=5";
const FUSION_EVENTS_PAGE = "https://fusiongamingonline.com/pages/events";
const FUSION_BINDERPOS_ENDPOINT = "https://portal.binderpos.com/api/events/forStore";
const A_MUSE_EVENTS_ENDPOINT =
  "https://amusengames.ca/collections/events/products.json?limit=250";
const ARCTIC_HOME_PAGE = "https://www.arcticriftcards.ca/";
const ARCTIC_MAHINA_ENDPOINT = "https://mahina.app/app/5d7678.myshopify.com";
const ARCTIC_EVENTS_PAGE = ARCTIC_HOME_PAGE;
const GALAXY_EVENTS_PAGE = "https://www.galaxy-comics.ca/index.php/calendar/";
const GALAXY_FACEBOOK_EVENTS_PAGE = "https://www.facebook.com/galaxycomicscollectibles/events";
const FUSION_WORLD_CARDLIST_PAGE = "https://www.dbs-cardgame.com/fw/en/cardlist/";
const UNION_ARENA_CARDLIST_PAGE = "https://www.unionarena-tcg.com/na/cardlist/";
const TCGCSV_BASE = "https://tcgcsv.com/tcgplayer";
const SERVER_TIMEOUT_MS = 15000;
const FX_TIMEOUT_MS = 2500;
const PROFILE_BOOTSTRAP_COLUMNS = [
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
  "followed_seller_ids",
  "followed_store_slugs",
  "meetup_preferences",
  "response_time",
  "completed_deals",
  "created_at",
  "onboarding_complete",
].join(",");
const LISTING_BOOTSTRAP_COLUMNS = [
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
  "market_price_currency",
  "condition",
  "neighborhood",
  "postal_code",
  "accepts_trade",
  "listing_format",
  "quantity",
  "bundle_items",
  "description",
  "primary_image",
  "image_gallery",
  "status",
  "featured",
  "flagged",
  "admin_notes",
  "views",
  "offers",
  "created_at",
  "updated_at",
].join(",");
const MANUAL_EVENT_BOOTSTRAP_COLUMNS = [
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
const MANUAL_EVENT_BOOTSTRAP_FALLBACK_COLUMNS = [
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
const IMAGE_PROXY_ALLOWED_HOSTS = new Set([
  "en.onepiece-cardgame.com",
  "storage.googleapis.com",
]);
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://tcgwpg-marketplace.vercel.app",
  "https://tcgwpg.com",
  "https://www.tcgwpg.com",
];

const CATEGORY_IDS = {
  magic: 1,
  pokemon: 3,
  "dragon-ball-fusion-world": 80,
  "union-arena": 81,
};

const SCRYFALL_HEADERS = {
  Accept: "application/json; charset=utf-8",
  "User-Agent": "TCGWPG/0.2 (local marketplace development)",
};
const ONE_PIECE_VARIANT_STOPWORDS = new Set([
  "sp",
  "alt",
  "alternate",
  "art",
  "gold",
  "foil",
  "wanted",
  "poster",
  "manga",
  "parallel",
]);
const MONTH_INDEX = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};
const WEEKDAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

let exchangeRateCache = {
  usdToCadRate: 1.38,
  asOf: null,
  fetchedAt: 0,
  source: "Fallback",
};

const tcgdexCardCache = new Map();
const onePieceVariantImageCache = new Map();
const tcgcsvGroupCache = new Map();
const tcgcsvGroupDetailCache = new Map();
const rateLimitBuckets = new Map();

function getAllowedOrigins() {
  const configuredOrigins = String(process.env.APP_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]);
}

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS."));
    },
  }),
);
app.use(express.json());
app.use((req, res, next) => {
  const requestId =
    String(req.headers["x-request-id"] || "").trim() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  next();
});

function getRequestOrigin(req) {
  const origin = String(req.headers.origin || "").trim();
  if (origin) {
    return origin;
  }

  const referer = String(req.headers.referer || "").trim();
  if (!referer) {
    return "";
  }

  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}

function requireAllowedOrigin(req, res, next) {
  const origin = getRequestOrigin(req);

  if (!origin || allowedOrigins.has(origin)) {
    return next();
  }

  return res.status(403).json({
    error: "Request origin is not allowed.",
  });
}

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

function omitMissingOfferColumns(payload, error) {
  const nextPayload = { ...payload };

  if (isMissingColumnError(error, "last_actor_id")) {
    delete nextPayload.last_actor_id;
  }

  return nextPayload;
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

function sameParticipantSet(left = [], right = []) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].map(String).sort();
  const rightSorted = [...right].map(String).sort();
  return leftSorted.every((value, index) => value === rightSorted[index]);
}

async function getActingUserContext(req) {
  if (!supabaseAdmin) {
    return { ok: false, status: 501, error: "API server is not configured." };
  }

  const authHeader = String(req.headers.authorization || "");
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!accessToken) {
    return { ok: false, status: 401, error: "Missing access token." };
  }

  const {
    data: { user: actingUser },
    error: actingUserError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (actingUserError || !actingUser) {
    return { ok: false, status: 401, error: "Invalid access token." };
  }

  const { data: actingProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", actingUser.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 500, error: profileError.message };
  }

  return {
    ok: true,
    actingUser,
    actingProfile,
  };
}

async function insertNotifications(records = []) {
  if (!supabaseAdmin || !records.length) {
    return { ok: true };
  }

  const { error } = await supabaseAdmin.from("notifications").insert(records);
  if (error && !isMissingTableError(error, "notifications")) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

async function insertAdminAuditLog(entry = {}) {
  if (!supabaseAdmin) {
    return { ok: true };
  }

  const insertPayload = {
    id: entry.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actor_id: entry.actorId || null,
    actor_name: entry.actorName || "Admin",
    action: entry.action || "admin-action",
    title: entry.title || "Admin action",
    details: entry.details || null,
    target_id: entry.targetId || null,
    target_type: entry.targetType || null,
  };

  const { error } = await supabaseAdmin.from("admin_audit_log").insert(insertPayload);
  if (error && !isMissingTableError(error, "admin_audit_log")) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

function getClientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return forwarded || req.ip || "anonymous";
}

function consumeRateLimit({ bucket, key, windowMs, maxRequests }) {
  const normalizedKey = String(key || "anonymous").trim() || "anonymous";
  const bucketKey = `${bucket}:${normalizedKey}`;
  const now = Date.now();
  const existing = rateLimitBuckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxRequests) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  rateLimitBuckets.set(bucketKey, existing);
  return { ok: true, retryAfterSeconds: 0 };
}

function createRateLimit({ bucket, windowMs, maxRequests, getKey = getClientKey }) {
  return function rateLimitMiddleware(req, res, next) {
    const result = consumeRateLimit({
      bucket,
      key: getKey(req),
      windowMs,
      maxRequests,
    });

    if (!result.ok) {
      res.setHeader("Retry-After", String(result.retryAfterSeconds));
      return res.status(429).json({
        error: "Too many requests. Please slow down and try again shortly.",
      });
    }

    return next();
  };
}

function normalizeRateLimitIdentifier(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

const publicApiRateLimit = createRateLimit({
  bucket: "public-api",
  windowMs: 60 * 1000,
  maxRequests: 120,
});
const heavyApiRateLimit = createRateLimit({
  bucket: "heavy-api",
  windowMs: 60 * 1000,
  maxRequests: 40,
});
const adminApiRateLimit = createRateLimit({
  bucket: "admin-api",
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
});
const reportApiRateLimit = createRateLimit({
  bucket: "report-api",
  windowMs: 5 * 60 * 1000,
  maxRequests: 10,
});
const bugApiRateLimit = createRateLimit({
  bucket: "bug-api",
  windowMs: 5 * 60 * 1000,
  maxRequests: 8,
});
const offerCreateApiRateLimit = createRateLimit({
  bucket: "offer-create-api",
  windowMs: 60 * 1000,
  maxRequests: 12,
});
const offerRespondApiRateLimit = createRateLimit({
  bucket: "offer-respond-api",
  windowMs: 60 * 1000,
  maxRequests: 16,
});
const messageThreadApiRateLimit = createRateLimit({
  bucket: "message-thread-api",
  windowMs: 60 * 1000,
  maxRequests: 20,
});
const messageSendApiRateLimit = createRateLimit({
  bucket: "message-send-api",
  windowMs: 60 * 1000,
  maxRequests: 40,
});
const AUTH_GUARD_LIMITS = {
  login: {
    ip: {
      bucket: "auth-login-ip",
      windowMs: 10 * 60 * 1000,
      maxRequests: 20,
    },
    identifier: {
      bucket: "auth-login-identifier",
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
    },
  },
  signup: {
    ip: {
      bucket: "auth-signup-ip",
      windowMs: 60 * 60 * 1000,
      maxRequests: 8,
    },
    identifier: {
      bucket: "auth-signup-identifier",
      windowMs: 60 * 60 * 1000,
      maxRequests: 4,
    },
  },
  "password-reset": {
    ip: {
      bucket: "auth-password-reset-ip",
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
    },
    identifier: {
      bucket: "auth-password-reset-identifier",
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
    },
  },
};

function tcgplayerEnabled() {
  return Boolean(
    process.env.TCGPLAYER_PUBLIC_KEY && process.env.TCGPLAYER_PRIVATE_KEY,
  );
}

function normalizeGameName(game) {
  const rawValue = String(game || "").toLowerCase();

  if (rawValue.includes("pokemon")) {
    return "pokemon";
  }

  if (rawValue.includes("magic")) {
    return "magic";
  }

  if (rawValue.includes("one piece")) {
    return "one-piece";
  }

  if (
    rawValue.includes("dragon ball") ||
    rawValue.includes("fusion world") ||
    rawValue.includes("dbs")
  ) {
    return "dragon-ball-fusion-world";
  }

  if (rawValue.includes("union arena")) {
    return "union-arena";
  }

  return rawValue.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeLanguage(value) {
  const rawValue = String(value || "").toLowerCase().trim();
  return rawValue === "ja" || rawValue.includes("japanese") ? "japanese" : "english";
}

function getCategoryId(game) {
  return CATEGORY_IDS[String(game || "").toLowerCase()];
}

function getExtendedValue(product, fieldName) {
  const item = product.extendedData?.find(
    (entry) => entry.name?.toLowerCase() === fieldName.toLowerCase(),
  );
  return item?.value ?? null;
}

function parseNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function isUsableOnePieceImageUrl(url) {
  const normalized = String(url || "").trim();

  if (!normalized) {
    return false;
  }

  if (/images\.onepiece-cardgame\.dev/i.test(normalized)) {
    return false;
  }

  return /^https?:\/\//i.test(normalized);
}

function toCad(value, usdToCadRate) {
  const numericValue = parseNumber(value);
  return numericValue ? Number((numericValue * usdToCadRate).toFixed(2)) : null;
}

function pickPokemonPrice(card) {
  const priceGroups = card.tcgplayer?.prices || {};
  const priority = [
    "holofoil",
    "reverseHolofoil",
    "normal",
    "1stEditionHolofoil",
    "1stEditionNormal",
  ];

  for (const key of priority) {
    const price = priceGroups[key];
    if (price?.market) {
      return {
        label: key,
        usdValue: parseNumber(price.market),
      };
    }
    if (price?.mid) {
      return {
        label: key,
        usdValue: parseNumber(price.mid),
      };
    }
  }

  return {
    label: "unknown",
    usdValue: null,
  };
}

function pickTcgdexPrice(card) {
  const tcgplayerPricing = card.pricing?.tcgplayer;
  if (!tcgplayerPricing || typeof tcgplayerPricing !== "object") {
    return {
      label: "unknown",
      usdValue: null,
    };
  }

  const priority = [
    "holofoil",
    "reverse-holofoil",
    "normal",
    "1st-edition-holofoil",
    "1st-edition-normal",
  ];

  for (const key of priority) {
    const price = tcgplayerPricing[key];
    if (price?.marketPrice) {
      return {
        label: key,
        usdValue: parseNumber(price.marketPrice),
      };
    }

    if (price?.midPrice) {
      return {
        label: key,
        usdValue: parseNumber(price.midPrice),
      };
    }
  }

  return {
    label: "unknown",
    usdValue: null,
  };
}

function buildPokemonHeaders() {
  const apiKey = process.env.VITE_POKEMONTCG_API_KEY || process.env.POKEMONTCG_API_KEY;
  return apiKey ? { "X-Api-Key": apiKey } : {};
}

function uniqueBy(items, keySelector) {
  const seen = new Set();
  const results = [];

  for (const item of items) {
    const key = keySelector(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    results.push(item);
  }

  return results;
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function rankSearchMatch(candidateParts, query) {
  const normalizedQuery = normalizeSearchText(query);
  const haystacks = candidateParts.map(normalizeSearchText).filter(Boolean);

  if (!normalizedQuery) {
    return 0;
  }

  if (haystacks.some((value) => value === normalizedQuery)) {
    return 100;
  }

  if (haystacks.some((value) => value.startsWith(normalizedQuery))) {
    return 80;
  }

  if (haystacks.some((value) => value.includes(normalizedQuery))) {
    return 60;
  }

  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryTerms.length && haystacks.some((value) => queryTerms.every((term) => value.includes(term)))) {
    return 45;
  }

  return 20;
}

function normalizeOnePieceCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "");
}

function extractOnePieceCode(...values) {
  for (const value of values) {
    const match = String(value || "")
      .toUpperCase()
      .match(/[A-Z]{2,}\d{2}-\d+/);

    if (match?.[0]) {
      return normalizeOnePieceCode(match[0]);
    }
  }

  return "";
}

function looksLikeCardCode(value) {
  return /[A-Z]{2,}\d{2}-\d+/i.test(String(value || ""));
}

function buildOnePieceQueryVariants(query) {
  const trimmedQuery = String(query || "").trim();
  const variants = [];
  const seen = new Set();

  function addVariant(params) {
    const key = JSON.stringify(params);
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    variants.push(params);
  }

  if (!trimmedQuery) {
    return variants;
  }

  addVariant({ card_name: trimmedQuery });

  if (looksLikeCardCode(trimmedQuery)) {
    addVariant({ card_image_id: normalizeOnePieceCode(trimmedQuery) });
  }

  const strippedQuery = trimmedQuery
    .split(/\s+/)
    .filter((term) => !ONE_PIECE_VARIANT_STOPWORDS.has(term.toLowerCase()))
    .join(" ")
    .trim();

  if (strippedQuery && strippedQuery.toLowerCase() !== trimmedQuery.toLowerCase()) {
    addVariant({ card_name: strippedQuery });

    if (looksLikeCardCode(strippedQuery)) {
      addVariant({ card_image_id: normalizeOnePieceCode(strippedQuery) });
    }
  }

  return variants;
}

function getOnePieceImageUrl(card) {
  if (isUsableOnePieceImageUrl(card.card_image)) {
    return card.card_image;
  }

  const code = extractOnePieceCode(
    card.card_image_id,
    card.card_set_id,
    card.printLabel,
    card.title,
    card.description,
  );

  if (code) {
    return `https://en.onepiece-cardgame.com/images/cardlist/card/${code}.png`;
  }

  return card.card_image || "";
}

function detectOnePieceVariantProfile(value) {
  const text = String(value || "").toLowerCase();

  return {
    manga: /\bmanga\b/.test(text),
    wanted: /\bwanted\b|\bposter\b/.test(text),
    parallel: /\bparallel\b/.test(text),
    sp: /\bsp\b|\bspecial\b/.test(text),
    alt: /\balt\b|\balternate\b/.test(text),
    superAlt: /\bsuper alternate art\b/.test(text),
    redSuperAlt: /\bred super alternate art\b|\bred manga\b/.test(text),
  };
}

function scoreOnePieceVariantCandidate(candidate, referenceText, code) {
  const text = `${candidate.card_name || ""} ${candidate.card_image_id || ""}`.toLowerCase();
  const profile = detectOnePieceVariantProfile(referenceText);
  let score = 0;

  if (!candidate.card_image) {
    return -10_000;
  }

  const candidateCode = extractOnePieceCode(
    candidate.card_image_id,
    candidate.card_set_id,
    candidate.card_name,
  );

  if (candidateCode && code && candidateCode === code) {
    score += 60;
  }

  if (profile.manga) {
    if (/\bred super alternate art\b/.test(text)) {
      score += 140;
    } else if (/\bsuper alternate art\b/.test(text)) {
      score += 110;
    } else if (/\bmanga\b/.test(text)) {
      score += 90;
    } else {
      score -= 120;
    }

    if (/\bparallel\b/.test(text)) {
      score -= 40;
    }

    if (/\bwanted poster\b/.test(text)) {
      score -= 70;
    }
  }

  if (profile.wanted) {
    score += /\bwanted poster\b/.test(text) ? 120 : -80;
  }

  if (profile.parallel && !profile.manga) {
    score += /\bparallel\b/.test(text) ? 95 : -60;
  }

  if (profile.sp) {
    score += /\bsp\b|\bspecial\b/.test(text) ? 95 : -60;
  }

  if ((profile.alt || profile.superAlt) && !profile.manga && !profile.parallel && !profile.wanted) {
    score += /\balternate art\b|\bparallel\b|\bsuper alternate art\b/.test(text) ? 50 : 0;
  }

  if (
    !profile.manga &&
    !profile.wanted &&
    !profile.parallel &&
    !profile.sp &&
    !profile.alt &&
    !profile.superAlt
  ) {
    if (!/\bparallel\b|\bwanted poster\b|\bsuper alternate art\b|\bsp\b|\bspecial\b/.test(text)) {
      score += 40;
    } else {
      score -= 30;
    }
  }

  return score;
}

async function searchOnePieceOfficialVariantImage(code, referenceText) {
  const normalizedCode = normalizeOnePieceCode(code);
  const cacheKey = `${normalizedCode}::${String(referenceText || "").toLowerCase()}`;

  if (onePieceVariantImageCache.has(cacheKey)) {
    return onePieceVariantImageCache.get(cacheKey);
  }

  const queryVariants = [
    { card_image_id: normalizedCode },
    { card_set_id: normalizedCode },
  ];
  const endpoints = [
    OPTCG_ENDPOINT_CANDIDATES.sets,
    OPTCG_ENDPOINT_CANDIDATES.promos,
    OPTCG_ENDPOINT_CANDIDATES.decks,
  ];

  const responses = await Promise.allSettled(
    endpoints.flatMap((endpoint) =>
      queryVariants.map((params) => searchOnePieceEndpoint(endpoint, params)),
    ),
  );

  const candidates = uniqueBy(
    responses
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value || [])
      .filter((candidate) => candidate && candidate.card_image),
    (candidate) => candidate.card_image_id || candidate.card_name,
  );

  if (!candidates.length) {
    onePieceVariantImageCache.set(cacheKey, "");
    return "";
  }

  const ranked = [...candidates].sort(
    (left, right) =>
      scoreOnePieceVariantCandidate(right, referenceText, normalizedCode) -
      scoreOnePieceVariantCandidate(left, referenceText, normalizedCode),
  );

  const selectedImage = ranked[0]?.card_image || "";
  onePieceVariantImageCache.set(cacheKey, selectedImage);
  return selectedImage;
}

function buildRequestOrigin(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req.protocol || "https";
  const host = forwardedHost || req.get("host");

  return host ? `${protocol}://${host}` : "";
}

function rewriteSearchImageUrlForClient(req, rawUrl) {
  const imageUrl = String(rawUrl || "").trim();

  const shouldProxy =
    /^https:\/\/en\.onepiece-cardgame\.com\/images\/cardlist\/card\//i.test(imageUrl) ||
    /^https:\/\/storage\.googleapis\.com\/images\.pricecharting\.com\//i.test(imageUrl);

  if (!shouldProxy) {
    return imageUrl;
  }

  const requestOrigin = buildRequestOrigin(req);
  return requestOrigin
    ? `${requestOrigin}/api/live/image-proxy?url=${encodeURIComponent(imageUrl)}`
    : imageUrl;
}

function rankOnePieceMatch(card, query) {
  return rankSearchMatch(
    [card.card_name, card.card_set_id, card.card_image_id, card.set_name],
    query,
  );
}

function makeAbsoluteUrl(baseUrl, path) {
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return "";
  }
}

function parseCardCodeAndTitle(altText) {
  const normalized = String(altText || "").trim();
  const match = normalized.match(/^(\S+)\s+(.+)$/);

  if (!match) {
    return {
      code: normalized,
      title: normalized,
    };
  }

  return {
    code: match[1],
    title: match[2],
  };
}

async function searchFusionWorldCards(query, limit) {
  const url = new URL(FUSION_WORLD_CARDLIST_PAGE);
  url.searchParams.set("search", "true");
  url.searchParams.set("q", query);

  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "text/html",
      "User-Agent": "TCGWPG/0.2 (local marketplace development)",
    },
  });

  if (!response.ok) {
    throw new Error(`Fusion World search failed (${response.status}).`);
  }

  const html = await response.text();
  const matches = [
    ...html.matchAll(
      /<li class="cardItem"><a[^>]+data-src="detail\.php\?card_no=([^"]+)"[^>]*><img[^>]+data-src="([^"]+)"[^>]+alt="([^"]+)"/gi,
    ),
  ];

  const results = uniqueBy(
    matches.map((match) => {
      const [, cardNo, imagePath, altText] = match;
      const { code, title } = parseCardCodeAndTitle(altText);

      return {
        id: `fusion-world-${code}`,
        provider: "dbs-fusion-world-official",
        providerLabel: "Fusion World Official Card List",
        title,
        setName: "Dragon Ball Super Fusion World",
        rarity: "Official print",
        imageUrl: makeAbsoluteUrl(FUSION_WORLD_CARDLIST_PAGE, imagePath),
        marketPrice: null,
        marketPriceCurrency: "CAD",
        originalMarketPriceUsd: null,
        originalMarketPriceCurrency: "USD",
        priceHistory: [],
        language: "English",
        sourceUrl: makeAbsoluteUrl(FUSION_WORLD_CARDLIST_PAGE, `detail.php?card_no=${encodeURIComponent(cardNo)}`),
        printLabel: code,
        description: `Dragon Ball Super Fusion World | ${code}`,
      };
    }),
    (item) => item.id,
  );

  if (!results.length) {
    throw new Error("Fusion World returned no matches.");
  }

  return results.slice(0, limit);
}

async function searchUnionArenaCards(query, limit) {
  const response = await fetchWithTimeout(`${UNION_ARENA_CARDLIST_PAGE}index.php?search=true`, {
    method: "POST",
    headers: {
      Accept: "text/html",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "TCGWPG/0.2 (local marketplace development)",
    },
    body: new URLSearchParams({
      freewords: query,
    }),
  });

  if (!response.ok) {
    throw new Error(`Union Arena search failed (${response.status}).`);
  }

  const html = await response.text();
  const matches = [
    ...html.matchAll(
      /<li class="cardImgCol"><a[^>]+href="\.\/detail_iframe\.php\?card_no=([^"]+)"[^>]*><img[^>]+data-src="([^"]+)"[^>]+alt="([^"]+)"/gi,
    ),
  ];

  const results = uniqueBy(
    matches.map((match) => {
      const [, cardNo, imagePath, altText] = match;
      const { code, title } = parseCardCodeAndTitle(altText);

      return {
        id: `union-arena-${code.replace(/[^a-z0-9]+/gi, "-")}`,
        provider: "union-arena-official",
        providerLabel: "Union Arena Official Card List",
        title,
        setName: "Union Arena",
        rarity: "Official print",
        imageUrl: makeAbsoluteUrl(UNION_ARENA_CARDLIST_PAGE, imagePath),
        marketPrice: null,
        marketPriceCurrency: "CAD",
        originalMarketPriceUsd: null,
        originalMarketPriceCurrency: "USD",
        priceHistory: [],
        language: "English",
        sourceUrl: makeAbsoluteUrl(
          UNION_ARENA_CARDLIST_PAGE,
          `detail_iframe.php?card_no=${encodeURIComponent(cardNo)}`,
        ),
        printLabel: code,
        description: `Union Arena | ${code}`,
      };
    }),
    (item) => item.id,
  );

  if (!results.length) {
    throw new Error("Union Arena returned no matches.");
  }

  return results.slice(0, limit);
}

async function fetchWithTimeout(url, init = {}, timeoutMs = SERVER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getBearerToken() {
  const now = Date.now();

  if (tokenCache.accessToken && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.accessToken;
  }

  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.TCGPLAYER_PUBLIC_KEY,
    client_secret: process.env.TCGPLAYER_PRIVATE_KEY,
  });

  const response = await fetchWithTimeout(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to authenticate with TCGplayer: ${errorText}`);
  }

  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + Number(data.expires_in || 0) * 1000,
  };

  return tokenCache.accessToken;
}

async function tcgFetch(pathname, options = {}) {
  const bearerToken = await getBearerToken();
  const response = await fetchWithTimeout(`${API_ROOT}${pathname}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `bearer ${bearerToken}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `TCGplayer request failed (${response.status}): ${errorText}`,
    );
  }

  return response.json();
}

async function searchTcgplayerCatalog(game, query, limit) {
  const categoryId = getCategoryId(game);

  if (!categoryId) {
    throw new Error("Unsupported TCGplayer search category.");
  }

  const searchResponse = await tcgFetch(`/catalog/categories/${categoryId}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sort: "Relevance",
      limit,
      offset: 0,
      filters: [
        {
          name: "ProductName",
          values: [query],
        },
      ],
    }),
  });

  const productIds = searchResponse.results?.slice(0, limit) || [];

  if (!productIds.length) {
    return [];
  }

  const [productsResponse, pricingResponse] = await Promise.all([
    tcgFetch(`/catalog/products/${productIds.join(",")}?getExtendedFields=true`),
    tcgFetch(`/pricing/product/${productIds.join(",")}`),
  ]);

  const pricingMap = new Map(
    (pricingResponse.results || []).map((entry) => [entry.productId, entry]),
  );

  return (productsResponse.results || []).map((product) => {
    const pricing = pricingMap.get(product.productId);
    const usdPrice =
      pricing?.marketPrice ?? pricing?.midPrice ?? pricing?.lowPrice ?? null;

    return {
      id: `tcgplayer-${product.productId}`,
      provider: "tcgplayer",
      providerLabel: "TCGplayer API",
      title: product.name,
      setName: product.groupName || getExtendedValue(product, "SetName"),
      rarity:
        product.rarityName ||
        getExtendedValue(product, "Rarity") ||
        "Unknown",
      imageUrl: product.imageUrl,
      url: product.url,
      productId: product.productId,
      printLabel: pricing?.subTypeName || getExtendedValue(product, "Printing"),
      originalMarketPriceUsd: usdPrice,
      originalMarketPriceCurrency: "USD",
      description: [
        product.groupName || getExtendedValue(product, "SetName"),
        getExtendedValue(product, "Number"),
        product.rarityName || getExtendedValue(product, "Rarity"),
      ]
        .filter(Boolean)
        .join(" | "),
    };
  });
}

async function fetchTcgcsvJson(pathname) {
  const response = await fetchWithTimeout(`${TCGCSV_BASE}${pathname}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TCGWPG/0.2 (local marketplace development)",
    },
  });

  if (!response.ok) {
    throw new Error(`TCGCSV request failed (${response.status}).`);
  }

  return response.json();
}

async function getTcgcsvGroups(categoryId) {
  if (tcgcsvGroupCache.has(categoryId)) {
    return tcgcsvGroupCache.get(categoryId);
  }

  const data = await fetchTcgcsvJson(`/${categoryId}/groups`);
  const groups = Array.isArray(data?.results) ? data.results : [];
  tcgcsvGroupCache.set(categoryId, groups);
  return groups;
}

async function getTcgcsvGroupCatalog(categoryId, group) {
  const cacheKey = `${categoryId}:${group.groupId}`;
  if (tcgcsvGroupDetailCache.has(cacheKey)) {
    return tcgcsvGroupDetailCache.get(cacheKey);
  }

  const [productsData, pricesData] = await Promise.all([
    fetchTcgcsvJson(`/${categoryId}/${group.groupId}/products`),
    fetchTcgcsvJson(`/${categoryId}/${group.groupId}/prices`),
  ]);

  const priceMap = new Map(
    (pricesData?.results || []).map((entry) => [entry.productId, entry]),
  );

  const merged = (productsData?.results || []).map((product) => ({
    ...product,
    groupName: group.name,
    groupAbbreviation: group.abbreviation,
    pricing: priceMap.get(product.productId) || null,
  }));

  tcgcsvGroupDetailCache.set(cacheKey, merged);
  return merged;
}

async function searchTcgcsvCatalog(game, query, limit) {
  const categoryId = getCategoryId(game);

  if (!categoryId) {
    throw new Error("Unsupported TCGCSV search category.");
  }

  const groups = await getTcgcsvGroups(categoryId);
  const sortedGroups = [...groups].sort((left, right) => {
    const rightScore = rankSearchMatch([right.name, right.abbreviation], query);
    const leftScore = rankSearchMatch([left.name, left.abbreviation], query);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return (
      new Date(right.publishedOn || right.modifiedOn || 0).getTime() -
      new Date(left.publishedOn || left.modifiedOn || 0).getTime()
    );
  });

  const matches = [];

  for (let index = 0; index < sortedGroups.length; index += 6) {
    const batch = sortedGroups.slice(index, index + 6);
    const batchResults = (
      await Promise.allSettled(
        batch.map((group) => getTcgcsvGroupCatalog(categoryId, group)),
      )
    )
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value || []);

    for (const product of batchResults) {
      const score = rankSearchMatch(
        [product.name, product.cleanName, product.groupName, product.groupAbbreviation],
        query,
      );

      if (score < 45) {
        continue;
      }

      matches.push({
        product,
        score,
      });
    }

    const rankedMatches = uniqueBy(
      matches.sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        const rightPrice =
          right.product.pricing?.marketPrice ??
          right.product.pricing?.midPrice ??
          right.product.pricing?.lowPrice ??
          0;
        const leftPrice =
          left.product.pricing?.marketPrice ??
          left.product.pricing?.midPrice ??
          left.product.pricing?.lowPrice ??
          0;

        return rightPrice - leftPrice;
      }),
      (entry) => entry.product.productId,
    );

    if (
      rankedMatches.length >= limit &&
      rankedMatches.slice(0, limit).every((entry) => entry.score >= 60)
    ) {
      return rankedMatches.slice(0, limit).map(({ product }) => {
        const pricing = product.pricing;
        const usdPrice =
          pricing?.marketPrice ?? pricing?.midPrice ?? pricing?.lowPrice ?? null;

        return {
          id: `tcgcsv-${product.productId}`,
          provider: "tcgcsv",
          providerLabel: "TCGCSV / TCGplayer",
          title: product.name,
          setName: product.groupName || "Unknown set",
          rarity: pricing?.subTypeName || "Unknown",
          imageUrl: product.imageUrl || "",
          marketPrice: toCad(usdPrice, exchangeRateCache.usdToCadRate),
          marketPriceCurrency: "CAD",
          originalMarketPriceUsd: usdPrice,
          originalMarketPriceCurrency: "USD",
          priceHistory: [],
          language: "English",
          sourceUrl: product.url || "",
          printLabel: pricing?.subTypeName || product.groupAbbreviation || "Normal",
          description: [product.groupName, product.groupAbbreviation].filter(Boolean).join(" | "),
        };
      });
    }
  }

  const rankedMatches = uniqueBy(
    matches.sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const rightPrice =
        right.product.pricing?.marketPrice ??
        right.product.pricing?.midPrice ??
        right.product.pricing?.lowPrice ??
        0;
      const leftPrice =
        left.product.pricing?.marketPrice ??
        left.product.pricing?.midPrice ??
        left.product.pricing?.lowPrice ??
        0;

      return rightPrice - leftPrice;
    }),
    (entry) => entry.product.productId,
  );

  return rankedMatches.slice(0, limit).map(({ product }) => {
    const pricing = product.pricing;
    const usdPrice =
      pricing?.marketPrice ?? pricing?.midPrice ?? pricing?.lowPrice ?? null;

    return {
      id: `tcgcsv-${product.productId}`,
      provider: "tcgcsv",
      providerLabel: "TCGCSV / TCGplayer",
      title: product.name,
      setName: product.groupName || "Unknown set",
      rarity: pricing?.subTypeName || "Unknown",
      imageUrl: product.imageUrl || "",
      marketPrice: toCad(usdPrice, exchangeRateCache.usdToCadRate),
      marketPriceCurrency: "CAD",
      originalMarketPriceUsd: usdPrice,
      originalMarketPriceCurrency: "USD",
      priceHistory: [],
      language: "English",
      sourceUrl: product.url || "",
      printLabel: pricing?.subTypeName || product.groupAbbreviation || "Normal",
      description: [product.groupName, product.groupAbbreviation].filter(Boolean).join(" | "),
    };
  });
}

async function getUsdToCadRate() {
  const now = Date.now();
  if (exchangeRateCache.fetchedAt && now - exchangeRateCache.fetchedAt < 6 * 60 * 60 * 1000) {
    return exchangeRateCache;
  }

  try {
    const response = await fetchWithTimeout(
      BANK_OF_CANADA_ENDPOINT,
      {
        headers: {
          Accept: "application/json",
        },
      },
      FX_TIMEOUT_MS,
    );

    if (!response.ok) {
      throw new Error("Bank of Canada exchange rate request failed.");
    }

    const data = await response.json();
    const latestObservation = [...(data.observations || [])]
      .reverse()
      .find((observation) => observation.FXUSDCAD?.v);
    const usdToCadRate = parseNumber(latestObservation?.FXUSDCAD?.v);

    if (!usdToCadRate) {
      throw new Error("No USD to CAD rate was returned.");
    }

    exchangeRateCache = {
      usdToCadRate,
      asOf: latestObservation?.d || null,
      fetchedAt: now,
      source: "Bank of Canada",
    };
  } catch {
    exchangeRateCache = {
      ...exchangeRateCache,
      fetchedAt: now,
    };
  }

  return exchangeRateCache;
}

function buildPokemonQueries(query) {
  const trimmedQuery = String(query || "").trim();
  const terms = trimmedQuery.split(/\s+/).filter(Boolean);
  const firstTerm = terms[0];

  return uniqueBy(
    [
      trimmedQuery ? `name:"${trimmedQuery}"` : null,
      terms.length ? terms.map((term) => `name:${term}`).join(" ") : null,
      firstTerm ? `name:${firstTerm}*` : null,
    ].filter(Boolean),
    (item) => item,
  );
}

async function fetchPokemonQuery(searchQuery, limit) {
  const url = new URL(POKEMON_ENDPOINT);
  url.searchParams.set("q", searchQuery);
  url.searchParams.set("pageSize", String(limit));
  url.searchParams.set("orderBy", "-set.releaseDate");
  url.searchParams.set(
    "select",
    "id,name,number,rarity,images,set,tcgplayer",
  );

  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/json",
      ...buildPokemonHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error("Pokemon TCG API search failed.");
  }

  const data = await response.json();
  return data.data || [];
}

async function fetchTcgdexCard(cardId) {
  if (tcgdexCardCache.has(cardId)) {
    return tcgdexCardCache.get(cardId);
  }

  const response = await fetchWithTimeout(`${TCGDEX_CARD_ENDPOINT}/${cardId}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("TCGdex card lookup failed.");
  }

  const data = await response.json();
  tcgdexCardCache.set(cardId, data);
  return data;
}

async function searchPokemonCardsViaTcgdex(query, limit, usdToCadRate) {
  const url = new URL(TCGDEX_SEARCH_ENDPOINT);
  url.searchParams.set("name", query);

  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("TCGdex search failed.");
  }

  const matches = await response.json();
  const resultLimit = Math.min(limit, 12);
  const detailedCards = (
    await Promise.allSettled(
      (matches || []).slice(0, resultLimit).map((card) => fetchTcgdexCard(card.id)),
    )
  )
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  if (!detailedCards.length) {
    throw new Error("TCGdex returned no usable card details.");
  }

  return detailedCards.map((card) => {
    const chosenPrice = pickTcgdexPrice(card);

    return {
      id: `tcgdex-${card.id}`,
      provider: "tcgdex",
      providerLabel: "TCGdex / TCGplayer",
      title: card.name,
      setName: card.set?.name || "Unknown set",
      rarity: card.rarity || "Unknown rarity",
      imageUrl: `${card.image}/high.webp`,
      marketPrice: toCad(chosenPrice.usdValue, usdToCadRate),
      marketPriceCurrency: "CAD",
      originalMarketPriceUsd: chosenPrice.usdValue,
      originalMarketPriceCurrency: "USD",
      priceHistory: [],
      language: "English",
      sourceUrl: "",
      printLabel: chosenPrice.label,
      description: [
        card.set?.name,
        card.rarity,
        card.localId ? `#${card.localId}` : null,
      ]
        .filter(Boolean)
        .join(" | "),
    };
  });
}

async function searchPokemonCards(query, limit, usdToCadRate) {
  try {
    return await searchPokemonCardsViaTcgdex(query, limit, usdToCadRate);
  } catch {
    // Keep the previous provider as a fallback if TCGdex is unavailable.
  }

  const cards = [];
  const searchQueries = buildPokemonQueries(query);

  for (const searchQuery of searchQueries) {
    const results = await fetchPokemonQuery(searchQuery, limit);
    cards.push(...results);

    if (cards.length >= limit) {
      break;
    }
  }

  return uniqueBy(cards, (card) => card.id)
    .slice(0, limit)
    .map((card) => {
      const chosenPrice = pickPokemonPrice(card);
      return {
        id: `pokemon-${card.id}`,
        provider: "pokemon-tcg-api",
        providerLabel: "Pokemon TCG API / TCGplayer",
        title: card.name,
        setName: card.set?.name || "Unknown set",
        rarity: card.rarity || "Unknown rarity",
        imageUrl: card.images?.large || card.images?.small || "",
        marketPrice: toCad(chosenPrice.usdValue, usdToCadRate),
      marketPriceCurrency: "CAD",
      originalMarketPriceUsd: chosenPrice.usdValue,
      originalMarketPriceCurrency: "USD",
      priceHistory: [],
      language: "English",
      sourceUrl: card.tcgplayer?.url || "",
      printLabel: chosenPrice.label,
      description: [
        card.set?.name,
          card.rarity,
          card.number ? `#${card.number}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      };
    });
}

async function resolveScryfallName(query) {
  const url = new URL(SCRYFALL_NAMED_ENDPOINT);
  url.searchParams.set("fuzzy", query);

  const response = await fetchWithTimeout(url, {
    headers: SCRYFALL_HEADERS,
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data?.name || null;
}

async function fetchScryfallSearch(searchQuery) {
  const url = new URL(SCRYFALL_SEARCH_ENDPOINT);
  url.searchParams.set("q", searchQuery);
  url.searchParams.set("unique", "prints");
  url.searchParams.set("order", "released");
  url.searchParams.set("dir", "desc");

  const response = await fetchWithTimeout(url, {
    headers: SCRYFALL_HEADERS,
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function searchMagicCards(query, limit, usdToCadRate, language = "english") {
  const canonicalName = await resolveScryfallName(query);
  const isJapanese = language === "japanese";
  const searchQueries = uniqueBy(
    [
      isJapanese && canonicalName ? `!"${canonicalName}" lang:ja` : null,
      isJapanese && canonicalName ? `"${canonicalName}" lang:ja` : null,
      isJapanese ? `lang:ja ${query}` : null,
      isJapanese ? `printed:${query} lang:ja` : null,
      canonicalName ? `!"${canonicalName}"` : null,
      query,
    ].filter(Boolean),
    (item) => item,
  );

  let data = null;
  for (const searchQuery of searchQueries) {
    data = await fetchScryfallSearch(searchQuery);
    if (data?.data?.length) {
      break;
    }
  }

  return (data?.data || []).slice(0, limit).map((card) => {
    const usdPrice =
      parseNumber(card.prices?.usd) ||
      parseNumber(card.prices?.usd_foil) ||
      parseNumber(card.prices?.usd_etched);
    const imageUrl =
      card.image_uris?.normal ||
      card.card_faces?.[0]?.image_uris?.normal ||
      card.image_uris?.large ||
      "";

    return {
      id: `scryfall-${card.id}`,
      provider: "scryfall",
      providerLabel: "Scryfall",
      title: card.name,
      setName: card.set_name || "Unknown set",
      rarity: card.rarity
        ? card.rarity[0].toUpperCase() + card.rarity.slice(1)
        : "Unknown rarity",
      imageUrl,
      marketPrice: toCad(usdPrice, usdToCadRate),
      marketPriceCurrency: "CAD",
      originalMarketPriceUsd: usdPrice,
      originalMarketPriceCurrency: "USD",
      priceHistory: [],
      language: card.lang === "ja" ? "Japanese" : "English",
      sourceUrl: card.scryfall_uri || card.uri || "",
      printLabel:
        card.finishes?.includes("foil")
          ? "foil"
          : card.finishes?.[0] || card.set?.toUpperCase(),
      description: [
        card.set_name,
        card.collector_number ? `#${card.collector_number}` : null,
        card.type_line,
        isJapanese && card.printed_name && card.printed_name !== card.name
          ? `Printed name: ${card.printed_name}`
          : null,
      ]
        .filter(Boolean)
        .join(" | "),
      title: isJapanese ? card.printed_name || card.name : card.name,
    };
  });
}

async function searchOnePieceEndpoint(endpointCandidates, params) {
  let lastError = null;

  for (const endpoint of endpointCandidates) {
    try {
      const url = new URL(endpoint);
      for (const [key, value] of Object.entries(params)) {
        if (value) {
          url.searchParams.set(key, value);
        }
      }

      const response = await fetchWithTimeout(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("One Piece API search failed.");
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        return data;
      }

      if (data?.error) {
        return [];
      }

      return [];
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("One Piece API search failed.");
}

async function searchOnePieceCards(query, limit, usdToCadRate) {
  const normalizedCode = normalizeOnePieceCode(query);
  const queryVariants = buildOnePieceQueryVariants(query);
  const endpoints = [
    OPTCG_ENDPOINT_CANDIDATES.sets,
    OPTCG_ENDPOINT_CANDIDATES.decks,
    OPTCG_ENDPOINT_CANDIDATES.promos,
  ];

  const responses = await Promise.allSettled(
    endpoints.flatMap((endpoint) =>
      queryVariants.map((params) => searchOnePieceEndpoint(endpoint, params)),
    ),
  );

  const cards = responses
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value || []);

  const uniqueCards = uniqueBy(
    cards,
    (card) => card.card_image_id || `${card.card_set_id}-${card.card_name}`,
  );
  const rankedCards = [...uniqueCards].sort((left, right) => {
    const rightScore = rankOnePieceMatch(right, query);
    const leftScore = rankOnePieceMatch(left, query);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return (parseNumber(right.market_price) || 0) - (parseNumber(left.market_price) || 0);
  });

  if (!rankedCards.length) {
    throw new Error("No One Piece results were returned.");
  }

  return rankedCards.slice(0, limit).map((card) => {
    const usdPrice = parseNumber(card.market_price) || parseNumber(card.inventory_price);

    return {
      id: `one-piece-${card.card_image_id || card.card_set_id || card.card_name}`,
      provider: "optcgapi",
      providerLabel: "OPTCG API",
      title: card.card_name || "Unknown card",
      setName: card.set_name || "Unknown set",
      rarity: card.rarity || "Unknown rarity",
      imageUrl: getOnePieceImageUrl(card),
      marketPrice: toCad(usdPrice, usdToCadRate),
      marketPriceCurrency: "CAD",
      originalMarketPriceUsd: usdPrice,
      originalMarketPriceCurrency: "USD",
      priceHistory: [],
      language: "English",
      sourceUrl: "",
      printLabel: card.card_image_id || card.card_set_id || card.card_type || "One Piece",
      description: [
        card.set_name,
        card.card_set_id,
        card.card_type,
        card.card_color,
      ]
        .filter(Boolean)
        .join(" | "),
    };
  });
}

function extractPriceChartingRecentSales(html, usdToCadRate) {
  const sales = [];
  const saleRegex = /<tr id="ebay-(\d+)"[\s\S]*?<td class="date">([\s\S]*?)<\/td>[\s\S]*?<td class="title"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td class="numeric">\s*<span class="js-price"[^>]*>\$([0-9,]+(?:\.\d{2})?)/gi;

  for (const match of html.matchAll(saleRegex)) {
    const [, saleId, dateText, titleHtml, usdPriceText] = match;
    const rawDate = stripHtml(dateText);
    const title = stripHtml(titleHtml).replace(/\[eBay\]\s*$/i, "").trim();
    const usdPrice = parseNumber(String(usdPriceText || "").replace(/,/g, ""));
    const parsedDate = rawDate ? new Date(`${rawDate}T12:00:00Z`) : null;
    const saleCondition = classifySaleCondition(title);

    if (!usdPrice || !title) {
      continue;
    }

    sales.push({
      id: `pricecharting-sale-${saleId}`,
      price: toCad(usdPrice, usdToCadRate),
      originalPriceUsd: usdPrice,
      currency: "CAD",
      sourceLabel: "PriceCharting",
      label: rawDate || "Recent sold",
      title,
      conditionLabel: saleCondition.label,
      conditionType: saleCondition.type,
      sourceUrl: saleId ? `https://www.ebay.com/itm/${saleId}` : "",
      createdAt:
        parsedDate && Number.isFinite(parsedDate.getTime())
          ? parsedDate.toISOString()
          : new Date().toISOString(),
    });
  }

  return sales
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 3);
}

function classifySaleCondition(title) {
  const normalizedTitle = String(title || "").toUpperCase();
  const gradedPatterns = [
    /\bPSA\s*(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1)\b/,
    /\bBGS\s*(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1)\b/,
    /\bCGC\s*(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1)\b/,
    /\bSGC\s*(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1)\b/,
    /\bTAG\s*(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1)\b/,
    /\bACE\s*(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1)\b/,
  ];

  for (const pattern of gradedPatterns) {
    const match = normalizedTitle.match(pattern);
    if (match) {
      return {
        type: "graded",
        label: match[0].replace(/\s+/g, " ").trim(),
      };
    }
  }

  if (/\bGRADED\b|\bSLABBED\b/.test(normalizedTitle)) {
    return {
      type: "graded",
      label: "Graded",
    };
  }

  return {
    type: "raw",
    label: "Raw",
  };
}

function extractPriceChartingCurrentUsdPrice(html) {
  const priceIds = ["used_price", "box_only_price", "new_price", "complete_price"];

  for (const id of priceIds) {
    const match = html.match(
      new RegExp(
        `<td id="${id}"[\\s\\S]*?<span class="price js-price">\\s*\\$([0-9,]+(?:\\.\\d{2})?)`,
        "i",
      ),
    );
    if (match?.[1]) {
      return parseNumber(match[1].replace(/,/g, ""));
    }
  }

  return null;
}

function extractPriceChartingImageUrl(html) {
  const dialogImage =
    html.match(
      /<div id="js-dialog-large-image"[\s\S]*?<img[^>]+src=['"](https:\/\/storage\.googleapis\.com\/images\.pricecharting\.com\/[^'"]+\.(?:png|jpe?g|webp))['"]/i,
    )?.[1] || "";

  if (dialogImage) {
    return dialogImage;
  }

  const imageMatches = [
    ...html.matchAll(
      /https:\/\/storage\.googleapis\.com\/images\.pricecharting\.com\/[^"'\\s)]+\.(?:png|jpe?g|webp)/gi,
    ),
  ].map((match) => match[0]);

  return (
    imageMatches.find((url) => /\/1600\./.test(url)) ||
    imageMatches.find((url) => /\/240\./.test(url)) ||
    imageMatches[0] ||
    ""
  );
}

function buildPriceChartingResult(
  pathname,
  html,
  query,
  usdToCadRate,
  { language = "Japanese", descriptionLabel = "PriceCharting card data", rarity = `${language} print` } = {},
) {
  const headingHtml = html.match(/<h1[^>]*id="product_name"[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
  const headingText = stripHtml(headingHtml);
  const setName = stripHtml(
    headingHtml.match(/<a[^>]+href="\/console\/[^"]+"[^>]*>([\s\S]*?)<\/a>/i)?.[1] || "",
  );
  const title = setName && headingText.endsWith(setName)
    ? headingText.slice(0, headingText.length - setName.length).trim()
    : headingText;
  const usdPrice = extractPriceChartingCurrentUsdPrice(html);
  const priceHistory = extractPriceChartingRecentSales(html, usdToCadRate);
  const normalizedPath = decodeHtml(pathname);
  const productSlug = normalizedPath.split("/").pop() || title;
  const onePieceCode = normalizedPath.includes("/game/one-piece")
    ? extractOnePieceCode(title, productSlug, headingText)
    : "";
  const extractedImageUrl = extractPriceChartingImageUrl(html);
  const imageUrl =
    extractedImageUrl ||
    (onePieceCode
      ? `https://en.onepiece-cardgame.com/images/cardlist/card/${onePieceCode}.png`
      : "");
  const score = rankSearchMatch([title, setName, productSlug], query);

  if (!title) {
    return null;
  }

  return {
    id: `pricecharting-${productSlug}`,
    provider: "pricecharting",
    providerLabel: "PriceCharting",
    title,
    setName: setName || "Unknown set",
    rarity,
    imageUrl,
    marketPrice: toCad(usdPrice, usdToCadRate),
    marketPriceCurrency: "CAD",
    originalMarketPriceUsd: usdPrice,
    originalMarketPriceCurrency: "USD",
    priceHistory,
    language,
    sourceUrl: `https://www.pricecharting.com${normalizedPath}`,
    printLabel: title.match(/#\S+/)?.[0] || language,
    description: [setName, descriptionLabel].filter(Boolean).join(" | "),
    score,
  };
}

function extractPriceChartingProductPaths(html, prefix, excludePrefixes = []) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const productRegex = new RegExp(`\\/game\\/${escapedPrefix}[^\\/'"\\s<]+\\/[^"'\\s<]+`, "g");
  return uniqueBy(
    (html.match(productRegex) || [])
      .map((path) => decodeHtml(path))
      .filter(
        (path) =>
          !excludePrefixes.some((excludedPrefix) => path.startsWith(`/game/${excludedPrefix}`)),
      ),
    (item) => item,
  );
}

async function searchPriceChartingProducts({
  query,
  limit,
  usdToCadRate,
  searchQuery,
  pathPrefix,
  excludePrefixes = [],
  language = "Japanese",
  descriptionLabel,
  rarity,
}) {
  const searchUrl = new URL(PRICECHARTING_SEARCH_ENDPOINT);
  searchUrl.searchParams.set("type", "prices");
  searchUrl.searchParams.set("q", searchQuery);

  const response = await fetchWithTimeout(searchUrl, {
    headers: {
      Accept: "text/html",
      "User-Agent": "TCGWPG/0.2 (local marketplace development)",
    },
  });

  if (!response.ok) {
    throw new Error(`PriceCharting search failed (${response.status}).`);
  }

  const html = await response.text();
  const productPaths = extractPriceChartingProductPaths(html, pathPrefix, excludePrefixes).slice(
    0,
    Math.min(limit * 3, 15),
  );

  if (!productPaths.length) {
    throw new Error("PriceCharting returned no matches for this search.");
  }

  const products = (
    await Promise.allSettled(
      productPaths.map(async (pathname) => {
        const productResponse = await fetchWithTimeout(`https://www.pricecharting.com${pathname}`, {
          headers: {
            Accept: "text/html",
            "User-Agent": "TCGWPG/0.2 (local marketplace development)",
          },
        });

        if (!productResponse.ok) {
          throw new Error(`PriceCharting product fetch failed (${productResponse.status}).`);
        }

        const productHtml = await productResponse.text();
        const builtResult = buildPriceChartingResult(pathname, productHtml, query, usdToCadRate, {
          language,
          descriptionLabel,
          rarity,
        });

        if (!builtResult) {
          return null;
        }

        if (pathname.includes("/game/one-piece") && !builtResult.imageUrl) {
          const code = extractOnePieceCode(
            builtResult.title,
            pathname,
            builtResult.printLabel,
            builtResult.description,
          );

          if (code) {
            const variantImage = await searchOnePieceOfficialVariantImage(
              code,
              `${builtResult.title} ${pathname}`,
            );

            if (variantImage) {
              builtResult.imageUrl = variantImage;
            }
          }
        }

        return builtResult;
      }),
    )
  )
    .filter((result) => result.status === "fulfilled" && result.value)
    .map((result) => result.value);

  if (!products.length) {
    throw new Error("PriceCharting returned no usable results.");
  }

  return products.sort((left, right) => right.score - left.score).slice(0, limit);
}

function getPriceChartingLookupConfig(game, language) {
  const normalizedGame = normalizeGameName(game);
  const normalizedLanguage = normalizeLanguage(language);

  if (normalizedGame === "pokemon" && normalizedLanguage === "japanese") {
    return {
      pathPrefix: "pokemon-japanese-",
      excludePrefixes: [],
      language: "Japanese",
      descriptionLabel: "PriceCharting Japanese Pokemon data",
      rarity: "Japanese print",
    };
  }

  if (normalizedGame === "pokemon") {
    return {
      pathPrefix: "pokemon-",
      excludePrefixes: ["pokemon-japanese-"],
      language: "English",
      descriptionLabel: "PriceCharting Pokemon data",
      rarity: "English print",
    };
  }

  if (normalizedGame === "one-piece" && normalizedLanguage === "japanese") {
    return {
      pathPrefix: "one-piece-japanese-",
      excludePrefixes: [],
      language: "Japanese",
      descriptionLabel: "PriceCharting Japanese One Piece data",
      rarity: "Japanese print",
    };
  }

  if (normalizedGame === "one-piece") {
    return {
      pathPrefix: "one-piece-",
      excludePrefixes: ["one-piece-japanese-"],
      language: "English",
      descriptionLabel: "PriceCharting One Piece data",
      rarity: "English print",
    };
  }

  if (normalizedGame === "magic") {
    return {
      pathPrefix: "magic-",
      excludePrefixes: [],
      language: normalizedLanguage === "japanese" ? "Japanese" : "English",
      descriptionLabel:
        normalizedLanguage === "japanese"
          ? "PriceCharting Japanese Magic data"
          : "PriceCharting Magic data",
      rarity: normalizedLanguage === "japanese" ? "Japanese print" : "English print",
    };
  }

  return null;
}

function buildPriceChartingLookupQuery({ title, setName, printLabel }) {
  return [title, printLabel || null, printLabel ? null : setName]
    .filter(Boolean)
    .map((part) => String(part).replace(/[|#]/g, " ").trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCardCode(value) {
  const match = String(value || "").toUpperCase().match(/[A-Z]{2,}\d{2}-\d+/);
  return match ? match[0] : "";
}

function extractVariantTokens(...values) {
  const variantTerms = ["sp", "alternate", "alt", "foil", "gold", "silver", "manga", "parallel"];
  const text = normalizeSearchText(values.filter(Boolean).join(" "));
  return variantTerms.filter((term) => text.includes(term));
}

function rankPriceChartingResultForPrinting(result, { title, setName, printLabel, rarity }) {
  let score = rankSearchMatch(
    [result.title, result.setName, result.printLabel, result.description],
    buildPriceChartingLookupQuery({ title, setName, printLabel }),
  );

  const normalizedTitle = normalizeSearchText(title);
  const normalizedPrintLabel = normalizeSearchText(printLabel);
  const normalizedRarity = normalizeSearchText(rarity);
  const normalizedResultTitle = normalizeSearchText(result.title);
  const normalizedResultSetName = normalizeSearchText(result.setName);
  const normalizedResultPrintLabel = normalizeSearchText(result.printLabel);
  const normalizedResultDescription = normalizeSearchText(result.description);
  const queryCode = extractCardCode(printLabel || title);
  const resultCode = extractCardCode(
    [result.title, result.printLabel, result.description, result.setName].join(" "),
  );
  const queryVariantTokens = extractVariantTokens(title, rarity, printLabel);
  const resultVariantTokens = extractVariantTokens(
    result.title,
    result.description,
    result.printLabel,
  );

  if (normalizedTitle && normalizedResultTitle === normalizedTitle) {
    score += 80;
  } else if (
    normalizedTitle &&
    normalizedTitle.split(/\s+/).every((term) => normalizedResultTitle.includes(term))
  ) {
    score += 40;
  }

  if (queryCode) {
    if (resultCode === queryCode) {
      score += 140;
    } else {
      score -= 120;
    }
  }

  if (
    normalizedPrintLabel &&
    (normalizedResultPrintLabel.includes(normalizedPrintLabel) ||
      normalizedResultDescription.includes(normalizedPrintLabel))
  ) {
    score += 50;
  }

  if (normalizedRarity && normalizedResultDescription.includes(normalizedRarity)) {
    score += 10;
  }

  if (
    normalizedResultSetName &&
    normalizedTitle &&
    normalizedResultSetName.includes(normalizedTitle)
  ) {
    score += 10;
  }

  if (queryVariantTokens.length) {
    const matchedVariantCount = queryVariantTokens.filter((token) =>
      resultVariantTokens.includes(token),
    ).length;
    score += matchedVariantCount * 40;
    if (!matchedVariantCount) {
      score -= 60;
    }
  }

  return score;
}

async function lookupPriceChartingSalesForPrinting(
  { game, language, title, setName, printLabel, rarity },
  usdToCadRate,
) {
  const config = getPriceChartingLookupConfig(game, language);
  if (!config || !title) {
    return null;
  }

  const query = title;
  const searchQuery = buildPriceChartingLookupQuery({ title, setName, printLabel }) || title;
  const results = await searchPriceChartingProducts({
    query,
    limit: 5,
    usdToCadRate,
    searchQuery,
    pathPrefix: config.pathPrefix,
    excludePrefixes: config.excludePrefixes,
    language: config.language,
    descriptionLabel: config.descriptionLabel,
    rarity: config.rarity,
  });

  const rankedResults = [...results].sort((left, right) => {
    const rightScore = rankPriceChartingResultForPrinting(right, {
      title,
      setName,
      printLabel,
      rarity,
    });
    const leftScore = rankPriceChartingResultForPrinting(left, {
      title,
      setName,
      printLabel,
      rarity,
    });
    return rightScore - leftScore;
  });

  return rankedResults[0] || null;
}

async function searchJapanesePokemonCards(query, limit, usdToCadRate) {
  return searchPriceChartingProducts({
    query,
    limit,
    usdToCadRate,
    searchQuery: /\bjapanese\b/i.test(query) ? `${query} pokemon` : `${query} pokemon japanese`,
    pathPrefix: "pokemon-japanese-",
    language: "Japanese",
    descriptionLabel: "PriceCharting Japanese Pokemon data",
    rarity: "Japanese print",
  });
}

async function searchJapaneseOnePieceCards(query, limit, usdToCadRate) {
  return searchPriceChartingProducts({
    query,
    limit,
    usdToCadRate,
    searchQuery: /\bjapanese\b/i.test(query)
      ? `${query} one piece`
      : `${query} one piece japanese`,
    pathPrefix: "one-piece-japanese-",
    language: "Japanese",
    descriptionLabel: "PriceCharting Japanese One Piece data",
    rarity: "Japanese print",
  });
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEventGame(value) {
  const rawValue = String(value || "");

  if (
    /(star wars unlimited|pathfinder|lorcana|yu[\s-]?gi[\s-]?oh|teenage mutant ninja turtles|\btmnt\b|riftbound|flesh and blood|digimon|dragon ball|union arena|final fantasy)/i.test(
      rawValue,
    )
  ) {
    return null;
  }

  if (/one\s*piece/i.test(rawValue)) {
    return "One Piece";
  }

  if (/pok[eé]mon/i.test(rawValue)) {
    return "Pokemon";
  }

  if (
    /(magic(?::|\s+the gathering)?|friday night magic|\bfnm\b|\bcommander\b|\bmodern\b|\bpioneer\b|standard showdown)/i.test(
      rawValue,
    )
  ) {
    return "Magic";
  }

  return null;
}

function normalizeEventFee(value) {
  if (value == null || value === "") {
    return "TBD";
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue === 0 ? "Free" : formatCurrencyValue(numericValue, "CAD");
  }

  return String(value).trim();
}

function formatCurrencyValue(value, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildEventId(prefix, value) {
  return `${prefix}-${String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

function isUpcomingDate(date) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 120);

  return date >= start && date <= end;
}

function parseMonthDayDate(title, referenceDate = new Date()) {
  const match = String(title || "").match(
    /\b(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?/i,
  );

  if (!match) {
    return null;
  }

  const monthIndex = MONTH_INDEX[match[1].toLowerCase()];
  const day = Number(match[2]);
  const year = Number(match[3] || new Date(referenceDate).getFullYear());
  const parsedDate = new Date(year, monthIndex, day);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function parseTimeLabel(value) {
  const match = String(value || "").match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3].toLowerCase();
  const displayHour = ((hour + 11) % 12) + 1;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${meridiem.toUpperCase()}`;
}

function findTimeLabel(value, fallback = "TBD") {
  const match = String(value || "").match(/@?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
  return match ? parseTimeLabel(match[1]) : fallback;
}

function nextDatesForWeekday(weekdayName, count, timeLabel = "6:00 PM") {
  const weekdayIndex = WEEKDAY_INDEX[String(weekdayName || "").toLowerCase()];
  if (weekdayIndex == null) {
    return [];
  }

  const results = [];
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  const offset = (weekdayIndex - current.getDay() + 7) % 7;
  current.setDate(current.getDate() + offset);

  for (let index = 0; index < count; index += 1) {
    const eventDate = new Date(current);
    eventDate.setDate(current.getDate() + index * 7);
    results.push({
      dateStr: eventDate.toISOString().slice(0, 10),
      time: timeLabel,
    });
  }

  return results;
}

function normalizeEventRecord(event) {
  return {
    sourceType: "live",
    neighborhood: "",
    note: "",
    fee: "TBD",
    ...event,
  };
}

function buildEventExternalKey(event) {
  return [
    String(event.store || "").trim().toLowerCase(),
    String(event.title || "").trim().toLowerCase(),
    String(event.dateStr || "").trim(),
    String(event.time || "").trim().toLowerCase(),
  ]
    .filter(Boolean)
    .join("::");
}

function sortEventsAscending(events = []) {
  return [...events].sort((left, right) => {
    const leftTime = new Date(`${left.dateStr}T12:00:00`).getTime();
    const rightTime = new Date(`${right.dateStr}T12:00:00`).getTime();
    return leftTime - rightTime;
  });
}

function mapManualEventRow(row) {
  return {
    id: row.id,
    title: row.title,
    store: row.store,
    source: row.source,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    dateStr: row.date_str,
    time: row.time,
    game: row.game,
    fee: row.fee,
    neighborhood: row.neighborhood,
    note: row.note,
    published: row.published,
    externalKey: row.external_key || "",
    updatedAt: row.updated_at || null,
  };
}

async function readCachedSyncedEvents() {
  if (!supabaseAdmin) {
    return { ok: false, events: [], stale: true };
  }

  const { data, error } = await supabaseAdmin
    .from("manual_events")
    .select("id,title,store,source,source_type,source_url,date_str,time,game,fee,neighborhood,note,published,external_key,updated_at")
    .eq("source_type", "synced")
    .eq("published", true)
    .gte("date_str", new Date().toISOString().slice(0, 10));

  if (error) {
    if (
      isMissingTableError(error, "manual_events") ||
      isMissingColumnError(error, "external_key") ||
      isMissingColumnError(error, "updated_at")
    ) {
      return { ok: false, events: [], stale: true };
    }
    throw error;
  }

  const events = sortEventsAscending((data || []).map(mapManualEventRow));
  const freshestUpdatedAt = events.reduce((latest, event) => {
    const timestamp = new Date(event.updatedAt || 0).getTime();
    return timestamp > latest ? timestamp : latest;
  }, 0);
  const stale = !freshestUpdatedAt || Date.now() - freshestUpdatedAt > 45 * 60 * 1000;
  return { ok: true, events, stale };
}

async function syncExternalEventsToSupabase(events = []) {
  if (!supabaseAdmin) {
    return { ok: false, skipped: true, reason: "Supabase admin client is not configured." };
  }

  const timestamp = new Date().toISOString();
  const latestEvents = uniqueBy(
    events
      .map((event) => ({
        ...normalizeEventRecord(event),
        externalKey: buildEventExternalKey(event),
      }))
      .filter((event) => event.externalKey),
    (event) => event.externalKey,
  );

  if (!latestEvents.length) {
    const cached = await readCachedSyncedEvents().catch(() => ({ ok: false, events: [], stale: true }));
    return {
      ok: Boolean(cached?.ok),
      events: Array.isArray(cached?.events) ? cached.events : [],
      skipped: true,
      reason: "Live event sources returned no upcoming events; preserved existing cached rows.",
    };
  }

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("manual_events")
    .select("id,external_key")
    .eq("source_type", "synced");

  if (existingError) {
    if (
      isMissingTableError(existingError, "manual_events") ||
      isMissingColumnError(existingError, "external_key")
    ) {
      return { ok: false, skipped: true, reason: existingError.message };
    }
    throw existingError;
  }

  const existingByKey = new Map((existingRows || []).map((row) => [row.external_key, row]));
  const latestKeys = new Set(latestEvents.map((event) => event.externalKey));

  const rowsToInsert = latestEvents
    .filter((event) => !existingByKey.has(event.externalKey))
    .map((event) => ({
      title: event.title,
      store: event.store,
      source: event.source,
      source_type: "synced",
      source_url: event.sourceUrl || null,
      date_str: event.dateStr,
      time: event.time,
      game: event.game,
      fee: event.fee || "TBD",
      neighborhood: event.neighborhood || null,
      note: event.note || "",
      published: true,
      external_key: event.externalKey,
      updated_at: timestamp,
    }));

  const rowsToUpdate = latestEvents
    .filter((event) => existingByKey.has(event.externalKey))
    .map((event) => ({
      id: existingByKey.get(event.externalKey).id,
      payload: {
        title: event.title,
        store: event.store,
        source: event.source,
        source_type: "synced",
        source_url: event.sourceUrl || null,
        date_str: event.dateStr,
        time: event.time,
        game: event.game,
        fee: event.fee || "TBD",
        neighborhood: event.neighborhood || null,
        note: event.note || "",
        published: true,
        external_key: event.externalKey,
        updated_at: timestamp,
      },
    }));

  const rowsToDelete = (existingRows || [])
    .filter((row) => !latestKeys.has(row.external_key))
    .map((row) => row.id);

  if (rowsToInsert.length) {
    const { error } = await supabaseAdmin.from("manual_events").insert(rowsToInsert);
    if (error) {
      throw error;
    }
  }

  if (rowsToUpdate.length) {
    await Promise.all(
      rowsToUpdate.map(async (row) => {
        const { error } = await supabaseAdmin
          .from("manual_events")
          .update(row.payload)
          .eq("id", row.id);
        if (error) {
          throw error;
        }
      }),
    );
  }

  if (rowsToDelete.length) {
    const { error } = await supabaseAdmin
      .from("manual_events")
      .delete()
      .in("id", rowsToDelete);
    if (error) {
      throw error;
    }
  }

  return readCachedSyncedEvents();
}

const GALAXY_FACEBOOK_SNAPSHOT_EVENTS = [
  { title: "Magic: The Gathering Standard League", dateStr: "2026-03-20", time: "6:00 p.m.", game: "Magic" },
  { title: "Pokemon Mega Evolution Perfect Order Prerelease", dateStr: "2026-03-21", time: "10:00 a.m.", game: "Pokemon" },
  { title: "ONE PIECE CARD GAME Store Treasure Cup 2026 March", dateStr: "2026-03-22", time: "10:00 a.m.", game: "One Piece" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-03-22", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-03-27", time: "6:00 p.m.", game: "Magic" },
  { title: "ONE PIECE CARD GAME OP-15 Release Event", dateStr: "2026-03-29", time: "12:00 p.m.", game: "One Piece" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-04-03", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-04-05", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Teenage Mutant Ninja Turtles Commander Party", dateStr: "2026-04-06", time: "5:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-04-10", time: "6:00 p.m.", game: "Magic" },
  { title: "One Piece Store Championship April", dateStr: "2026-04-12", time: "10:00 a.m.", game: "One Piece" },
  { title: "Pokemon TCG League Challenge", dateStr: "2026-04-16", time: "6:00 p.m.", game: "Pokemon" },
  { title: "Magic: The Gathering Secrets of Strixhaven Two-Headed Prerelease!", dateStr: "2026-04-17", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-04-17", time: "6:00 p.m.", game: "Magic" },
  { title: "Pokemon TCG League Cup", dateStr: "2026-04-18", time: "10:00 a.m.", game: "Pokemon" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-04-19", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-04-24", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-05-01", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-05-03", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-05-08", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-05-15", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-05-17", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-05-22", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-05-29", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-05-31", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-06-05", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-06-12", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-06-14", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-06-19", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-06-26", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-06-28", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-07-03", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-07-10", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-07-12", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-07-17", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-07-26", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-07-31", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-08-09", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-08-14", time: "6:00 p.m.", game: "Magic" },
];

async function fetchFusionEvents() {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 127);
    const searchParams = new URLSearchParams({
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    });

    const response = await fetchWithTimeout(`${FUSION_BINDERPOS_ENDPOINT}?${searchParams.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "https://fusiongamingonline.com",
        Referer: FUSION_EVENTS_PAGE,
        "User-Agent": "TCGWPG/0.2 (local marketplace development)",
      },
    });

    if (!response.ok) {
      throw new Error(`Fusion BinderPOS request failed (${response.status}).`);
    }

    const payload = await response.json();
    const rawEvents = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.events)
        ? payload.events
        : [];
    const events = rawEvents
      .map((item) => {
        const title = stripHtml(item.title || item.name || "");
        const rawDate = String(item.date || item.startDate || "").slice(0, 10);
        const rawTime = String(item.time || item.startTime || "").slice(0, 8);
        const parsedDate = rawDate ? new Date(`${rawDate}T12:00:00`) : null;
        const parsedTime = rawDate && rawTime ? new Date(`${rawDate}T${rawTime}`) : null;
        const game = normalizeEventGame(item.game || item.gameName || title);

        if (!title || !parsedDate || Number.isNaN(parsedDate.getTime()) || !game) {
          return null;
        }

        return normalizeEventRecord({
          id: buildEventId("fusion", item.id || item.handle || `${title}-${rawDate}-${rawTime}`),
          title,
          store: "Fusion Gaming",
          source: "Fusion events calendar",
          sourceUrl: item.handle
            ? `https://fusiongamingonline.com/collections/events/products/${item.handle}`
            : FUSION_EVENTS_PAGE,
          dateStr: rawDate,
          time:
            parsedTime && !Number.isNaN(parsedTime.getTime())
              ? parsedTime.toLocaleTimeString("en-CA", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "TBD",
          game,
          fee: normalizeEventFee(item.ticketPrice ?? item.entryFee ?? item.buyin ?? item.price ?? item.cost),
          neighborhood: "Fort Garry",
          note:
            stripHtml(item.description || "") ||
            stripHtml(item.prizeStructure || "") ||
            stripHtml(item.buildingName || ""),
        });
      })
      .filter(Boolean)
      .filter((event) => isUpcomingDate(new Date(`${event.dateStr}T12:00:00`)));

    return {
      events,
      status: {
        id: "fusion",
        label: "Fusion Gaming",
        mode: events.length ? "Live pull" : "Live source / no current events",
        note: events.length
          ? `Pulled ${events.length} upcoming event(s) from Fusion's BinderPOS calendar.`
          : "Fusion's events page is reachable, but it did not return upcoming Magic, Pokemon, or One Piece events right now.",
        sourceUrl: FUSION_EVENTS_PAGE,
      },
    };
  } catch (error) {
    return {
      events: [],
      status: {
        id: "fusion",
        label: "Fusion Gaming",
        mode: "Source error",
        note: error.message,
        sourceUrl: FUSION_EVENTS_PAGE,
      },
    };
  }
}

async function fetchAMuseEvents() {
  try {
    const response = await fetchWithTimeout(A_MUSE_EVENTS_ENDPOINT, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify events request failed (${response.status}).`);
    }

    const payload = await response.json();
    const products = Array.isArray(payload.products) ? payload.products : [];
    const events = products
      .map((product) => {
        const title = stripHtml(product.title);
        const description = stripHtml(product.body_html);
        const tags = Array.isArray(product.tags)
          ? product.tags.join(" ")
          : String(product.tags || "");
        const game = normalizeEventGame(`${title} ${tags}`);
        const parsedDate = parseMonthDayDate(title, product.published_at || product.created_at);

        if (!game || !parsedDate || !isUpcomingDate(parsedDate)) {
          return null;
        }

        return normalizeEventRecord({
          id: buildEventId("amuse", product.id || product.handle || title),
          title,
          store: "A Muse N Games",
          source: "Shopify Events",
          sourceUrl: `https://amusengames.ca/products/${product.handle}`,
          dateStr: parsedDate.toISOString().slice(0, 10),
          time: findTimeLabel(title, "TBD"),
          game,
          fee: normalizeEventFee(product.variants?.[0]?.price),
          neighborhood: "West End",
          note: description,
        });
      })
      .filter(Boolean);

    return {
      events,
      status: {
        id: "amuse",
        label: "A Muse N Games",
        mode: events.length ? "Live pull" : "Live source / no current events",
        note: events.length
          ? `Pulled ${events.length} upcoming Shopify event product(s).`
          : "Shopify events endpoint is reachable, but it returned no upcoming Magic, Pokemon, or One Piece events inside the active window.",
        sourceUrl: A_MUSE_EVENTS_ENDPOINT,
      },
    };
  } catch (error) {
    return {
      events: [],
      status: {
        id: "amuse",
        label: "A Muse N Games",
        mode: "Source error",
        note: error.message,
        sourceUrl: A_MUSE_EVENTS_ENDPOINT,
      },
    };
  }
}

async function fetchArcticEvents() {
  try {
    const mahinaResponse = await fetchWithTimeout(ARCTIC_MAHINA_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "text/plain;charset=UTF-8",
        Referer: ARCTIC_HOME_PAGE,
      },
      body: JSON.stringify({
        shop: "5d7678.myshopify.com",
        selectedEventId: null,
        selectedRecurringDate: null,
        page: 1,
      }),
    });

    if (!mahinaResponse.ok) {
      throw new Error(`Arctic event feed failed (${mahinaResponse.status}).`);
    }

    const payload = await mahinaResponse.json();
    const eventTemplates = new Map(
      (Array.isArray(payload.events) ? payload.events : []).map((event) => [String(event.id), event]),
    );
    const rawEventDates = Array.isArray(payload.eventDates)
      ? payload.eventDates
      : (Array.isArray(payload.events) ? payload.events : []).map((event) => ({
          id: event.id,
          start: event.startDate,
          timezone: event.timezone,
          isRecurring: event.isRecurring,
        }));

    const events = rawEventDates
      .map((occurrence, index) => {
        const template = eventTemplates.get(String(occurrence.id));
        const title = stripHtml(template?.title || "");
        const game = normalizeEventGame(title);
        const startDate = occurrence.start ? new Date(occurrence.start) : null;

        if (!template || !title || !game || !startDate || Number.isNaN(startDate.getTime())) {
          return null;
        }

        if (!isUpcomingDate(startDate)) {
          return null;
        }

        const fee =
          template.tickets?.priceType === "free"
            ? "Free"
            : normalizeEventFee(
                template.tickets?.priceMin ||
                  template.tickets?.priceMax ||
                  template.tickets?.price,
              );

        return normalizeEventRecord({
          id: buildEventId("arctic", `${occurrence.id}-${startDate.toISOString()}-${index}`),
          title,
          store: "Arctic Rift Cards",
          source: "Arctic homepage feed",
          sourceUrl: template.tickets?.links?.[0]?.link || ARCTIC_HOME_PAGE,
          dateStr: startDate.toISOString().slice(0, 10),
          time: startDate.toLocaleTimeString("en-CA", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: occurrence.timezone || template.timezone || "America/Chicago",
          }),
          game,
          fee,
          neighborhood: "North End",
          note: stripHtml(template.description || "") || stripHtml(template.location?.name || ""),
        });
      })
      .filter(Boolean)
      .sort(
        (left, right) =>
          new Date(`${left.dateStr}T12:00:00`).getTime() -
          new Date(`${right.dateStr}T12:00:00`).getTime(),
      )
      .slice(0, 80);

    return {
      events,
      status: {
        id: "arctic",
        label: "Arctic Rift Cards",
        mode: events.length ? "Live homepage feed" : "Live source / no supported events",
        note: events.length
          ? `Pulled ${events.length} upcoming event occurrence(s) from Arctic Rift's homepage calendar feed.`
          : "Arctic Rift's homepage feed is reachable, but it did not return upcoming Magic, Pokemon, or One Piece events right now.",
        sourceUrl: ARCTIC_HOME_PAGE,
      },
    };

    /* const response = await fetchWithTimeout(ARCTIC_EVENTS_PAGE, {
      headers: {
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Arctic events page failed (${response.status}).`);
    }

    const html = await response.text();
    const descriptionMatch = html.match(/<meta name="description" content="([^"]+)"/i);
    const description = decodeHtml(descriptionMatch?.[1] || "");
    const events = [];

    if (/pok[eé]mon/i.test(description) && /monday at 6 pm/i.test(description)) {
      nextDatesForWeekday("monday", 8, "6:00 PM").forEach((date, index) => {
        events.push(
          normalizeEventRecord({
            id: buildEventId("arctic-pokemon", `${date.dateStr}-${index}`),
            title: "Pokemon Weekly League Night",
            store: "Arctic Rift Cards",
            source: "Public Events Page",
            sourceUrl: ARCTIC_EVENTS_PAGE,
            dateStr: date.dateStr,
            time: date.time,
            game: "Pokemon",
            fee: "TBD",
            neighborhood: "",
            note: "Recurring weekly event generated from Arctic Rift's public event page schedule.",
          }),
        );
      });
    }

    return {
      events,
      status: {
        id: "arctic",
        label: "Arctic Rift Cards",
        mode: events.length ? "Recurring page scrape" : "Live source / no supported events",
        note: events.length
          ? "Generated upcoming recurring Pokemon nights from the public events page."
          : "The public events page is reachable, but it does not currently expose upcoming Magic, Pokemon, or One Piece events beyond unsupported schedules.",
        sourceUrl: ARCTIC_EVENTS_PAGE,
      },
    }; */
  } catch (error) {
    return {
      events: [],
      status: {
        id: "arctic",
        label: "Arctic Rift Cards",
        mode: "Source error",
        note: error.message,
        sourceUrl: ARCTIC_EVENTS_PAGE,
      },
    };
  }
}

async function fetchGalaxyStatus() {
  try {
    const response = await fetchWithTimeout(GALAXY_EVENTS_PAGE, {
      headers: {
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Galaxy calendar page failed (${response.status}).`);
    }

    const events = GALAXY_FACEBOOK_SNAPSHOT_EVENTS.map((event) =>
      normalizeEventRecord({
        id: buildEventId("galaxy", `${event.title}-${event.dateStr}-${event.time}`),
        store: "Galaxy Comics",
        source: "Facebook events snapshot",
        sourceUrl: GALAXY_FACEBOOK_EVENTS_PAGE,
        neighborhood: "North Kildonan",
        note: "Imported from Galaxy's Facebook events feed snapshot supplied on March 19, 2026.",
        ...event,
      }),
    ).filter((event) => isUpcomingDate(new Date(`${event.dateStr}T12:00:00`)));

    return {
      events,
      status: {
        id: "galaxy",
        label: "Galaxy Comics",
        mode: events.length ? "Facebook snapshot" : "Manual override",
        note: events.length
          ? `Loaded ${events.length} upcoming Galaxy event(s) from the supplied Facebook snapshot.`
          : "The public calendar page is reachable, but it does not expose a stable structured event feed. Admin overrides are used for this store.",
        sourceUrl: GALAXY_FACEBOOK_EVENTS_PAGE,
      },
    };
  } catch (error) {
    return {
      events: [],
      status: {
        id: "galaxy",
        label: "Galaxy Comics",
        mode: "Manual override",
        note: `Fallback to admin-managed events. ${error.message}`,
        sourceUrl: GALAXY_EVENTS_PAGE,
      },
    };
  }
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    supportedGames: ["magic", "pokemon", "one-piece"],
  });
});

app.post("/api/messages/threads", requireAllowedOrigin, messageThreadApiRateLimit, async (req, res) => {
  const context = await getActingUserContext(req);
  if (!context.ok) {
    return res.status(context.status).json({ error: context.error });
  }

  const { actingUser, actingProfile } = context;
  if (actingProfile?.account_status === "suspended") {
    return res.status(403).json({
      error: "This account is suspended. Messaging is disabled until the suspension is lifted.",
    });
  }

  const listingId = String(req.body?.listingId || "").trim() || null;
  const participantIds = [...new Set((Array.isArray(req.body?.participantIds) ? req.body.participantIds : []).filter(Boolean).map(String))];

  if (!participantIds.length || !participantIds.includes(String(actingUser.id))) {
    return res.status(400).json({
      error: "participantIds must include the current user.",
    });
  }

  if (participantIds.length < 2) {
    return res.status(400).json({
      error: "Threads need at least two participants.",
    });
  }

  let existingQuery = supabaseAdmin
    .from("message_threads")
    .select("*")
    .contains("participant_ids", participantIds)
    .order("updated_at", { ascending: false })
    .limit(20);

  existingQuery = listingId
    ? existingQuery.eq("listing_id", listingId)
    : existingQuery.is("listing_id", null);

  const { data: existingThreads, error: existingThreadsError } = await existingQuery;
  if (existingThreadsError) {
    return res.status(500).json({ error: existingThreadsError.message });
  }

  const exactThread =
    (existingThreads || []).find((thread) =>
      sameParticipantSet(thread.participant_ids || [], participantIds),
    ) || null;

  if (exactThread) {
    return res.json({ ok: true, thread: exactThread });
  }

  const { data: threadRow, error: threadError } = await supabaseAdmin
    .from("message_threads")
    .insert({
      listing_id: listingId,
      participant_ids: participantIds,
    })
    .select("*")
    .single();

  if (threadError) {
    return res.status(500).json({ error: threadError.message });
  }

  return res.json({ ok: true, thread: threadRow });
});

app.post(
  "/api/messages/threads/:id/messages",
  requireAllowedOrigin,
  messageSendApiRateLimit,
  async (req, res) => {
    const context = await getActingUserContext(req);
    if (!context.ok) {
      return res.status(context.status).json({ error: context.error });
    }

    const { actingUser, actingProfile } = context;
    if (actingProfile?.account_status === "suspended") {
      return res.status(403).json({
        error: "This account is suspended. Messaging is disabled until the suspension is lifted.",
      });
    }

    const threadId = String(req.params.id || "").trim();
    const body = String(req.body?.body || "");

    if (!threadId) {
      return res.status(400).json({ error: "Thread id is required." });
    }

    if (!body.trim()) {
      return res.status(400).json({ error: "Message body cannot be empty." });
    }

    const { data: threadRow, error: threadError } = await supabaseAdmin
      .from("message_threads")
      .select("*")
      .eq("id", threadId)
      .maybeSingle();

    if (threadError) {
      return res.status(500).json({ error: threadError.message });
    }

    if (!threadRow) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    const participantIds = Array.isArray(threadRow.participant_ids)
      ? threadRow.participant_ids.map(String)
      : [];

    if (!participantIds.includes(String(actingUser.id))) {
      return res.status(403).json({ error: "You do not have access to this conversation." });
    }

    const createdAt = new Date().toISOString();
    const { data: messageRow, error: messageError } = await supabaseAdmin
      .from("messages")
      .insert({
        thread_id: threadId,
        sender_id: actingUser.id,
        body,
        read_by: [actingUser.id],
      })
      .select("*")
      .single();

    if (messageError) {
      return res.status(500).json({ error: messageError.message });
    }

    const nextHiddenBy = { ...(threadRow.hidden_by || {}) };
    delete nextHiddenBy[actingUser.id];

    let threadUpdateResult = await supabaseAdmin
      .from("message_threads")
      .update({
        updated_at: createdAt,
        hidden_by: nextHiddenBy,
      })
      .eq("id", threadId);

    if (threadUpdateResult.error && isMissingColumnError(threadUpdateResult.error, "hidden_by")) {
      threadUpdateResult = await supabaseAdmin
        .from("message_threads")
        .update({
          updated_at: createdAt,
        })
        .eq("id", threadId);
    }

    if (threadUpdateResult.error) {
      return res.status(500).json({ error: threadUpdateResult.error.message });
    }

    const senderName =
      actingProfile?.public_name || actingProfile?.name || actingUser.email || "A buyer";

    await insertNotifications(
      participantIds
        .filter((userId) => String(userId) !== String(actingUser.id))
        .map((userId) => ({
          user_id: userId,
          type: "message",
          title: "New message",
          body: `${senderName} sent a new message.`,
          entity_id: threadId,
          read: false,
        })),
    );

    return res.json({ ok: true, message: messageRow });
  },
);

app.post("/api/offers", requireAllowedOrigin, offerCreateApiRateLimit, async (req, res) => {
  const context = await getActingUserContext(req);
  if (!context.ok) {
    return res.status(context.status).json({ error: context.error });
  }

  const { actingUser, actingProfile } = context;
  if (actingProfile?.account_status === "suspended") {
    return res.status(403).json({
      error: "This account is suspended. Offers are disabled until the suspension is lifted.",
    });
  }

  const listingId = String(req.body?.listingId || "").trim();
  const offerType = String(req.body?.offerType || "").trim() || "cash";
  const cashAmount = Number(req.body?.cashAmount) || 0;
  const tradeItems = Array.isArray(req.body?.tradeItems)
    ? req.body.tradeItems.filter(Boolean)
    : [];
  const note = String(req.body?.note || "").trim();

  if (!listingId) {
    return res.status(400).json({ error: "listingId is required." });
  }

  const { data: listingRow, error: listingError } = await supabaseAdmin
    .from("listings")
    .select("id, title, seller_id, offers, status")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError) {
    return res.status(500).json({ error: listingError.message });
  }

  if (!listingRow) {
    return res.status(404).json({ error: "Listing not found." });
  }

  if (String(listingRow.seller_id) === String(actingUser.id)) {
    return res.status(400).json({ error: "You cannot offer on your own listing." });
  }

  if (offerType !== "trade" && cashAmount <= 0) {
    return res.status(400).json({ error: "Cash offers need a valid amount." });
  }

  if (offerType !== "cash" && tradeItems.length === 0) {
    return res.status(400).json({ error: "Trade offers need at least one trade item." });
  }

  const insertPayload = {
    listing_id: listingId,
    seller_id: listingRow.seller_id,
    buyer_id: actingUser.id,
    offer_type: offerType,
    cash_amount: cashAmount,
    trade_items: tradeItems,
    note,
    last_actor_id: actingUser.id,
  };

  let insertResult = await supabaseAdmin
    .from("offers")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertResult.error && isMissingColumnError(insertResult.error, "last_actor_id")) {
    insertResult = await supabaseAdmin
      .from("offers")
      .insert(omitMissingOfferColumns(insertPayload, insertResult.error))
      .select("*")
      .single();
  }

  if (insertResult.error) {
    return res.status(500).json({ error: insertResult.error.message });
  }

  await supabaseAdmin
    .from("listings")
    .update({
      offers: Number(listingRow.offers || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  await insertNotifications([
    {
      user_id: listingRow.seller_id,
      type: "offer-received",
      title: "New offer received",
      body: `${actingProfile?.public_name || actingProfile?.name || actingUser.email || "A buyer"} sent an offer on ${listingRow.title}.`,
      entity_id: listingId,
      read: false,
    },
  ]);

  return res.json({ ok: true, offer: insertResult.data });
});

app.patch("/api/offers/:id", requireAllowedOrigin, offerRespondApiRateLimit, async (req, res) => {
  const context = await getActingUserContext(req);
  if (!context.ok) {
    return res.status(context.status).json({ error: context.error });
  }

  const { actingUser, actingProfile } = context;
  if (actingProfile?.account_status === "suspended") {
    return res.status(403).json({
      error: "This account is suspended. Offers are disabled until the suspension is lifted.",
    });
  }

  const offerId = String(req.params.id || "").trim();
  const action = String(req.body?.action || "").trim();
  const counterPayload = req.body?.counterPayload || {};

  if (!offerId || !action) {
    return res.status(400).json({ error: "Offer id and action are required." });
  }

  const { data: offerRow, error: offerError } = await supabaseAdmin
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError) {
    return res.status(500).json({ error: offerError.message });
  }

  if (!offerRow) {
    return res.status(404).json({ error: "Offer not found." });
  }

  const transition = resolveOfferResponse(
    {
      id: offerRow.id,
      listingId: offerRow.listing_id,
      sellerId: offerRow.seller_id,
      buyerId: offerRow.buyer_id,
      offerType: offerRow.offer_type,
      cashAmount: Number(offerRow.cash_amount) || 0,
      tradeItems: offerRow.trade_items || [],
      note: offerRow.note || "",
      status: offerRow.status,
      lastActorId:
        offerRow.last_actor_id ||
        (offerRow.status === "pending" ? offerRow.buyer_id : offerRow.seller_id),
    },
    actingUser.id,
    action,
    counterPayload,
  );

  if (!transition.ok) {
    return res.status(400).json({ error: transition.error });
  }

  let updateResult = await supabaseAdmin
    .from("offers")
    .update(transition.updatePayload)
    .eq("id", offerId)
    .select("*")
    .single();

  if (updateResult.error && isMissingColumnError(updateResult.error, "last_actor_id")) {
    updateResult = await supabaseAdmin
      .from("offers")
      .update(omitMissingOfferColumns(transition.updatePayload, updateResult.error))
      .eq("id", offerId)
      .select("*")
      .single();
  }

  if (updateResult.error) {
    return res.status(500).json({ error: updateResult.error.message });
  }

  if (transition.nextStatus === "accepted") {
    const incrementCompletedDeals = async (userId) => {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("completed_deals")
        .eq("id", userId)
        .maybeSingle();

      return supabaseAdmin
        .from("profiles")
        .update({ completed_deals: Number(profile?.completed_deals || 0) + 1 })
        .eq("id", userId);
    };

    await Promise.all([
      incrementCompletedDeals(offerRow.seller_id),
      incrementCompletedDeals(offerRow.buyer_id),
    ]);
  }

  const counterpartyUserId = getOfferCounterpartyId(
    {
      sellerId: offerRow.seller_id,
      buyerId: offerRow.buyer_id,
    },
    actingUser.id,
  );

  await insertNotifications([
    {
      user_id: counterpartyUserId,
      type:
        transition.nextStatus === "accepted"
          ? "offer-accepted"
          : transition.nextStatus === "declined"
            ? "offer-declined"
            : "offer-countered",
      title:
        transition.nextStatus === "accepted"
          ? "Offer accepted"
          : transition.nextStatus === "declined"
            ? "Offer declined"
            : "Counter offer received",
      body:
        transition.nextStatus === "countered"
          ? `${actingProfile?.public_name || actingProfile?.name || actingUser.email || "A seller"} sent a counter offer.`
          : `${actingProfile?.public_name || actingProfile?.name || actingUser.email || "A seller"} ${transition.nextStatus} your offer.`,
      entity_id: offerRow.listing_id,
      read: false,
    },
  ]);

  return res.json({ ok: true, offer: updateResult.data });
});

app.post("/api/reports", requireAllowedOrigin, reportApiRateLimit, async (req, res) => {
  const context = await getActingUserContext(req);
  if (!context.ok) {
    return res.status(context.status).json({ error: context.error });
  }

  const { actingUser, actingProfile } = context;
  if (actingProfile?.account_status === "suspended") {
    return res.status(403).json({
      error: "This account is suspended. Reporting stays disabled until the suspension is reviewed.",
    });
  }

  const listingId = String(req.body?.listingId || "").trim();
  const sellerId = String(req.body?.sellerId || "").trim();
  const details = String(req.body?.details || "").trim();
  const reason = String(req.body?.reason || "").trim();
  const reasonLabel =
    {
      "fake-card": "Fake or proxy suspected",
      "misleading-condition": "Misleading condition",
      "no-show": "No-show meetup behavior",
      harassment: "Harassment or abusive messages",
      "scam-risk": "Scam risk",
    }[reason] || reason;

  if (!listingId || !sellerId || !reasonLabel) {
    return res.status(400).json({
      error: "listingId, sellerId, and reason are required.",
    });
  }

  const { data: reportRow, error: reportError } = await supabaseAdmin
    .from("reports")
    .insert({
      listing_id: listingId,
      seller_id: sellerId,
      reporter_id: actingUser.id,
      reason: reasonLabel,
      details,
    })
    .select("*")
    .single();

  if (reportError) {
    return res.status(500).json({ error: reportError.message });
  }

  const { data: adminProfiles, error: adminProfilesError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (adminProfilesError && !isMissingTableError(adminProfilesError, "profiles")) {
    console.error("report admin profile lookup failed:", adminProfilesError.message);
  }

  await insertNotifications(
    (adminProfiles || []).map((admin) => ({
      user_id: admin.id,
      type: "report-opened",
      title: "New report opened",
      body: `${actingProfile?.public_name || actingProfile?.name || actingUser.email || "A user"} reported a listing for ${reasonLabel}.`,
      entity_id: listingId,
      read: false,
    })),
  );

  return res.json({ ok: true, report: reportRow });
});

app.post("/api/bug-reports", requireAllowedOrigin, bugApiRateLimit, async (req, res) => {
  const context = await getActingUserContext(req);
  if (!context.ok) {
    return res.status(context.status).json({ error: context.error });
  }

  const { actingUser, actingProfile } = context;
  const isBetaTester =
    Array.isArray(actingProfile?.badges) && actingProfile.badges.includes("beta");
  const isAdmin = actingProfile?.role === "admin";

  if (!isBetaTester && !isAdmin) {
    return res.status(403).json({
      error: "Only beta testers can access the bug tracker.",
    });
  }

  const title = String(req.body?.title || "").trim();
  const actualBehavior = String(req.body?.actualBehavior || "").trim();
  const reproductionSteps = String(req.body?.reproductionSteps || "").trim();

  if (!title) {
    return res.status(400).json({ error: "Bug title is required." });
  }

  if (!actualBehavior || !reproductionSteps) {
    return res.status(400).json({
      error: "Actual behavior and reproduction steps are required.",
    });
  }

  const insertPayload = {
    reporter_id: actingUser.id,
    title,
    area: String(req.body?.area || "general").trim() || "general",
    severity: String(req.body?.severity || "medium").trim() || "medium",
    status: "open",
    page_path: String(req.body?.pagePath || "").trim() || null,
    expected_behavior: String(req.body?.expectedBehavior || "").trim() || null,
    actual_behavior: actualBehavior,
    reproduction_steps: reproductionSteps,
    environment_label: String(req.body?.environmentLabel || "").trim() || null,
    screenshot_url: String(req.body?.screenshotUrl || "").trim() || null,
    admin_notes: null,
  };

  const { data: bugReportRow, error: bugReportError } = await supabaseAdmin
    .from("bug_reports")
    .insert(insertPayload)
    .select("*")
    .single();

  if (bugReportError) {
    if (isMissingTableError(bugReportError, "bug_reports")) {
      return res.status(501).json({
        error: "Bug reports table is not configured.",
        code: "BUG_REPORTS_TABLE_MISSING",
      });
    }
    return res.status(500).json({ error: bugReportError.message });
  }

  const { data: adminProfiles, error: adminProfilesError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (adminProfilesError && !isMissingTableError(adminProfilesError, "profiles")) {
    console.error("bug report admin profile lookup failed:", adminProfilesError.message);
  }

  await insertNotifications(
    (adminProfiles || []).map((admin) => ({
      user_id: admin.id,
      type: "bug-opened",
      title: "New beta bug report",
      body: `${actingProfile?.public_name || actingProfile?.name || actingUser.email || "A user"} reported: ${title}.`,
      entity_id: "/admin",
      read: false,
    })),
  );

  return res.json({ ok: true, bugReport: bugReportRow });
});

app.post("/api/admin/site-settings", requireAllowedOrigin, adminApiRateLimit, async (req, res) => {
  const context = await getActingUserContext(req);
  if (!context.ok) {
    return res.status(context.status).json({ error: context.error });
  }

  const { actingUser, actingProfile } = context;
  if (actingProfile?.role !== "admin") {
    return res.status(403).json({ error: "Only admins can update storefront settings." });
  }

  const payload = req.body?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return res.status(400).json({ error: "A settings payload is required." });
  }

  const audit = req.body?.audit && typeof req.body.audit === "object" ? req.body.audit : {};
  const { data: siteSettingsRow, error: siteSettingsError } = await supabaseAdmin
    .from("site_settings")
    .upsert({
      key: "global",
      payload,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (siteSettingsError) {
    if (isMissingTableError(siteSettingsError, "site_settings")) {
      return res.status(501).json({ error: "Site settings table is not configured." });
    }

    return res.status(500).json({ error: siteSettingsError.message });
  }

  const auditResult = await insertAdminAuditLog({
    actorId: actingUser.id,
    actorName:
      actingProfile?.public_name ||
      actingProfile?.name ||
      actingProfile?.username ||
      actingUser.email ||
      "Admin",
    action: String(audit.action || "storefront-settings"),
    title: String(audit.title || "Updated storefront settings"),
    details: audit.details ? String(audit.details) : null,
    targetType: "storefront",
  });

  if (!auditResult.ok) {
    console.error("admin site settings audit log insert failed:", auditResult.error);
  }

  return res.json({ ok: true, settings: siteSettingsRow });
});

app.post("/api/admin/delete-user", requireAllowedOrigin, adminApiRateLimit, async (req, res) => {
  const context = await getActingUserContext(req);
  if (!context.ok) {
    return res.status(context.status).json({ error: context.error });
  }
  const { actingUser, actingProfile } = context;
  const targetUserId = String(req.body?.userId || "").trim();

  if (!targetUserId) {
    return res.status(400).json({ error: "Missing userId." });
  }

  const isSelfDelete = actingUser.id === targetUserId;
  const isAdminDelete = actingProfile?.role === "admin";

  if (!isSelfDelete && !isAdminDelete) {
    return res.status(403).json({ error: "You do not have permission to delete this account." });
  }

  const { data: targetProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, name, public_name")
    .eq("id", targetUserId)
    .maybeSingle();

  const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const actorName =
    actingProfile?.public_name || actingProfile?.name || actingUser.email || "Admin";
  const targetName =
    targetProfile?.public_name || targetProfile?.name || targetUserId;

  const auditInsert = await insertAdminAuditLog({
    actorId: actingUser.id,
    actorName,
    action: isSelfDelete ? "self-delete" : "admin-delete-user",
    title: isSelfDelete ? "Deleted own account" : "Deleted user account",
    details: `${targetName} (${targetUserId})`,
    targetId: targetUserId,
    targetType: "profile",
  });

  if (!auditInsert.ok) {
    console.error("admin audit log insert failed:", auditInsert.error);
  }

  return res.json({ ok: true });
});

app.get("/api/live/exchange-rate", publicApiRateLimit, async (_req, res) => {
  const exchangeRate = await getUsdToCadRate();

  res.json({
    usdToCadRate: exchangeRate.usdToCadRate,
    asOf: exchangeRate.asOf,
    source: exchangeRate.source,
  });
});

app.post("/api/auth/guard", requireAllowedOrigin, async (req, res) => {
  const action = String(req.body?.action || "").trim().toLowerCase();
  const config = AUTH_GUARD_LIMITS[action];

  if (!config) {
    return res.status(400).json({
      error: "Unsupported auth guard action.",
    });
  }

  const ipResult = consumeRateLimit({
    ...config.ip,
    key: getClientKey(req),
  });

  if (!ipResult.ok) {
    res.setHeader("Retry-After", String(ipResult.retryAfterSeconds));
    return res.status(429).json({
      error: "Too many authentication attempts. Please wait a bit and try again.",
    });
  }

  const identifier = normalizeRateLimitIdentifier(req.body?.identifier);
  if (!identifier) {
    return res.json({ ok: true });
  }

  const identifierResult = consumeRateLimit({
    ...config.identifier,
    key: identifier,
  });

  if (!identifierResult.ok) {
    res.setHeader("Retry-After", String(identifierResult.retryAfterSeconds));
    return res.status(429).json({
      error: "Too many authentication attempts for this account. Please wait a bit and try again.",
    });
  }

  return res.json({ ok: true });
});

app.get("/api/live/image-proxy", heavyApiRateLimit, async (req, res) => {
  const rawUrl = String(req.query.url || "").trim();

  if (!rawUrl) {
    return res.status(400).json({ error: "Image URL is required." });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: "Invalid image URL." });
  }

  if (!IMAGE_PROXY_ALLOWED_HOSTS.has(parsedUrl.hostname)) {
    return res.status(403).json({ error: "Image host is not allowed." });
  }

  const allowedPath =
    parsedUrl.hostname === "en.onepiece-cardgame.com"
      ? parsedUrl.pathname.startsWith("/images/cardlist/card/")
      : parsedUrl.hostname === "storage.googleapis.com"
        ? parsedUrl.pathname.startsWith("/images.pricecharting.com/")
        : false;

  if (!allowedPath) {
    return res.status(403).json({ error: "Image path is not allowed." });
  }

  try {
    const response = await fetchWithTimeout(parsedUrl.toString(), {
      headers: {
        Accept: "image/*",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Image fetch failed." });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    return res.send(buffer);
  } catch (error) {
    return res.status(502).json({ error: error.message || "Image proxy failed." });
  }
});

app.get("/api/live/search", heavyApiRateLimit, async (req, res) => {
  const game = normalizeGameName(req.query.game);
  const language = normalizeLanguage(req.query.language);
  const query = String(req.query.query || "").trim();
  const limit = Math.min(Number(req.query.limit || 24), 24);

  if (!query) {
    return res.json({
      providerLabel: "Live Search",
      results: [],
      note: "Enter a card name to search the live database.",
    });
  }

  try {
    const exchangeRate = await getUsdToCadRate();
    let providerLabel = "Live Search";
    let results = [];
    let note = `Market values are shown in CAD using USD/CAD ${exchangeRate.usdToCadRate}. Source-backed recent solds only appear when the source exposes them.`;

    if (game === "pokemon" && language === "japanese") {
      providerLabel = "PriceCharting";
      results = await searchJapanesePokemonCards(query, limit, exchangeRate.usdToCadRate);
      note = `Japanese Pokemon results are sourced from PriceCharting and normalized to CAD using USD/CAD ${exchangeRate.usdToCadRate}.`;
    } else if (game === "pokemon") {
      providerLabel = "TCGdex / TCGplayer";
      results = await searchPokemonCards(query, limit, exchangeRate.usdToCadRate);
    } else if (game === "magic") {
      providerLabel = language === "japanese" ? "Scryfall (Japanese)" : "Scryfall";
      results = await searchMagicCards(query, limit, exchangeRate.usdToCadRate, language);
    } else if (game === "one-piece" && language === "japanese") {
      providerLabel = "PriceCharting";
      results = await searchJapaneseOnePieceCards(query, limit, exchangeRate.usdToCadRate);
      note = `Japanese One Piece results are sourced from PriceCharting and normalized to CAD using USD/CAD ${exchangeRate.usdToCadRate}.`;
    } else if (game === "one-piece") {
      providerLabel = "OPTCG API";
      results = await searchOnePieceCards(query, limit, exchangeRate.usdToCadRate);
    } else if (game === "dragon-ball-fusion-world") {
      if (tcgplayerEnabled()) {
        providerLabel = "TCGplayer API";
        results = await searchTcgplayerCatalog(game, query, limit);
      } else {
        try {
          providerLabel = "TCGCSV / TCGplayer";
          results = await searchTcgcsvCatalog(game, query, limit);
          note = `Fusion World results are using TCGplayer market data through TCGCSV and normalized to CAD using USD/CAD ${exchangeRate.usdToCadRate}.`;
        } catch {
          providerLabel = "Fusion World Official";
          results = await searchFusionWorldCards(query, limit);
          note =
            "Fusion World results are sourced from the official card database. Market pricing is not exposed by the official source yet.";
        }
      }
    } else if (game === "union-arena") {
      if (tcgplayerEnabled()) {
        providerLabel = "TCGplayer API";
        results = await searchTcgplayerCatalog(game, query, limit);
      } else {
        try {
          providerLabel = "TCGCSV / TCGplayer";
          results = await searchTcgcsvCatalog(game, query, limit);
          note = `Union Arena results are using TCGplayer market data through TCGCSV and normalized to CAD using USD/CAD ${exchangeRate.usdToCadRate}.`;
        } catch {
          providerLabel = "Union Arena Official";
          results = await searchUnionArenaCards(query, limit);
          note =
            "Union Arena results are sourced from the official card list. Market pricing is not exposed by the official source yet.";
        }
      }
    } else {
      note = "Live search is currently implemented for Pokemon, Magic, One Piece, Fusion World, and Union Arena.";
    }

    results = results.map((result) => ({
      ...result,
      imageUrl: rewriteSearchImageUrlForClient(req, result.imageUrl),
    }));

    return res.json({
      providerLabel,
      results,
      note,
      exchangeRate,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

app.get("/api/live/source-sales", heavyApiRateLimit, async (req, res) => {
  const game = normalizeGameName(req.query.game);
  const language = normalizeLanguage(req.query.language);
  const title = String(req.query.title || "").trim();
  const setName = String(req.query.setName || "").trim();
  const printLabel = String(req.query.printLabel || "").trim();
  const rarity = String(req.query.rarity || "").trim();

  if (!game || !title) {
    return res.status(400).json({
      error: "Game and title are required.",
    });
  }

  const exchangeRate = await getUsdToCadRate();

  try {
    const result = await lookupPriceChartingSalesForPrinting(
      {
        game,
        language,
        title,
        setName,
        printLabel,
        rarity,
      },
      exchangeRate.usdToCadRate,
    );

    return res.json({
      providerLabel: result?.providerLabel || "PriceCharting",
      result,
      note: result
        ? `Recent solds are sourced from PriceCharting and normalized to CAD using USD/CAD ${exchangeRate.usdToCadRate}.`
        : "No recent solds were found from the source for this printing.",
      exchangeRate,
    });
  } catch (error) {
    return res.json({
      providerLabel: "PriceCharting",
      result: null,
      note: `Recent sold lookup is currently unavailable for this printing. ${error.message}`,
      exchangeRate,
    });
  }
});

app.get("/api/events/local", publicApiRateLimit, async (req, res) => {
  const forceSync = String(req.query.sync || "").trim() === "1";

  try {
    const cachedSync = await readCachedSyncedEvents();
    if (cachedSync.ok && cachedSync.events.length && !cachedSync.stale && !forceSync) {
      return res.json({
        events: cachedSync.events,
        sources: [
          {
            id: "cache",
            label: "Database cache",
            mode: "Preloaded",
            note: "Serving preloaded event rows from Supabase.",
          },
        ],
        fetchedAt: new Date().toISOString(),
      });
    }

    const results = await Promise.all([
      fetchFusionEvents(),
      fetchAMuseEvents(),
      fetchArcticEvents(),
      fetchGalaxyStatus(),
    ]);

    const liveEvents = sortEventsAscending(
      uniqueBy(
        results.flatMap((result) => result.events || []),
        (event) => buildEventExternalKey(event),
      ),
    );

    if (!liveEvents.length && cachedSync.ok && cachedSync.events.length) {
      return res.json({
        events: cachedSync.events,
        sources: results.map((result) => result.status).concat([
          {
            id: "cache",
            label: "Database cache",
            mode: "Fallback",
            note: "Live pulls returned no events, so the last cached schedule is being served.",
          },
        ]),
        fetchedAt: new Date().toISOString(),
      });
    }

    const syncedResult = await syncExternalEventsToSupabase(liveEvents).catch((error) => ({
      ok: false,
      skipped: true,
      reason: error.message,
    }));

    const events =
      syncedResult?.ok && Array.isArray(syncedResult.events) && syncedResult.events.length
        ? syncedResult.events
        : liveEvents;

    return res.json({
      events,
      sources: results.map((result) => result.status).concat(
        syncedResult?.ok
          ? [
              {
                id: "cache",
                label: "Database cache",
                mode: "Synced",
                note: `Persisted ${events.length} upcoming event row(s) to Supabase.`,
              },
            ]
          : syncedResult?.skipped
            ? [
                {
                  id: "cache",
                  label: "Database cache",
                  mode: "Sync skipped",
                  note: syncedResult.reason,
                },
              ]
            : [],
      ),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

app.get("/api/bootstrap", publicApiRateLimit, async (_req, res) => {
  if (!supabaseReadClient) {
    return res.status(503).json({
      error: "Supabase bootstrap client is not configured.",
    });
  }

  try {
    const manualEventsPromise = (async () => {
      let result = await supabaseReadClient
        .from("manual_events")
        .select(MANUAL_EVENT_BOOTSTRAP_COLUMNS);
      if (
        result.error &&
        (isMissingColumnError(result.error, "source_type") ||
          isMissingColumnError(result.error, "source_url"))
      ) {
        result = await supabaseReadClient
          .from("manual_events")
          .select(MANUAL_EVENT_BOOTSTRAP_FALLBACK_COLUMNS);
      }
      return result;
    })();

    const [listingsRes, manualEventsRes, siteSettingsRes] = await Promise.all([
      supabaseReadClient.from("listings").select(LISTING_BOOTSTRAP_COLUMNS),
      manualEventsPromise,
      supabaseReadClient
        .from("site_settings")
        .select("key,payload")
        .eq("key", "global")
        .maybeSingle(),
    ]);

    if (listingsRes.error) {
      throw listingsRes.error;
    }
    if (manualEventsRes.error) {
      throw manualEventsRes.error;
    }
    if (siteSettingsRes.error && !isMissingTableError(siteSettingsRes.error, "site_settings")) {
      throw siteSettingsRes.error;
    }

    const listings = listingsRes.data || [];
    const sellerIds = [...new Set(listings.map((listing) => String(listing.seller_id || "")).filter(Boolean))];

    let profiles = [];
    if (sellerIds.length) {
      const profilesRes = await selectProfilesWithFallback(
        (columns) => supabaseReadClient.from("profiles").select(columns).in("id", sellerIds),
        PROFILE_BOOTSTRAP_COLUMNS,
      );

      if (profilesRes.error) {
        throw profilesRes.error;
      }
      profiles = profilesRes.data || [];
    }

    return res.json({
      users: profiles,
      listings,
      manualEvents: manualEventsRes.data || [],
      siteSettings: siteSettingsRes.data || null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Marketplace bootstrap failed.",
    });
  }
});

app.listen(port, () => {
  console.log(`TCGWPG proxy listening on http://localhost:${port}`);
});
