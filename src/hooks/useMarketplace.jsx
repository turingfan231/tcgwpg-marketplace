import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  defaultWishlist,
  gameCatalog,
  listings as seedListings,
  manualEvents as seedManualEvents,
  neighborhoods,
  reviews as seedReviews,
  sellerBadgeCatalog,
  sellers as seedUsers,
} from "../data/mockData";
import { storeProfiles } from "../data/storefrontData";
import { normalizeCustomTheme } from "../data/themePresets";
import {
  buildClearedDraftState,
  buildNextDraftState,
  normalizeDraftCollection,
  resolveActiveDraft,
  sortListingDrafts,
} from "../lib/listingDrafts";
import { retryStorageUpload } from "../lib/mediaUploads";
import {
  getOfferCounterpartyId,
  resolveOfferResponse,
} from "../lib/offerState";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { fetchMarketplaceBootstrap, syncLocalEventsCache } from "../services/cardDatabase";
import { average, formatCurrency, slugify } from "../utils/formatters";

const MarketplaceContext = createContext(null);
const SEARCH_STORAGE_KEY = "tcgwpg.globalSearch";
const TOAST_SEEN_STORAGE_PREFIX = "tcgwpg.seenToasts";
const HIDDEN_THREADS_STORAGE_PREFIX = "tcgwpg.hiddenThreads";
const VIEWED_LISTINGS_STORAGE_KEY = "tcgwpg.viewedListings.v1";
const MARKETPLACE_CACHE_KEY = "tcgwpg.marketplaceCache";
const MARKETPLACE_CACHE_VERSION = 2;
const SITE_SETTINGS_STORAGE_KEY = "tcgwpg.siteSettings";
const LOCAL_AUTH_STORAGE_KEY = "tcgwpg.localAuthUserId";
const COLLECTION_STORAGE_PREFIX = "tcgwpg.collection";
const AUDIT_LOG_STORAGE_KEY = "tcgwpg.adminAuditLog";
const VIEW_AS_STORAGE_KEY = "tcgwpg.viewAsUserId";
const STORE_FOLLOW_STORAGE_PREFIX = "tcgwpg.storeFollows";
const EVENT_REMINDER_STORAGE_PREFIX = "tcgwpg.eventReminders";
const EVENT_ATTENDANCE_STORAGE_PREFIX = "tcgwpg.eventAttendance";
const EVENT_SYNC_STORAGE_KEY = "tcgwpg.eventsLastSync";
const SUPPORTED_GAME_SLUGS = new Set([
  "magic",
  "pokemon",
  "one-piece",
  "dragon-ball-fusion-world",
  "union-arena",
]);
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
const MEDIA_BUCKET = "listing-media";
const FOREGROUND_REFRESH_MS = 12000;
const RICH_MESSAGE_PREFIX = "[[tcgwpg-message]]";
const DEFAULT_SITE_SETTINGS = {
  themePreset: "collector-strip",
  customTheme: normalizeCustomTheme({
    primary: "#b11d23",
  accent: "#c62828",
  }),
  homeHero: {
    featuredListingId: null,
    pinnedEventId: null,
    spotlightGameSlug: null,
  },
  homeSections: {
    showHero: true,
    showPromo: true,
    showBestSellers: true,
    showFreshFeed: true,
    showFollowedFeed: true,
    showGameShelves: true,
    showEvents: true,
    showTrustedSellers: true,
    showStores: true,
  },
};

const PROFILE_CRITICAL_COLUMNS = [
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
const PROFILE_FULL_COLUMNS = `${PROFILE_CRITICAL_COLUMNS},email,bio`;
const LISTING_SUMMARY_COLUMNS = [
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
const LISTING_FULL_COLUMNS = [
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
const REVIEW_COLUMNS = [
  "id",
  "seller_id",
  "author_id",
  "author_name",
  "rating",
  "comment",
  "image_url",
  "created_at",
].join(",");
const MANUAL_EVENT_SUMMARY_COLUMNS = [
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
const MANUAL_EVENT_FULL_COLUMNS = [
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
const MANUAL_EVENT_FALLBACK_COLUMNS = MANUAL_EVENT_SUMMARY_COLUMNS;
const OFFER_COLUMNS = [
  "id",
  "listing_id",
  "seller_id",
  "buyer_id",
  "offer_type",
  "cash_amount",
  "trade_items",
  "note",
  "status",
  "last_actor_id",
  "created_at",
  "updated_at",
].join(",");
const REPORT_COLUMNS = ["id", "listing_id", "seller_id", "reporter_id", "reason", "details", "status", "resolution_thread_id", "created_at", "updated_at"].join(",");
const BUG_REPORT_COLUMNS = [
  "id",
  "reporter_id",
  "title",
  "area",
  "severity",
  "status",
  "page_path",
  "expected_behavior",
  "actual_behavior",
  "reproduction_steps",
  "environment_label",
  "screenshot_url",
  "admin_notes",
  "created_at",
  "updated_at",
].join(",");
const NOTIFICATION_COLUMNS = ["id", "user_id", "type", "title", "body", "entity_id", "read", "created_at"].join(",");
const THREAD_COLUMNS = ["id", "listing_id", "participant_ids", "hidden_by", "created_at", "updated_at"].join(",");
const MESSAGE_COLUMNS = ["id", "thread_id", "sender_id", "body", "read_by", "created_at"].join(",");
const SITE_SETTINGS_COLUMNS = ["key", "payload"].join(",");
const SEARCH_HISTORY_COLUMNS = ["id", "query", "game", "source", "created_at"].join(",");
const COLLECTION_ITEM_COLUMNS = [
  "id",
  "game",
  "language",
  "title",
  "set_name",
  "print_label",
  "rarity",
  "condition",
  "quantity",
  "market_price",
  "market_price_currency",
  "source_label",
  "image_url",
  "notes",
  "added_at",
  "updated_at",
].join(",");
const EVENT_PREF_COLUMNS = ["event_id", "reminder_enabled", "attendance_intent"].join(",");
const EVENT_ATTENDANCE_COLUMNS = ["event_id", "user_id", "attendance_intent"].join(",");
const AUDIT_LOG_COLUMNS = [
  "id",
  "actor_id",
  "actor_name",
  "action",
  "title",
  "details",
  "target_id",
  "target_type",
  "created_at",
].join(",");

const CLIENT_MUTATION_LIMITS = {
  login: { windowMs: 60 * 1000, limit: 6 },
  signup: { windowMs: 10 * 60 * 1000, limit: 3 },
  passwordReset: { windowMs: 10 * 60 * 1000, limit: 3 },
  messageSend: { windowMs: 12 * 1000, limit: 6 },
  createOffer: { windowMs: 30 * 1000, limit: 4 },
  respondToOffer: { windowMs: 30 * 1000, limit: 6 },
  submitReport: { windowMs: 5 * 60 * 1000, limit: 4 },
  submitBugReport: { windowMs: 5 * 60 * 1000, limit: 5 },
};

function readSearchStorage() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(SEARCH_STORAGE_KEY) || "";
}

function safeLocalStorageGet(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeSearchStorage(value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SEARCH_STORAGE_KEY, value);
  } catch {
    // Ignore storage write failures in constrained/private browser contexts.
  }
}

function getToastSeenStorageKey(userId) {
  return `${TOAST_SEEN_STORAGE_PREFIX}.${userId}`;
}

function readToastSeenStorage(userId) {
  if (typeof window === "undefined" || !userId) {
    return new Set();
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(getToastSeenStorageKey(userId)) || "[]",
    );
    return new Set(Array.isArray(stored) ? stored.filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

function writeToastSeenStorage(userId, ids) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  try {
    window.localStorage.setItem(
      getToastSeenStorageKey(userId),
      JSON.stringify([...ids].slice(-250)),
    );
  } catch {
    // Ignore storage write failures in constrained/private browser contexts.
  }
}

function readMarketplaceCache() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(MARKETPLACE_CACHE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (parsed.version !== MARKETPLACE_CACHE_VERSION) {
      window.localStorage.removeItem(MARKETPLACE_CACHE_KEY);
      return null;
    }

    if (isSupabaseConfigured && parsed.source !== "remote") {
      window.localStorage.removeItem(MARKETPLACE_CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function readLocalAuthUserId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(LOCAL_AUTH_STORAGE_KEY) || null;
}

function writeLocalAuthUserId(userId) {
  if (typeof window === "undefined") {
    return;
  }

  if (!userId) {
    window.localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, String(userId));
}

function getHiddenThreadsStorageKey(userId) {
  return `${HIDDEN_THREADS_STORAGE_PREFIX}.${userId}`;
}

function readHiddenThreadsStorage(userId) {
  if (typeof window === "undefined" || !userId) {
    return {};
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(getHiddenThreadsStorageKey(userId)) || "{}",
    );
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

function writeHiddenThreadsStorage(userId, value) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  try {
    window.localStorage.setItem(getHiddenThreadsStorageKey(userId), JSON.stringify(value || {}));
  } catch {
    // Ignore storage write failures in constrained/private browser contexts.
  }
}

function getCollectionStorageKey(userId) {
  return `${COLLECTION_STORAGE_PREFIX}.${userId}`;
}

function readCollectionStorage(userId) {
  if (typeof window === "undefined" || !userId) {
    return [];
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(getCollectionStorageKey(userId)) || "[]");
    return Array.isArray(stored) ? stored.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeCollectionStorage(userId, value) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  try {
    window.localStorage.setItem(getCollectionStorageKey(userId), JSON.stringify(value || []));
  } catch {
    // Ignore storage write failures in constrained/private browser contexts.
  }
}

function readAuditLogStorage() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(AUDIT_LOG_STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeAuditLogStorage(value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify((value || []).slice(0, 250)));
  } catch {
    // Ignore storage write failures in constrained/private browser contexts.
  }
}

function getStoreFollowStorageKey(userId) {
  return `${STORE_FOLLOW_STORAGE_PREFIX}.${userId}`;
}

function readStoreFollowStorage(userId) {
  if (typeof window === "undefined" || !userId) {
    return [];
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(getStoreFollowStorageKey(userId)) || "[]");
    return Array.isArray(stored) ? stored.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeStoreFollowStorage(userId, value) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  try {
    window.localStorage.setItem(
      getStoreFollowStorageKey(userId),
      JSON.stringify((value || []).filter(Boolean)),
    );
  } catch {
    // Ignore storage write failures in constrained/private browser contexts.
  }
}

function getEventReminderStorageKey(userId) {
  return `${EVENT_REMINDER_STORAGE_PREFIX}.${userId}`;
}

function readEventReminderStorage(userId) {
  if (typeof window === "undefined" || !userId) {
    return [];
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(getEventReminderStorageKey(userId)) || "[]",
    );
    return Array.isArray(stored) ? stored.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeEventReminderStorage(userId, value) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  try {
    window.localStorage.setItem(
      getEventReminderStorageKey(userId),
      JSON.stringify((value || []).filter(Boolean)),
    );
  } catch {
    // Ignore storage write failures in constrained/private browser contexts.
  }
}

function getEventAttendanceStorageKey(userId) {
  return `${EVENT_ATTENDANCE_STORAGE_PREFIX}.${userId}`;
}

function readEventAttendanceStorage(userId) {
  if (typeof window === "undefined" || !userId) {
    return {};
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(getEventAttendanceStorageKey(userId)) || "{}",
    );
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

function writeEventAttendanceStorage(userId, value) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  try {
    window.localStorage.setItem(
      getEventAttendanceStorageKey(userId),
      JSON.stringify(value && typeof value === "object" ? value : {}),
    );
  } catch {
    // Ignore storage write failures in constrained/private browser contexts.
  }
}

function readEventSyncTimestamp() {
  if (typeof window === "undefined") {
    return 0;
  }

  const rawValue = Number(window.localStorage.getItem(EVENT_SYNC_STORAGE_KEY) || 0);
  return Number.isFinite(rawValue) ? rawValue : 0;
}

function writeEventSyncTimestamp(value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(EVENT_SYNC_STORAGE_KEY, String(Number(value) || Date.now()));
  } catch {
    // Ignore storage write failures in constrained/private browser contexts.
  }
}

function readViewAsStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(VIEW_AS_STORAGE_KEY) || null;
}

function writeViewAsStorage(userId) {
  if (typeof window === "undefined") {
    return;
  }

  if (userId) {
    window.localStorage.setItem(VIEW_AS_STORAGE_KEY, userId);
    return;
  }

  window.localStorage.removeItem(VIEW_AS_STORAGE_KEY);
}

function normalizeSiteSettings(settings) {
  const homeHero = settings?.homeHero || {};
  const homeSections = settings?.homeSections || {};
  return {
    themePreset: String(settings?.themePreset || DEFAULT_SITE_SETTINGS.themePreset),
    customTheme: normalizeCustomTheme(settings?.customTheme || DEFAULT_SITE_SETTINGS.customTheme),
    homeHero: {
      featuredListingId: homeHero.featuredListingId || null,
      pinnedEventId: homeHero.pinnedEventId || null,
      spotlightGameSlug: homeHero.spotlightGameSlug || null,
    },
    homeSections: {
      showHero: homeSections.showHero !== false,
      showPromo: homeSections.showPromo !== false,
      showBestSellers: homeSections.showBestSellers !== false,
      showFreshFeed: homeSections.showFreshFeed !== false,
      showFollowedFeed: homeSections.showFollowedFeed !== false,
      showGameShelves: homeSections.showGameShelves !== false,
      showEvents: homeSections.showEvents !== false,
      showTrustedSellers: homeSections.showTrustedSellers !== false,
      showStores: homeSections.showStores !== false,
    },
  };
}

function readSiteSettingsStorage() {
  if (typeof window === "undefined") {
    return DEFAULT_SITE_SETTINGS;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SITE_SETTINGS_STORAGE_KEY) || "null");
    return normalizeSiteSettings(parsed || DEFAULT_SITE_SETTINGS);
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

function readViewedListingIds() {
  if (typeof window === "undefined") {
    return new Set();
  }

  const stored = safeLocalStorageGet(VIEWED_LISTINGS_STORAGE_KEY, []);
  if (!Array.isArray(stored)) {
    return new Set();
  }

  return new Set(stored.map((value) => String(value)));
}

function writeSiteSettingsStorage(settings) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      SITE_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizeSiteSettings(settings)),
    );
  } catch {
    // Ignore storage write failures in constrained/private browser contexts.
  }
}

function trimCacheArray(items, limit) {
  return Array.isArray(items) ? items.filter(Boolean).slice(0, limit) : [];
}

function buildMarketplaceCacheSnapshot(snapshot) {
  return {
    version: MARKETPLACE_CACHE_VERSION,
    source: isSupabaseConfigured ? "remote" : "seed",
    users: trimCacheArray(snapshot.users, 80).map((user) => ({
      id: user.id,
      role: user.role,
      name: user.name,
      username: user.username,
      neighborhood: user.neighborhood,
      badges: Array.isArray(user.badges) ? user.badges.slice(0, 8) : [],
      verified: user.verified,
      accountStatus: user.accountStatus,
      responseTime: user.responseTime,
      completedDeals: user.completedDeals,
      avatarUrl: user.avatarUrl || "",
      defaultListingGame: user.defaultListingGame || "",
      followedSellerIds: Array.isArray(user.followedSellerIds)
        ? user.followedSellerIds.slice(0, 200)
        : [],
      createdAt: user.createdAt || "",
      onboardingComplete: Boolean(user.onboardingComplete),
      publicName: user.publicName,
      firstName: user.firstName,
      initials: user.initials,
    })),
    listings: trimCacheArray(snapshot.listings, 120).map((listing) => ({
      id: listing.id,
      sellerId: listing.sellerId,
      type: listing.type,
      game: listing.game,
      gameSlug: listing.gameSlug,
      title: listing.title,
      price: listing.price,
      priceCurrency: listing.priceCurrency,
      previousPrice: listing.previousPrice,
      marketPrice: listing.marketPrice,
      marketPriceCurrency: listing.marketPriceCurrency,
      condition: listing.condition,
      neighborhood: listing.neighborhood,
      postalCode: listing.postalCode,
      acceptsTrade: Boolean(listing.acceptsTrade),
      listingFormat: listing.listingFormat,
      quantity: listing.quantity,
      description: listing.description || "",
      imageUrl: listing.imageUrl || "",
      primaryImage: listing.primaryImage || listing.imageUrl || "",
      imageGallery: trimCacheArray(listing.imageGallery, 2),
      status: listing.status,
      featured: Boolean(listing.featured),
      flagged: Boolean(listing.flagged),
      views: listing.views || 0,
      offers: listing.offers || 0,
      createdAt: listing.createdAt || "",
      updatedAt: listing.updatedAt || "",
    })),
    wishlist: trimCacheArray(snapshot.wishlist, 120),
    reviews: [],
    bugReports: [],
    manualEvents: trimCacheArray(snapshot.manualEvents, 30).map((event) => ({
      id: event.id,
      title: event.title,
      store: event.store,
      date: event.date || event.dateStr || "",
      dateStr: event.dateStr || event.date || "",
      time: event.time || "",
      game: event.game || "",
      neighborhood: event.neighborhood || "",
      note: event.note || "",
      published: event.published !== false,
      source: event.source || "",
      sourceType: event.sourceType || "",
      sourceUrl: event.sourceUrl || "",
    })),
    listingDrafts: trimCacheArray(snapshot.listingDrafts, 4),
    activeDraftId: snapshot.activeDraftId || null,
    siteSettings: normalizeSiteSettings(snapshot.siteSettings || DEFAULT_SITE_SETTINGS),
  };
}

function writeMarketplaceCache(snapshot) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cachedSnapshot = buildMarketplaceCacheSnapshot(snapshot);
    window.localStorage.setItem(MARKETPLACE_CACHE_KEY, JSON.stringify(cachedSnapshot));
  } catch (error) {
    if (error?.name === "QuotaExceededError") {
      window.localStorage.removeItem(MARKETPLACE_CACHE_KEY);
      return;
    }

    throw error;
  }
}

async function apiRequest(path, init = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url || path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    error.retryAfter = response.headers.get("Retry-After");
    error.data = data;
    throw error;
  }

  return data;
}

function withAsyncTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

async function runServerAuthGuard(action, identifier) {
  if (!API_BASE_URL) {
    return { ok: true, skipped: true };
  }

  try {
    await apiRequest("/api/auth/guard", {
      method: "POST",
      body: JSON.stringify({
        action,
        identifier,
      }),
    });

    return { ok: true };
  } catch (error) {
    if (error?.status === 429) {
      return {
        ok: false,
        error:
          error?.message ||
          "Too many authentication attempts. Please wait a bit and try again.",
      };
    }

    return { ok: true, skipped: true };
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePostalCode(value) {
  const normalized = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);

  if (normalized.length < 3) {
    return normalized;
  }

  return `${normalized} XXX`;
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 24);
}

function parseMeetupPreferenceValue(value = "") {
  const rawValue = String(value || "").trim();
  const prefixMatch = rawValue.match(/^\[\[spots:([^\]]*)\]\]\s*/i);
  const prefixSpots = prefixMatch?.[1]
    ? prefixMatch[1]
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const noteText = prefixMatch ? rawValue.replace(prefixMatch[0], "").trim() : rawValue;
  const normalizedNote = noteText.toLowerCase();
  const inferredSpots = storeProfiles
    .filter(
      (store) =>
        normalizedNote.includes(store.name.toLowerCase()) ||
        normalizedNote.includes(store.shortName.toLowerCase()),
    )
    .map((store) => store.slug);

  return {
    notes: noteText,
    trustedMeetupSpots: [...new Set([...prefixSpots, ...inferredSpots])].slice(0, 4),
  };
}

function buildMeetupPreferenceValue(notes = "", spotIds = []) {
  const cleanedNotes = String(notes || "").trim();
  const normalizedSpotIds = [...new Set((spotIds || []).filter(Boolean))];
  const prefix = normalizedSpotIds.length ? `[[spots:${normalizedSpotIds.join(",")}]]` : "";
  return [prefix, cleanedNotes].filter(Boolean).join(" ").trim();
}

function estimateResponseRate(user, reviewCount = 0) {
  const base =
    {
      "< 15 min": 97,
      "~ 30 min": 92,
      "~ 1 hour": 86,
      "Same day": 74,
    }[String(user?.responseTime || "").trim()] || 78;
  const dealBonus = Math.min(Math.round(Number(user?.completedDeals || 0) / 4), 8);
  const reviewBonus = Math.min(reviewCount * 2, 6);
  const moderationPenalty = user?.accountStatus === "suspended" ? 20 : 0;
  return Math.max(32, Math.min(99, base + dealBonus + reviewBonus - moderationPenalty));
}

function buildAccountAgeLabel(createdAt) {
  const createdTime = new Date(createdAt || Date.now()).getTime();
  const days = Math.max(1, Math.floor((Date.now() - createdTime) / 86400000));

  if (days >= 365) {
    return `${Math.max(1, Math.floor(days / 365))}y`;
  }

  if (days >= 30) {
    return `${Math.max(1, Math.floor(days / 30))}mo`;
  }

  return `${days}d`;
}

function buildRiskLabel({ verified, moderationActions, responseRate, completedDeals }) {
  if (!verified || moderationActions >= 2 || responseRate < 65) {
    return "Review closely";
  }

  if (moderationActions === 0 && responseRate >= 88 && completedDeals >= 10) {
    return "Low risk";
  }

  return "Standard";
}

function getFileExtension(name, mimeType = "") {
  const explicitExtension = String(name || "").split(".").pop();
  if (explicitExtension && explicitExtension !== name) {
    return explicitExtension.toLowerCase();
  }

  const mimeSuffix = String(mimeType || "").split("/").pop();
  return mimeSuffix ? mimeSuffix.toLowerCase() : "jpg";
}

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("column") &&
    message.includes(String(columnName || "").toLowerCase()) &&
    (message.includes("does not exist") || message.includes("schema cache"))
  );
}

function omitMissingProfileColumns(payload, error) {
  const nextPayload = { ...payload };

  if (isMissingColumnError(error, "username")) {
    delete nextPayload.username;
  }

  if (isMissingColumnError(error, "avatar_url")) {
    delete nextPayload.avatar_url;
  }

  if (isMissingColumnError(error, "default_listing_game")) {
    delete nextPayload.default_listing_game;
  }

  if (isMissingColumnError(error, "followed_seller_ids")) {
    delete nextPayload.followed_seller_ids;
  }

  if (isMissingColumnError(error, "followed_store_slugs")) {
    delete nextPayload.followed_store_slugs;
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
    .filter((column) => !missingProfileColumns.some((missing) => isMissingColumnError(error, missing) && column === missing))
    .join(",");
}

async function selectWithProfileFallback(buildQuery, initialColumns) {
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

function omitMissingOfferColumns(payload, error) {
  const nextPayload = { ...payload };

  if (isMissingColumnError(error, "last_actor_id")) {
    delete nextPayload.last_actor_id;
  }

  return nextPayload;
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

function shouldFallbackToClientMutation(error, codes = []) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("not configured") ||
    message.includes("api server is not configured") ||
    codes.some((code) => message.includes(String(code).toLowerCase()))
  );
}

function buildInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getFirstName(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0] || "Seller";
}

function getPublicName(name) {
  return getFirstName(name);
}

function titleCaseWords(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function sameParticipantSet(left = [], right = []) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((value, index) => value === rightSorted[index]);
}

function buildOfferMessage({
  buyerName,
  offerType,
  cashAmount,
  tradeItems = [],
  note = "",
  status = "pending",
}) {
  const typeLabel =
    offerType === "cash-trade"
      ? "Cash + trade"
      : offerType === "trade"
        ? "Trade"
        : "Cash";
  const segments = [`Offer ${status}: ${typeLabel}`];

  if (offerType !== "trade" && Number(cashAmount) > 0) {
    segments.push(formatCurrency(cashAmount, "CAD"));
  }

  if (offerType !== "cash" && tradeItems.length) {
    segments.push(`Trade: ${tradeItems.join(", ")}`);
  }

  if (note) {
    segments.push(`Note: ${note}`);
  }

  return `${buyerName || "Buyer"} | ${segments.join(" | ")}`;
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { password, ...safeUser } = user;
  return safeUser;
}

function formatCadPrice(value, currency = "CAD") {
  return formatCurrency(value, currency);
}

function formatTimeAgo(dateValue) {
  if (!dateValue) {
    return "Just listed";
  }

  const timestamp = new Date(dateValue).getTime();
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function normalizeListingMedia(record) {
  const primaryImage = record.primaryImage || record.imageUrl || "";
  const conditionImages = Array.isArray(record.conditionImages)
    ? record.conditionImages.filter(Boolean)
    : [];
  const imageGallery = Array.isArray(record.imageGallery)
    ? record.imageGallery.filter(Boolean)
    : [primaryImage, ...conditionImages].filter(Boolean);

  return {
    ...record,
    primaryImage,
    imageUrl: primaryImage,
    conditionImages,
    imageGallery: imageGallery.length ? imageGallery : [primaryImage].filter(Boolean),
  };
}

function normalizeSupportedGameSlug(value) {
  const rawSlug = slugify(String(value || ""));

  if (SUPPORTED_GAME_SLUGS.has(rawSlug)) {
    return rawSlug;
  }

  if (
    rawSlug === "dragon-ball-super-fusion-world" ||
    rawSlug === "dragonball-super-fusion-world" ||
    rawSlug === "fusion-world" ||
    rawSlug === "dbs-fusion-world"
  ) {
    return "dragon-ball-fusion-world";
  }

  if (rawSlug === "one-piece-card-game") {
    return "one-piece";
  }

  return rawSlug;
}

function isSupportedListing(listing) {
  const gameSlug = normalizeSupportedGameSlug(listing?.gameSlug || listing?.game || "");
  return SUPPORTED_GAME_SLUGS.has(gameSlug);
}

function normalizeUserRecord(user) {
  const meetupData = parseMeetupPreferenceValue(user.meetupPreferences || "");
  const username = normalizeUsername(user.username || "");
  const publicName = username || user.publicName || getPublicName(user.name);
  const favoriteGames = Array.isArray(user.favoriteGames) ? user.favoriteGames : [];
  const followedSellerIds = Array.isArray(user.followedSellerIds) ? user.followedSellerIds : [];
  const followedStoreSlugs = Array.isArray(user.followedStoreSlugs) ? user.followedStoreSlugs : [];
  const defaultListingGame = user.defaultListingGame || favoriteGames[0] || "Pokemon";
  const trustedMeetupSpots =
    Array.isArray(user.trustedMeetupSpots) && user.trustedMeetupSpots.length
      ? user.trustedMeetupSpots
      : meetupData.trustedMeetupSpots;

  return {
    role: "seller",
    badges: [],
    verified: false,
    accountStatus: "active",
    bannerStyle: "neutral",
    responseTime: "~ 1 hour",
    completedDeals: 0,
    avatarUrl: "",
    ...user,
    createdAt: user.createdAt || new Date().toISOString(),
    email: normalizeEmail(user.email),
    postalCode: normalizePostalCode(user.postalCode),
    favoriteGames,
    followedSellerIds,
    followedStoreSlugs,
    trustedMeetupSpots,
    meetupPreferences: meetupData.notes,
    defaultListingGame,
    username,
    firstName: getFirstName(user.name),
    publicName,
    initials: user.initials || buildInitials(user.name),
    onboardingComplete:
      user.onboardingComplete ??
      Boolean(
        username &&
          (favoriteGames.length || defaultListingGame) &&
          user.neighborhood &&
          normalizePostalCode(user.postalCode).length >= 3 &&
          (trustedMeetupSpots.length || meetupData.notes),
      ),
  };
}

function normalizeListingRecord(listing) {
  const normalizedGameSlug = normalizeSupportedGameSlug(
    listing.gameSlug || listing.game || "",
  );
  const normalizedPrice = Number(listing.price) || 0;
  const marketPriceCad =
    listing.marketPriceCurrency === "USD"
      ? Number(((Number(listing.marketPrice) || 0) * 1.38).toFixed(2))
      : Number(listing.marketPrice) || null;
  const updatedStamp = listing.updatedAt || listing.createdAt || new Date().toISOString();

  return normalizeListingMedia({
    quantity: 1,
    listingFormat: "single",
    bundleItems: [],
    priceCurrency: "CAD",
    marketPriceCurrency: listing.marketPriceCurrency || "CAD",
    status: "active",
    acceptsTrade: false,
    featured: false,
    flagged: false,
    adminNotes: "",
    previousPrice: null,
    priceHistory: [],
    editHistory: [],
    comparisonPoints: [],
    ...listing,
    gameSlug: normalizedGameSlug,
    price: normalizedPrice,
    priceCad: normalizedPrice,
    marketPriceCad,
    postalCode: normalizePostalCode(listing.postalCode),
    sortTimestamp: new Date(updatedStamp).getTime(),
    timeAgo: listing.timeAgo || formatTimeAgo(updatedStamp),
  });
}

function normalizeOfferRecord(offer) {
  return {
    tradeItems: [],
    cashAmount: 0,
    offerType: "cash",
    status: "pending",
    lastActorId: null,
    ...offer,
  };
}

function normalizeReportRecord(report) {
  return {
    status: "open",
    resolutionThreadId: null,
    ...report,
  };
}

function normalizeBugReportRecord(report) {
  return {
    status: "open",
    severity: "medium",
    area: "general",
    adminNotes: "",
    expectedBehavior: "",
    actualBehavior: "",
    reproductionSteps: "",
    pagePath: "",
    screenshotUrl: "",
    environmentLabel: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...report,
  };
}

function normalizeCollectionRecord(item) {
  return {
    id: item.id || `collection-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    game: item.game || "Pokemon",
    language: item.language || "english",
    title: item.title || "Untitled card",
    setName: item.setName || "",
    printLabel: item.printLabel || "",
    rarity: item.rarity || "",
    condition: item.condition || "NM",
    quantity: Math.max(1, Number(item.quantity) || 1),
    marketPrice: Number(item.marketPrice) || 0,
    marketPriceCurrency: item.marketPriceCurrency || "CAD",
    sourceLabel: item.sourceLabel || item.providerLabel || item.provider || "Manual entry",
    imageUrl: item.imageUrl || "",
    notes: item.notes || "",
    addedAt: item.addedAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.addedAt || new Date().toISOString(),
  };
}

function fromCollectionItemRow(row) {
  return normalizeCollectionRecord({
    id: row.id,
    game: row.game,
    language: row.language,
    title: row.title,
    setName: row.set_name,
    printLabel: row.print_label,
    rarity: row.rarity,
    condition: row.condition,
    quantity: row.quantity,
    marketPrice: row.market_price,
    marketPriceCurrency: row.market_price_currency,
    sourceLabel: row.source_label,
    imageUrl: row.image_url,
    notes: row.notes,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

function toCollectionItemPayload(item, userId, { includeId = true } = {}) {
  const payload = {
    user_id: userId,
    game: item.game,
    language: item.language,
    title: item.title,
    set_name: item.setName,
    print_label: item.printLabel,
    rarity: item.rarity,
    condition: item.condition,
    quantity: Math.max(1, Number(item.quantity) || 1),
    market_price: Number(item.marketPrice) || 0,
    market_price_currency: item.marketPriceCurrency || "CAD",
    source_label: item.sourceLabel || "Manual entry",
    image_url: item.imageUrl || "",
    notes: item.notes || "",
    added_at: item.addedAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString(),
  };

  if (includeId && isUuid(item.id)) {
    payload.id = item.id;
  }

  return payload;
}

function normalizeEventPreferences(rows) {
  const reminderIds = [];
  const attendance = {};

  (rows || []).forEach((row) => {
    const eventId = String(row?.event_id || "").trim();
    if (!eventId) {
      return;
    }

    if (row.reminder_enabled) {
      reminderIds.push(eventId);
    }

    const intent = String(row.attendance_intent || "").trim().toLowerCase();
    if (intent) {
      attendance[eventId] = intent;
    }
  });

  return { reminderIds, attendance };
}

function normalizeEventAttendanceFeed(rows, users = []) {
  const usersById = new Map((users || []).map((user) => [String(user.id || ""), user]));
  const next = {};

  (rows || []).forEach((row) => {
    const eventId = String(row?.event_id || "").trim();
    const userId = String(row?.user_id || "").trim();
    const intent = String(row?.attendance_intent || "").trim().toLowerCase();
    if (!eventId || !userId || !intent) {
      return;
    }

    const user = usersById.get(userId);
    if (!user) {
      return;
    }

    if (!next[eventId]) {
      next[eventId] = [];
    }

    next[eventId].push({
      id: userId,
      intent,
      user,
    });
  });

  Object.keys(next).forEach((eventId) => {
    next[eventId] = next[eventId].sort((left, right) =>
      String(left.user?.publicName || left.user?.name || "").localeCompare(
        String(right.user?.publicName || right.user?.name || ""),
      ),
    );
  });

  return next;
}

function normalizeAuditRecord(entry) {
  return {
    id: entry.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actorId: entry.actorId || "",
    actorName: entry.actorName || "Admin",
    action: entry.action || "updated",
    title: entry.title || "Admin action",
    details: entry.details || "",
    targetId: entry.targetId || "",
    targetType: entry.targetType || "record",
    createdAt: entry.createdAt || new Date().toISOString(),
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Image preview failed."));
    reader.readAsDataURL(file);
  });
}

function createObjectUrl(file) {
  return URL.createObjectURL(file);
}

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image preview failed."));
    image.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Image compression failed."));
    }, type, quality);
  });
}

async function compressChatImage(file, options = {}) {
  const maxDimension = Number(options.maxDimension || 1800);
  const targetBytes = Number(options.targetBytes || 2_400_000);
  const hardLimitBytes = Number(options.hardLimitBytes || 5_500_000);
  if (!file || !String(file.type || "").startsWith("image/")) {
    return file;
  }

  if (String(file.type || "").includes("gif") || Number(file.size || 0) <= targetBytes) {
    return file;
  }

  const objectUrl = createObjectUrl(file);
  try {
    const image = await loadImageElement(objectUrl);
    const sourceWidth = image.naturalWidth || image.width || 1;
    const sourceHeight = image.naturalHeight || image.height || 1;
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, width, height);

    let blob = null;
    for (const quality of [0.86, 0.78, 0.68, 0.58]) {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (blob.size <= targetBytes) {
        break;
      }
    }

    if (!blob || blob.size > hardLimitBytes) {
      return file;
    }

    const compressedName = `${String(file.name || "photo").replace(/\.[^.]+$/, "")}.jpg`;
    return new File([blob], compressedName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function buildMessageBody({ text = "", attachments = [] }) {
  const normalizedText = String(text || "");
  const normalizedAttachments = Array.isArray(attachments)
    ? attachments
        .filter(Boolean)
        .map((attachment) => ({
          id: attachment.id || `attachment-${Math.random().toString(36).slice(2, 8)}`,
          url: attachment.url || "",
          name: attachment.name || "Image",
          type: attachment.type || "image",
        }))
        .filter((attachment) => attachment.url)
    : [];

  if (!normalizedAttachments.length) {
    return normalizedText;
  }

  return `${RICH_MESSAGE_PREFIX}${JSON.stringify({
    text: normalizedText,
    attachments: normalizedAttachments,
  })}`;
}

function parseMessageBody(body) {
  const rawBody = String(body || "");
  if (!rawBody.startsWith(RICH_MESSAGE_PREFIX)) {
    return {
      rawBody,
      text: rawBody,
      attachments: [],
      preview: rawBody,
      isRich: false,
    };
  }

  try {
    const payload = JSON.parse(rawBody.slice(RICH_MESSAGE_PREFIX.length));
    const text = String(payload?.text || "");
    const attachments = Array.isArray(payload?.attachments)
      ? payload.attachments.filter(Boolean).map((attachment, index) => ({
          id: attachment.id || `attachment-${index + 1}`,
          url: attachment.url || "",
          name: attachment.name || "Image",
          type: attachment.type || "image",
        }))
      : [];
    const preview = text || (attachments.length ? `${attachments.length} photo${attachments.length === 1 ? "" : "s"}` : "");
    return {
      rawBody,
      text,
      attachments,
      preview,
      isRich: true,
    };
  } catch {
    return {
      rawBody,
      text: rawBody,
      attachments: [],
      preview: rawBody,
      isRich: false,
    };
  }
}

function mapMessageRow(message) {
  const parsedBody = parseMessageBody(message.body);
  return {
    id: message.id,
    senderId: message.sender_id,
    body: parsedBody.preview,
    rawBody: parsedBody.rawBody,
    text: parsedBody.text,
    attachments: parsedBody.attachments,
    isRich: parsedBody.isRich,
    sentAt: message.created_at,
    readBy: message.read_by || [],
  };
}

function mapThreadRow(threadRow, existingThread = null) {
  return {
    id: threadRow.id,
    participantIds: threadRow.participant_ids || existingThread?.participantIds || [],
    listingId: threadRow.listing_id,
    hiddenBy: threadRow.hidden_by || existingThread?.hiddenBy || {},
    createdAt: threadRow.created_at || existingThread?.createdAt || new Date().toISOString(),
    updatedAt: threadRow.updated_at || existingThread?.updatedAt || new Date().toISOString(),
    messages: existingThread?.messages || [],
  };
}

function normalizeNotificationRecord(notification) {
  return {
    read: false,
    archived: false,
    ...notification,
  };
}

function normalizeManualEventRecord(event) {
  return {
    source: event.source || "Admin override",
    sourceType: event.sourceType || "manual",
    published: event.published ?? true,
    ...event,
  };
}

function fromProfileRow(row) {
  return normalizeUserRecord({
    id: row.id,
    role: row.role,
    name: row.name,
    username: row.username || "",
    defaultListingGame: row.defaultListingGame || row.default_listing_game || "",
    avatarUrl: row.avatar_url || "",
    email: row.email,
    neighborhood: row.neighborhood,
    postalCode: row.postal_code,
    bio: row.bio,
    badges: row.badges || [],
    verified: row.verified,
    accountStatus: row.account_status,
    bannerStyle: row.banner_style,
    favoriteGames: row.favorite_games || [],
    followedSellerIds: row.followed_seller_ids || [],
    followedStoreSlugs: row.followed_store_slugs || [],
    meetupPreferences: row.meetup_preferences,
    responseTime: row.response_time,
    completedDeals: row.completed_deals || 0,
    createdAt: row.created_at,
    onboardingComplete: row.onboarding_complete,
  });
}

function fromListingRow(row) {
  return normalizeListingRecord({
    id: row.id,
    sellerId: row.seller_id,
    type: row.type,
    game: row.game,
    gameSlug: row.game_slug,
    title: row.title,
    price: row.price,
    priceCurrency: row.price_currency,
    previousPrice: row.previous_price,
    marketPrice: row.market_price,
    marketPriceCurrency: row.market_price_currency,
    condition: row.condition,
    neighborhood: row.neighborhood,
    postalCode: row.postal_code,
    acceptsTrade: row.accepts_trade,
    listingFormat: row.listing_format,
    quantity: row.quantity,
    bundleItems: row.bundle_items || [],
    description: row.description,
    imageUrl: row.primary_image,
    primaryImage: row.primary_image,
    imageGallery: row.image_gallery || [],
    conditionImages: row.condition_images || [],
    status: row.status,
    featured: row.featured,
    flagged: row.flagged,
    adminNotes: row.admin_notes,
    views: row.views || 0,
    offers: row.offers || 0,
    priceHistory: row.price_history || [],
    editHistory: row.edit_history || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function fromReviewRow(row) {
  return {
    id: row.id,
    sellerId: row.seller_id,
    authorId: row.author_id,
    author: row.author_name,
    rating: row.rating,
    comment: row.comment,
    imageUrl: row.image_url || "",
    createdAt: String(row.created_at || "").slice(0, 10),
  };
}

function fromOfferRow(row) {
  return normalizeOfferRecord({
    id: row.id,
    listingId: row.listing_id,
    sellerId: row.seller_id,
    buyerId: row.buyer_id,
    offerType: row.offer_type,
    cashAmount: Number(row.cash_amount) || 0,
    tradeItems: row.trade_items || [],
    note: row.note,
    status: row.status,
    lastActorId:
      row.last_actor_id ||
      (row.status === "pending" ? row.buyer_id : row.seller_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function fromReportRow(row) {
  return normalizeReportRecord({
    id: row.id,
    listingId: row.listing_id,
    sellerId: row.seller_id,
    reporterId: row.reporter_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    resolutionThreadId: row.resolution_thread_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function fromNotificationRow(row) {
  return normalizeNotificationRecord({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    entityId: row.entity_id,
    read: row.read,
    createdAt: row.created_at,
  });
}

function fromBugReportRow(row) {
  return normalizeBugReportRecord({
    id: row.id,
    reporterId: row.reporter_id,
    title: row.title,
    area: row.area,
    severity: row.severity,
    status: row.status,
    pagePath: row.page_path || "",
    expectedBehavior: row.expected_behavior || "",
    actualBehavior: row.actual_behavior || "",
    reproductionSteps: row.reproduction_steps || "",
    environmentLabel: row.environment_label || "",
    screenshotUrl: row.screenshot_url || "",
    adminNotes: row.admin_notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function fromEventRow(row) {
  return normalizeManualEventRecord({
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
  });
}

function fromAuditRow(row) {
  return normalizeAuditRecord({
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    title: row.title,
    details: row.details,
    targetId: row.target_id,
    targetType: row.target_type,
    createdAt: row.created_at,
  });
}

function fromSiteSettingsRow(row) {
  return normalizeSiteSettings(row?.payload || DEFAULT_SITE_SETTINGS);
}

function mergeAuthedProfileMetadata(profileRow, authUser) {
  if (!profileRow) {
    return profileRow;
  }

  if (String(profileRow.id || "") !== String(authUser?.id || "")) {
    return profileRow;
  }

  return {
    ...profileRow,
    username:
      profileRow.username ||
      normalizeUsername(authUser?.user_metadata?.username) ||
      "",
    avatar_url: profileRow.avatar_url || authUser?.user_metadata?.avatar_url || "",
    defaultListingGame:
      profileRow.defaultListingGame ||
      profileRow.default_listing_game ||
      authUser?.user_metadata?.default_listing_game ||
      "",
    postal_code:
      profileRow.postal_code ||
      normalizePostalCode(authUser?.user_metadata?.postal_code) ||
      "",
    followed_seller_ids:
      profileRow.followed_seller_ids || authUser?.user_metadata?.followed_seller_ids || [],
    followed_store_slugs:
      profileRow.followed_store_slugs || authUser?.user_metadata?.followed_store_slugs || [],
    meetup_preferences:
      profileRow.meetup_preferences ||
      buildMeetupPreferenceValue(
        authUser?.user_metadata?.meetup_preferences_text || "",
        authUser?.user_metadata?.trusted_meetup_spots || [],
      ),
    created_at: profileRow.created_at || authUser?.created_at || new Date().toISOString(),
    onboarding_complete:
      profileRow.onboarding_complete ?? authUser?.user_metadata?.onboarding_complete ?? false,
  };
}

function toListingPayload(payload, seller) {
  const price = Number(payload.price) || 0;
  const marketPrice = Number(payload.marketPrice) || null;
  const now = new Date().toISOString();
  const normalizedGameSlug = normalizeSupportedGameSlug(payload.game);

  return {
    seller_id: seller.id,
    type: payload.type || "WTS",
    game: payload.game,
    game_slug: normalizedGameSlug,
    title: payload.title,
    price,
    price_currency: "CAD",
    previous_price: payload.previousPrice || null,
    market_price: marketPrice,
    market_price_currency: payload.marketPriceCurrency || "CAD",
    condition: payload.condition || "NM",
    neighborhood: payload.neighborhood || seller.neighborhood,
    postal_code: normalizePostalCode(payload.postalCode || seller.postalCode),
    accepts_trade: Boolean(payload.acceptsTrade),
    listing_format: payload.listingFormat || "single",
    quantity: Number(payload.quantity) || 1,
    bundle_items: payload.bundleItems || [],
    description: payload.description || "",
    primary_image: payload.imageUrl || "",
    image_gallery: payload.imageGallery || [payload.imageUrl].filter(Boolean),
    condition_images: payload.conditionImages || [],
    status: payload.status || "active",
    featured: Boolean(payload.featured),
    flagged: Boolean(payload.flagged),
    admin_notes: payload.adminNotes || "",
    views: payload.views || 0,
    offers: payload.offers || 0,
    price_history: payload.priceHistory || [],
    edit_history: payload.editHistory || [],
    updated_at: now,
  };
}

function buildThreadMap(threadRows, messageRows) {
  return (threadRows || []).map((thread) => ({
    ...mapThreadRow(thread),
    messages: (messageRows || [])
      .filter((message) => message.thread_id === thread.id)
      .sort(
        (left, right) =>
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
      )
      .map(mapMessageRow),
  }));
}

function buildSeedState() {
  return {
    users: seedUsers.map(normalizeUserRecord),
    listings: seedListings.map(normalizeListingRecord).filter(isSupportedListing),
    reviews: seedReviews,
    wishlist: defaultWishlist,
      threads: [],
      offers: [],
      reports: [],
      bugReports: [],
      notifications: [],
    manualEvents: seedManualEvents.map(normalizeManualEventRecord),
    listingDrafts: [],
    activeDraftId: null,
    searchHistory: [],
    collectionItems: [],
    adminAuditLog: [],
    siteSettings: DEFAULT_SITE_SETTINGS,
  };
}

export function MarketplaceProvider({ children }) {
  const seedState = useMemo(() => buildSeedState(), []);
  const cachedState = useMemo(() => readMarketplaceCache(), []);
  const hasUsableCache = useMemo(
    () =>
      Boolean(
        cachedState &&
          (cachedState.listings?.length ||
            cachedState.users?.length ||
            cachedState.manualEvents?.length),
      ),
    [cachedState],
  );
  const [users, setUsers] = useState(() =>
    isSupabaseConfigured ? cachedState?.users || [] : seedState.users,
  );
  const [currentUserId, setCurrentUserId] = useState(() =>
    isSupabaseConfigured ? null : readLocalAuthUserId(),
  );
  const [listings, setListings] = useState(() =>
    isSupabaseConfigured ? cachedState?.listings || [] : seedState.listings,
  );
  const [wishlist, setWishlist] = useState(() =>
    isSupabaseConfigured ? cachedState?.wishlist || [] : seedState.wishlist,
  );
  const [reviews, setReviews] = useState(() =>
    isSupabaseConfigured ? cachedState?.reviews || [] : seedState.reviews,
  );
  const [threads, setThreads] = useState(() =>
    isSupabaseConfigured ? cachedState?.threads || [] : seedState.threads,
  );
  const [hiddenThreadMap, setHiddenThreadMap] = useState({});
  const [manualEvents, setManualEvents] = useState(() =>
    isSupabaseConfigured ? cachedState?.manualEvents || [] : seedState.manualEvents,
  );
  const [offers, setOffers] = useState(() =>
    isSupabaseConfigured ? cachedState?.offers || [] : seedState.offers,
  );
  const [reports, setReports] = useState(() =>
    isSupabaseConfigured ? cachedState?.reports || [] : seedState.reports,
  );
  const [bugReports, setBugReports] = useState(() =>
    isSupabaseConfigured ? cachedState?.bugReports || [] : seedState.bugReports,
  );
  const [notifications, setNotifications] = useState(() =>
    isSupabaseConfigured ? cachedState?.notifications || [] : seedState.notifications,
  );
  const [listingDrafts, setListingDrafts] = useState(() =>
    isSupabaseConfigured ? cachedState?.listingDrafts || [] : cachedState?.listingDrafts || seedState.listingDrafts,
  );
  const [activeDraftId, setActiveDraftId] = useState(() =>
    isSupabaseConfigured ? cachedState?.activeDraftId || null : cachedState?.activeDraftId || seedState.activeDraftId,
  );
  const [searchHistory, setSearchHistory] = useState(() =>
    isSupabaseConfigured ? cachedState?.searchHistory || [] : cachedState?.searchHistory || seedState.searchHistory,
  );
  const [collectionItems, setCollectionItems] = useState([]);
  const [adminAuditLog, setAdminAuditLog] = useState(() => readAuditLogStorage());
  const [viewAsUserId, setViewAsUserId] = useState(() => readViewAsStorage());
  const [followedStoreSlugs, setFollowedStoreSlugs] = useState([]);
  const [eventReminderIds, setEventReminderIds] = useState([]);
  const [eventAttendance, setEventAttendance] = useState({});
  const [eventAttendanceFeed, setEventAttendanceFeed] = useState({});
  const [siteSettings, setSiteSettings] = useState(() =>
    normalizeSiteSettings(
      (isSupabaseConfigured ? cachedState?.siteSettings : seedState.siteSettings) ||
        readSiteSettingsStorage(),
    ),
  );
  const [globalSearch, setGlobalSearchState] = useState(() => readSearchStorage());
  const [isCreateListingOpen, setCreateListingOpen] = useState(false);
  const [createListingPreset, setCreateListingPreset] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [loading, setLoading] = useState(
    Boolean(isSupabaseConfigured && !hasUsableCache),
  );
  const [toastItems, setToastItems] = useState([]);
  const seenNotificationIdsRef = useRef(new Set());
  const seededRealtimeStateRef = useRef(false);
  const mutationLimitRef = useRef(new Map());
  const listingsRef = useRef(listings);
  const viewedListingsRef = useRef(readViewedListingIds());
  const pendingViewedListingsRef = useRef(new Set());
  const profileBootColumnsRef = useRef(PROFILE_CRITICAL_COLUMNS);
  const profileFullColumnsRef = useRef(PROFILE_FULL_COLUMNS);
  const eventsSyncRunningRef = useRef(false);
  const secondaryStateRef = useRef({
    reviewsLoaded: Boolean(cachedState?.reviews?.length),
    workspaceUserId: null,
    eventAttendanceLoaded: false,
    adminUserId: null,
    directoryProfilesLoaded: false,
  });
  const [bootProgress, setBootProgress] = useState(hasUsableCache ? 0.34 : 0.08);
  const [bootStatus, setBootStatus] = useState(
    hasUsableCache ? "Restoring cached marketplace" : "Starting TCG WPG",
  );

  const currentUser = useMemo(
    () => sanitizeUser(users.find((user) => user.id === currentUserId)) || null,
    [currentUserId, users],
  );

  useEffect(() => {
    listingsRef.current = listings;
  }, [listings]);

  const currentUserRecord = useMemo(
    () => users.find((user) => user.id === currentUserId) || null,
    [currentUserId, users],
  );

  useEffect(() => {
    if (isSupabaseConfigured) {
      return;
    }

    writeLocalAuthUserId(currentUserId);
  }, [currentUserId]);
  const viewedUserRecord = useMemo(
    () =>
      currentUserRecord?.role === "admin" && viewAsUserId
        ? users.find((user) => user.id === viewAsUserId) || null
        : null,
    [currentUserRecord?.role, users, viewAsUserId],
  );
  const isViewingAs = Boolean(viewedUserRecord);
  const isSuspended = currentUserRecord?.accountStatus === "suspended";
  const isBetaTester = Boolean(
    currentUserRecord?.badges?.includes("beta") || currentUserRecord?.role === "admin",
  );
  const followedSellerIds = currentUserRecord?.followedSellerIds || [];
  const followedStoreSet = useMemo(() => new Set(followedStoreSlugs), [followedStoreSlugs]);
  const eventReminderIdSet = useMemo(() => new Set(eventReminderIds), [eventReminderIds]);
  const listingDraft = useMemo(
    () => resolveActiveDraft(listingDrafts, activeDraftId),
    [activeDraftId, listingDrafts],
  );
  const currentUserDrafts = useMemo(
    () => sortListingDrafts(listingDrafts),
    [listingDrafts],
  );
  const followedSellerSet = useMemo(() => new Set(followedSellerIds), [followedSellerIds]);
  const collectionSummary = useMemo(() => {
    const totalItems = collectionItems.reduce(
      (sum, item) => sum + Math.max(1, Number(item.quantity) || 1),
      0,
    );
    const estimatedValue = collectionItems.reduce(
      (sum, item) =>
        sum + (Number(item.marketPrice) || 0) * Math.max(1, Number(item.quantity) || 1),
      0,
    );
    const gameBreakdown = collectionItems.reduce((accumulator, item) => {
      const key = normalizeSupportedGameSlug(item.game);
      accumulator[key] = (accumulator[key] || 0) + Math.max(1, Number(item.quantity) || 1);
      return accumulator;
    }, {});

    return {
      totalEntries: collectionItems.length,
      totalItems,
      estimatedValue: Number(estimatedValue.toFixed(2)),
      gameBreakdown,
    };
  }, [collectionItems]);

  const reviewBadgeCatalog = sellerBadgeCatalog;
  const reviewStatsBySeller = useMemo(() => {
    const stats = {};

    reviews.forEach((review) => {
      const sellerId = String(review.sellerId || "");
      if (!sellerId) {
        return;
      }
      if (!stats[sellerId]) {
        stats[sellerId] = { count: 0, ratings: [] };
      }
      stats[sellerId].count += 1;
      stats[sellerId].ratings.push(review.rating);
    });

    return stats;
  }, [reviews]);
  const listingStatsBySeller = useMemo(() => {
    const stats = {};

    listings.forEach((listing) => {
      const sellerId = String(listing.sellerId || "");
      if (!sellerId) {
        return;
      }
      if (!stats[sellerId]) {
        stats[sellerId] = { activeCount: 0, flaggedOrRemovedCount: 0 };
      }
      if (String(listing.status || "") === "active") {
        stats[sellerId].activeCount += 1;
      }
      if (listing.flagged || String(listing.status || "") === "removed") {
        stats[sellerId].flaggedOrRemovedCount += 1;
      }
    });

    return stats;
  }, [listings]);
  const openReportCountBySeller = useMemo(() => {
    const stats = {};

    reports.forEach((report) => {
      const sellerId = String(report.sellerId || "");
      if (!sellerId || String(report.status || "").toLowerCase() === "dismissed") {
        return;
      }
      stats[sellerId] = (stats[sellerId] || 0) + 1;
    });

    return stats;
  }, [reports]);

  const sellerMap = useMemo(() => {
    const map = {};

    users.forEach((user) => {
      const userId = String(user.id || "");
      const reviewStats = reviewStatsBySeller[userId] || { count: 0, ratings: [] };
      const listingStats = listingStatsBySeller[userId] || {
        activeCount: 0,
        flaggedOrRemovedCount: 0,
      };
      const moderationActions =
        listingStats.flaggedOrRemovedCount + (openReportCountBySeller[userId] || 0);
      const responseRate = estimateResponseRate(user, reviewStats.count);
      map[user.id] = {
        ...sanitizeUser(user),
        activeListingCount: listingStats.activeCount,
        followedByCurrentUser: followedSellerSet.has(user.id),
        reviewCount: reviewStats.count,
        overallRating: average(reviewStats.ratings),
        accountAgeLabel: buildAccountAgeLabel(user.createdAt),
        responseRate,
        moderationActions,
        riskLabel: buildRiskLabel({
          verified: user.verified,
          moderationActions,
          responseRate,
          completedDeals: Number(user.completedDeals || 0),
        }),
      };
    });

    return map;
  }, [followedSellerSet, listingStatsBySeller, openReportCountBySeller, reviewStatsBySeller, users]);
  const normalizedWishlist = useMemo(
    () =>
      wishlist.filter((listingId) =>
        listings.some(
          (listing) => listing.id === listingId && String(listing.status || "active") === "active",
        ),
      ),
    [listings, wishlist],
  );

  const enrichedListings = useMemo(
    () =>
      listings.map((listing) => ({
        ...listing,
        seller: sellerMap[listing.sellerId],
        wishlisted: normalizedWishlist.includes(listing.id),
      })),
    [listings, normalizedWishlist, sellerMap],
  );

  const activeListings = useMemo(
    () => enrichedListings.filter((listing) => listing.status === "active"),
    [enrichedListings],
  );

  const hotListings = useMemo(
    () =>
      [...activeListings]
        .sort(
          (left, right) =>
            Number(right.featured) - Number(left.featured) ||
            right.sortTimestamp - left.sortTimestamp ||
            right.views - left.views,
        )
        .slice(0, 8),
    [activeListings],
  );

  const featuredMerchandising = useMemo(() => {
    const featured = activeListings.filter((listing) => listing.featured);
    const fresh = [...activeListings]
      .sort((left, right) => right.sortTimestamp - left.sortTimestamp)
      .slice(0, 6);
    const highEnd = [...activeListings]
      .filter((listing) => listing.priceCad >= 150)
      .sort((left, right) => right.priceCad - left.priceCad)
      .slice(0, 6);
    const budget = [...activeListings]
      .filter((listing) => listing.priceCad <= 60)
      .sort((left, right) => left.priceCad - right.priceCad)
      .slice(0, 6);

    return {
      hotThisWeek: featured.slice(0, 6),
      freshlyPosted: fresh,
      highEndLocal: highEnd,
      budgetPickups: budget,
    };
  }, [activeListings]);

  const currentUserListings = useMemo(
    () =>
      enrichedListings.filter(
        (listing) =>
          String(listing.sellerId || listing.seller?.id || "") === String(currentUserId || "") &&
          listing.status !== "removed",
      ),
    [currentUserId, enrichedListings],
  );

  const wishlistedListings = useMemo(
    () => activeListings.filter((listing) => normalizedWishlist.includes(listing.id)),
    [activeListings, normalizedWishlist],
  );

  const threadsForCurrentUser = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    return [...threads]
      .filter((thread) => thread.participantIds.includes(currentUserId))
      .map((thread) => {
        const otherParticipants = thread.participantIds
          .filter((id) => id !== currentUserId)
          .map((id) => sellerMap[id])
          .filter(Boolean);
        const otherParticipant = otherParticipants[0] || null;
        const listing = enrichedListings.find((item) => item.id === thread.listingId) || null;
        const lastMessage = thread.messages[thread.messages.length - 1] || null;
        const unreadCount = thread.messages.filter(
          (message) =>
            message.senderId !== currentUserId &&
            !(message.readBy || []).includes(currentUserId),
        ).length;
        const participantLabel =
          otherParticipants
            .map((participant) => participant.publicName || participant.name)
            .join(", ") || "Conversation";

        return {
          ...thread,
          listing,
          otherParticipants,
          otherParticipant,
          participantLabel,
          lastMessage,
          unreadCount,
        };
      })
      .filter((thread) => {
        const hiddenAt = hiddenThreadMap[thread.id] || thread.hiddenBy?.[currentUserId];
        if (!hiddenAt) {
          return true;
        }

        return new Date(thread.updatedAt || 0).getTime() > new Date(hiddenAt).getTime();
      })
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
  }, [currentUserId, enrichedListings, hiddenThreadMap, sellerMap, threads]);

  const notificationsForCurrentUser = useMemo(
    () =>
      currentUserId
        ? notifications
            .filter((notification) => notification.userId === currentUserId)
            .sort(
              (left, right) =>
                new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
            )
        : [],
    [currentUserId, notifications],
  );

  const unreadNotificationCount = notificationsForCurrentUser.filter(
    (notification) => !notification.read,
  ).length;
  const unreadMessageCount = threadsForCurrentUser.reduce(
    (total, thread) => total + Number(thread.unreadCount || 0),
    0,
  );

  const offersForCurrentUser = useMemo(
    () =>
      offers
        .filter(
          (offer) => offer.buyerId === currentUserId || offer.sellerId === currentUserId,
        )
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        ),
    [currentUserId, offers],
  );

  const offersByListingId = useMemo(() => {
    const map = {};
    offers.forEach((offer) => {
      if (!map[offer.listingId]) {
        map[offer.listingId] = [];
      }
      map[offer.listingId].push(offer);
    });
    return map;
  }, [offers]);

  const openReports = useMemo(
    () =>
      reports
        .filter((report) => report.status === "open")
        .map((report) => ({
          ...report,
          reporter: sellerMap[report.reporterId] || null,
          reportedUser: sellerMap[report.sellerId] || null,
          listing:
            enrichedListings.find((listing) => listing.id === report.listingId) || null,
        })),
    [enrichedListings, reports, sellerMap],
  );

  const bugReportsForCurrentUser = useMemo(
    () =>
      currentUserId
        ? bugReports
            .filter((report) => report.reporterId === currentUserId)
            .sort(
              (left, right) =>
                new Date(right.updatedAt || right.createdAt).getTime() -
                new Date(left.updatedAt || left.createdAt).getTime(),
            )
        : [],
    [bugReports, currentUserId],
  );

  const adminBugReports = useMemo(
    () =>
      [...bugReports]
        .map((report) => ({
          ...report,
          reporter: sellerMap[report.reporterId] || null,
        }))
        .sort((left, right) => {
          const statusWeight = {
            open: 0,
            triaged: 1,
            "in-progress": 2,
            fixed: 3,
            closed: 4,
          };
          const severityWeight = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3,
          };

          return (
            (statusWeight[left.status] ?? 99) - (statusWeight[right.status] ?? 99) ||
            (severityWeight[left.severity] ?? 99) - (severityWeight[right.severity] ?? 99) ||
            new Date(right.updatedAt || right.createdAt).getTime() -
              new Date(left.updatedAt || left.createdAt).getTime()
          );
        }),
    [bugReports, sellerMap],
  );

  const topSearches = useMemo(() => {
    const counts = new Map();
    searchHistory.forEach((item) => {
      const key = String(item?.query || "").trim().toLowerCase();
      if (!key) {
        return;
      }
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return [...counts.entries()]
      .map(([query, count]) => ({ query, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);
  }, [searchHistory]);

  const adminOverview = useMemo(() => {
    const soldListings = listings.filter((listing) => listing.status === "sold").length;
    const flaggedListings = listings.filter((listing) => listing.flagged).length;
    const removedListings = listings.filter((listing) => listing.status === "removed").length;
    const featuredListings = listings.filter((listing) => listing.featured).length;
    const suspendedUsers = users.filter((user) => user.accountStatus === "suspended").length;
    const activeUsers = users.filter((user) => user.accountStatus === "active").length;
    const topNeighborhoodsMap = new Map();

    listings.forEach((listing) => {
      topNeighborhoodsMap.set(
        listing.neighborhood,
        (topNeighborhoodsMap.get(listing.neighborhood) || 0) + 1,
      );
    });

    const topNeighborhoods = [...topNeighborhoodsMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);

    const conversionRate =
      threads.length > 0 ? Number(((soldListings / threads.length) * 100).toFixed(1)) : 0;
    const flaggedRate =
      listings.length > 0 ? Number(((flaggedListings / listings.length) * 100).toFixed(1)) : 0;

    return {
      activeUsers,
      soldListings,
      flaggedListings,
      removedListings,
      featuredListings,
      suspendedUsers,
      manualEvents: manualEvents.length,
      openReports: openReports.length,
      openBugReports: bugReports.filter((report) => report.status !== "closed").length,
      conversionRate,
      flaggedRate,
      topNeighborhoods,
      topSearches,
    };
  }, [bugReports, listings, manualEvents.length, openReports.length, threads.length, topSearches, users]);

  const pushToast = useCallback((toast) => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToastItems((current) => [...current, { ...toast, id }].slice(-5));
    window.setTimeout(() => {
      setToastItems((current) => current.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToastItems((current) => current.filter((item) => item.id !== toastId));
  }, []);

  const guardMutationRate = useCallback((action, identifier = "global") => {
    const config = CLIENT_MUTATION_LIMITS[action];
    if (!config) {
      return { ok: true };
    }

    const key = `${action}:${identifier || "global"}`;
    const now = Date.now();
    const existing = mutationLimitRef.current.get(key);

    if (!existing || existing.resetAt <= now) {
      mutationLimitRef.current.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return { ok: true };
    }

    if (existing.count >= config.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      return {
        ok: false,
        error: `You're doing that a bit too fast. Try again in about ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}.`,
      };
    }

    existing.count += 1;
    mutationLimitRef.current.set(key, existing);
    return { ok: true };
  }, []);

  const pushAdminAuditEntry = useCallback(
    async ({
      action,
      title,
      details = "",
      targetId = "",
      targetType = "record",
      persist = true,
    }) => {
      if (!currentUserRecord || currentUserRecord.role !== "admin") {
        return;
      }

      const nextEntry = normalizeAuditRecord({
        actorId: currentUserRecord.id,
        actorName: currentUserRecord.publicName || currentUserRecord.name,
        action,
        title,
        details,
        targetId,
        targetType,
        createdAt: new Date().toISOString(),
      });

      setAdminAuditLog((current) =>
        [nextEntry, ...current.filter((entry) => entry.id !== nextEntry.id)].slice(0, 200),
      );

      if (!isSupabaseConfigured || !persist) {
        return;
      }

      const { data, error } = await supabase
        .from("admin_audit_log")
        .upsert({
          id: nextEntry.id,
          actor_id: nextEntry.actorId || null,
          actor_name: nextEntry.actorName,
          action: nextEntry.action,
          title: nextEntry.title,
          details: nextEntry.details,
          target_id: nextEntry.targetId || null,
          target_type: nextEntry.targetType,
          created_at: nextEntry.createdAt,
        })
        .select("*")
        .single();

      if (error && !isMissingTableError(error, "admin_audit_log")) {
        console.error("Failed to persist admin audit log entry:", error);
        return;
      }

      if (data) {
        const persistedEntry = fromAuditRow(data);
        setAdminAuditLog((current) =>
          [persistedEntry, ...current.filter((entry) => entry.id !== persistedEntry.id)].slice(
            0,
            200,
          ),
        );
      }
    },
    [currentUserRecord],
  );

  const startViewAs = useCallback(
    (userId) => {
      if (!currentUserRecord || currentUserRecord.role !== "admin") {
        return { ok: false, error: "Only admins can use view-as mode." };
      }

      if (!userId || String(userId) === String(currentUserRecord.id)) {
        setViewAsUserId(null);
        writeViewAsStorage(null);
        return { ok: true, viewingAs: null };
      }

      setViewAsUserId(userId);
      writeViewAsStorage(userId);
      return { ok: true, viewingAs: userId };
    },
    [currentUserRecord],
  );

  const stopViewAs = useCallback(() => {
    setViewAsUserId(null);
    writeViewAsStorage(null);
    return { ok: true };
  }, []);

  const ensureAccountActive = useCallback(
    (fallbackMessage) => {
      if (currentUserRecord?.accountStatus === "suspended") {
        const errorMessage =
          fallbackMessage ||
          "This account is suspended. Browsing is still available, but posting, messaging, offers, and moderation actions are disabled until the suspension is lifted.";
        pushToast({
          title: "Account suspended",
          body: errorMessage,
          href: "/account",
          tone: "rose",
        });
        return {
          ok: false,
          error: errorMessage,
        };
      }

      return { ok: true };
    },
    [currentUserRecord?.accountStatus, pushToast],
  );

  const updateBootState = useCallback((progress, label) => {
    setBootProgress((current) => Math.max(current, Number(progress) || 0));
    if (label) {
      setBootStatus(label);
    }
  }, []);

  const bootstrapProfile = useCallback(async (authUser, payload = {}) => {
    if (!isSupabaseConfigured || !authUser) {
      return null;
    }

    const profileResult = await selectWithProfileFallback(
      (columns) =>
        supabase
          .from("profiles")
          .select(columns)
          .eq("id", authUser.id)
          .maybeSingle(),
      profileFullColumnsRef.current,
    );

    const { data: existingProfile, error: profileError } = profileResult;
    if (!profileError && profileResult.resolvedColumns) {
      profileFullColumnsRef.current = profileResult.resolvedColumns;
    }

    if (profileError) {
      throw profileError;
    }

    if (existingProfile) {
      const desiredUsername =
          normalizeUsername(payload.username) ||
          normalizeUsername(authUser.user_metadata?.username) ||
          "";
        const desiredAvatarUrl = payload.avatarUrl || authUser.user_metadata?.avatar_url || "";
        const desiredMeetupValue = buildMeetupPreferenceValue(
          payload.meetupPreferences || authUser.user_metadata?.meetup_preferences_text || "",
          payload.trustedMeetupSpots || authUser.user_metadata?.trusted_meetup_spots || [],
        );

        if (
          (!existingProfile.username && desiredUsername) ||
          (!existingProfile.avatar_url && desiredAvatarUrl) ||
          (!existingProfile.meetup_preferences && desiredMeetupValue)
        ) {
          const nextProfilePatch = {
            updated_at: new Date().toISOString(),
          };

        if (!existingProfile.username && desiredUsername) {
          nextProfilePatch.username = desiredUsername;
        }

          if (!existingProfile.avatar_url && desiredAvatarUrl) {
            nextProfilePatch.avatar_url = desiredAvatarUrl;
          }

          if (!existingProfile.meetup_preferences && desiredMeetupValue) {
            nextProfilePatch.meetup_preferences = desiredMeetupValue;
          }

        const updateResult = await supabase
          .from("profiles")
          .update(nextProfilePatch)
          .eq("id", authUser.id)
          .select(PROFILE_FULL_COLUMNS)
          .single();

        if (!updateResult.error) {
          return fromProfileRow(updateResult.data);
        }

        if (
          !isMissingColumnError(updateResult.error, "username") &&
          !isMissingColumnError(updateResult.error, "avatar_url") &&
          !isMissingColumnError(updateResult.error, "followed_seller_ids") &&
          !isMissingColumnError(updateResult.error, "default_listing_game")
        ) {
          throw updateResult.error;
        }

        const fallbackPatch = omitMissingProfileColumns(nextProfilePatch, updateResult.error);
        if (Object.keys(fallbackPatch).length > 1) {
          const fallbackResult = await supabase
            .from("profiles")
            .update(fallbackPatch)
            .eq("id", authUser.id)
            .select(PROFILE_FULL_COLUMNS)
            .single();

          if (!fallbackResult.error) {
            return fromProfileRow(fallbackResult.data);
          }

          throw fallbackResult.error;
        }
      }

      return fromProfileRow(existingProfile);
    }

    const profilePayload = {
      id: authUser.id,
      role: "seller",
      name:
        payload.name ||
        authUser.user_metadata?.name ||
        authUser.email?.split("@")[0] ||
        "TCGWPG User",
      username:
        normalizeUsername(payload.username) ||
        normalizeUsername(authUser.user_metadata?.username) ||
        normalizeUsername(authUser.email?.split("@")[0]) ||
        "",
      avatar_url: payload.avatarUrl || authUser.user_metadata?.avatar_url || "",
      email: authUser.email,
      neighborhood:
        payload.neighborhood || authUser.user_metadata?.neighborhood || neighborhoods[1],
      postal_code: normalizePostalCode(
        payload.postalCode || authUser.user_metadata?.postal_code || "",
      ),
      bio: payload.bio || "New local seller on TCGWPG.",
      banner_style: "neutral",
      favorite_games: payload.favoriteGames || [],
        followed_seller_ids: payload.followedSellerIds || [],
        meetup_preferences: buildMeetupPreferenceValue(
          payload.meetupPreferences || authUser.user_metadata?.meetup_preferences_text || "Flexible local meetup.",
          payload.trustedMeetupSpots || authUser.user_metadata?.trusted_meetup_spots || [],
        ),
        response_time: payload.responseTime || "~ 1 hour",
        completed_deals: 0,
      };

    let insertResult = await supabase
      .from("profiles")
      .insert(profilePayload)
      .select(PROFILE_FULL_COLUMNS)
      .single();

    if (
      insertResult.error &&
      (isMissingColumnError(insertResult.error, "username") ||
        isMissingColumnError(insertResult.error, "avatar_url") ||
        isMissingColumnError(insertResult.error, "followed_seller_ids") ||
        isMissingColumnError(insertResult.error, "default_listing_game"))
    ) {
      const legacyProfilePayload = omitMissingProfileColumns(profilePayload, insertResult.error);
      insertResult = await supabase
        .from("profiles")
        .insert(legacyProfilePayload)
        .select(PROFILE_FULL_COLUMNS)
        .single();
    }

    const { data: insertedProfile, error: insertError } = insertResult;

    if (insertError) {
      throw insertError;
    }

    return fromProfileRow(insertedProfile);
  }, []);

  const loadSellerTrustData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return [];
    }

    const reviewsRes = await supabase.from("reviews").select(REVIEW_COLUMNS);
    if (reviewsRes.error) {
      throw reviewsRes.error;
    }

    const nextReviews = (reviewsRes.data || []).map(fromReviewRow);
    setReviews(nextReviews);
    secondaryStateRef.current.reviewsLoaded = true;
    return nextReviews;
  }, []);

  const loadDirectoryProfilesData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return [];
    }

    const profilesRes = await selectWithProfileFallback(
      (columns) => supabase.from("profiles").select(columns),
      profileBootColumnsRef.current,
    );

    if (profilesRes.error) {
      throw profilesRes.error;
    }

    if (profilesRes.resolvedColumns) {
      profileBootColumnsRef.current = profilesRes.resolvedColumns;
    }

    const nextProfiles = (profilesRes.data || []).map(fromProfileRow);
    setUsers((current) => {
      const currentById = new Map(current.map((user) => [String(user.id), user]));
      nextProfiles.forEach((profile) => {
        currentById.set(String(profile.id), profile);
      });
      return [...currentById.values()];
    });
    secondaryStateRef.current.directoryProfilesLoaded = true;
    return nextProfiles;
  }, []);

  const loadWorkspaceData = useCallback(
    async (authedUserId, normalizedProfiles = users) => {
      if (!isSupabaseConfigured || !authedUserId) {
        return;
      }

      const [
        wishlistsRes,
        draftRes,
        threadRowsRes,
        offersRes,
      ] = await Promise.all([
        supabase.from("wishlists").select("listing_id").eq("user_id", authedUserId),
        supabase.from("listing_drafts").select("payload,updated_at").eq("user_id", authedUserId).maybeSingle(),
        supabase.from("message_threads").select(THREAD_COLUMNS).contains("participant_ids", [authedUserId]),
        supabase.from("offers").select(OFFER_COLUMNS).or(`seller_id.eq.${authedUserId},buyer_id.eq.${authedUserId}`),
      ]);

      if (wishlistsRes.error) throw wishlistsRes.error;
      if (draftRes.error) throw draftRes.error;
      if (threadRowsRes.error) throw threadRowsRes.error;
      if (offersRes.error) throw offersRes.error;

      const threadRows = threadRowsRes.data || [];
      let messageRows = [];
      if (threadRows.length) {
        const messagesRes = await supabase
          .from("messages")
          .select(MESSAGE_COLUMNS)
          .in(
            "thread_id",
            threadRows.map((thread) => thread.id),
          );

        if (messagesRes.error) throw messagesRes.error;
        messageRows = messagesRes.data || [];
      }

      const draftPayload = draftRes.data?.payload || null;
      const nextDrafts = normalizeDraftCollection(draftPayload).map((draft, index) => ({
        id: draft.id || `legacy-draft-${index + 1}`,
        name: draft.name || draft.title || "Untitled draft",
        updatedAt: draft.updatedAt || draftRes.data?.updated_at || new Date().toISOString(),
        ...draft,
      }));

      setWishlist((wishlistsRes.data || []).map((item) => item.listing_id));
      setListingDrafts(nextDrafts);
      setActiveDraftId(draftPayload?.activeDraftId || nextDrafts[0]?.id || null);
      setThreads(buildThreadMap(threadRows, messageRows));
      setOffers((offersRes.data || []).map(fromOfferRow));

      const [
        bugReportsRes,
        notificationsRes,
        searchHistoryRes,
        collectionItemsRes,
        eventPreferencesRes,
      ] = await Promise.all([
        supabase.from("bug_reports").select(BUG_REPORT_COLUMNS).eq("reporter_id", authedUserId),
        supabase.from("notifications").select(NOTIFICATION_COLUMNS).eq("user_id", authedUserId),
        supabase.from("search_history").select(SEARCH_HISTORY_COLUMNS).eq("user_id", authedUserId).order("created_at", { ascending: false }),
        supabase.from("collection_items").select(COLLECTION_ITEM_COLUMNS).eq("user_id", authedUserId).order("updated_at", { ascending: false }),
        supabase.from("user_event_preferences").select(EVENT_PREF_COLUMNS).eq("user_id", authedUserId),
      ]);

      if (!bugReportsRes.error) {
        setBugReports((bugReportsRes.data || []).map(fromBugReportRow));
      } else if (!isMissingTableError(bugReportsRes.error, "bug_reports")) {
        console.error("Workspace bug reports failed to load:", bugReportsRes.error);
      }

      if (!notificationsRes.error) {
        setNotifications((notificationsRes.data || []).map(fromNotificationRow));
      } else {
        console.error("Workspace notifications failed to load:", notificationsRes.error);
      }

      if (!searchHistoryRes.error) {
        setSearchHistory(
          (searchHistoryRes.data || []).map((row) => ({
            id: row.id,
            query: row.query,
            game: row.game,
            source: row.source,
            createdAt: row.created_at,
          })),
        );
      } else {
        console.error("Workspace search history failed to load:", searchHistoryRes.error);
      }

      if (!collectionItemsRes.error) {
        setCollectionItems((collectionItemsRes.data || []).map(fromCollectionItemRow));
      } else if (isMissingTableError(collectionItemsRes.error, "collection_items")) {
        setCollectionItems(readCollectionStorage(authedUserId).map(normalizeCollectionRecord));
      } else {
        console.error("Workspace collection failed to load:", collectionItemsRes.error);
      }

      if (!eventPreferencesRes.error) {
        const nextEventPreferences = normalizeEventPreferences(eventPreferencesRes.data || []);
        setEventReminderIds(nextEventPreferences.reminderIds);
        setEventAttendance(nextEventPreferences.attendance);
      } else if (isMissingTableError(eventPreferencesRes.error, "user_event_preferences")) {
        setEventReminderIds(readEventReminderStorage(authedUserId));
        setEventAttendance(readEventAttendanceStorage(authedUserId));
      } else {
        console.error("Workspace event preferences failed to load:", eventPreferencesRes.error);
      }

      secondaryStateRef.current.workspaceUserId = String(authedUserId);
      return normalizedProfiles;
    },
    [users],
  );

  const loadEventAttendanceFeed = useCallback(
    async (normalizedProfiles = users) => {
      if (!isSupabaseConfigured) {
        return {};
      }

      const eventAttendanceFeedRes = await supabase
        .from("user_event_preferences")
        .select(EVENT_ATTENDANCE_COLUMNS);

      if (
        eventAttendanceFeedRes.error &&
        !isMissingTableError(eventAttendanceFeedRes.error, "user_event_preferences")
      ) {
        throw eventAttendanceFeedRes.error;
      }

      const nextFeed = eventAttendanceFeedRes.error
        ? {}
        : normalizeEventAttendanceFeed(eventAttendanceFeedRes.data || [], normalizedProfiles);
      setEventAttendanceFeed(nextFeed);
      secondaryStateRef.current.eventAttendanceLoaded = true;
      return nextFeed;
    },
    [users],
  );

  const loadAdminData = useCallback(async (authedUserId) => {
    if (!isSupabaseConfigured || !authedUserId) {
      return;
    }

    const [reportsRes, bugReportsRes, auditLogRes] = await Promise.all([
      supabase.from("reports").select(REPORT_COLUMNS),
      supabase.from("bug_reports").select(BUG_REPORT_COLUMNS),
      supabase
        .from("admin_audit_log")
        .select(AUDIT_LOG_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (reportsRes.error) throw reportsRes.error;
    if (bugReportsRes.error && !isMissingTableError(bugReportsRes.error, "bug_reports")) {
      throw bugReportsRes.error;
    }
    if (auditLogRes.error && !isMissingTableError(auditLogRes.error, "admin_audit_log")) {
      throw auditLogRes.error;
    }

    setReports((reportsRes.data || []).map(fromReportRow));
    if (!bugReportsRes.error) {
      setBugReports((bugReportsRes.data || []).map(fromBugReportRow));
    }
    if (!auditLogRes.error) {
      setAdminAuditLog((auditLogRes.data || []).map(fromAuditRow));
    } else {
      setAdminAuditLog([]);
    }
    secondaryStateRef.current.adminUserId = String(authedUserId);
  }, []);

  const refreshMarketplaceData = useCallback(
    async (authedUserId = currentUserId, options = {}) => {
      if (!isSupabaseConfigured) {
        return;
      }

      const useCachedBootSnapshot = hasUsableCache && !options.forceDirect;
      const allowServerBootstrap = !options.forceDirect;
      const allowServerEventSync = import.meta.env.DEV;

      if (!options.silent && !useCachedBootSnapshot) {
        setLoading(true);
        updateBootState(hasUsableCache ? 0.4 : 0.2, "Loading marketplace");
      }

      try {
        const authUser = options.authUser || null;
        let normalizedProfiles = [];
        let nextListings = [];
        let nextManualEvents = [];
        let nextSiteSettings = null;

        let bootstrapLoaded = false;
        if (allowServerBootstrap) {
          try {
            const bootstrapPayload = await fetchMarketplaceBootstrap({
              timeoutMs: useCachedBootSnapshot ? 2500 : 4000,
            });
            normalizedProfiles = (bootstrapPayload?.users || [])
              .map((row) => mergeAuthedProfileMetadata(row, authUser))
              .map(fromProfileRow);
            nextListings = (bootstrapPayload?.listings || [])
              .map(fromListingRow)
              .filter(isSupportedListing);
            nextManualEvents = (bootstrapPayload?.manualEvents || []).map(fromEventRow);
            nextSiteSettings = bootstrapPayload?.siteSettings
              ? fromSiteSettingsRow(bootstrapPayload.siteSettings)
              : null;
            bootstrapLoaded = true;
          } catch (bootstrapError) {
            console.error("Marketplace bootstrap failed, falling back to direct queries:", bootstrapError);
            if (useCachedBootSnapshot) {
              normalizedProfiles = users;
              nextListings = listings;
              nextManualEvents = manualEvents;
              nextSiteSettings = siteSettings;
              bootstrapLoaded = true;
              window.setTimeout(() => {
                void refreshMarketplaceData(authedUserId, {
                  ...options,
                  silent: true,
                  forceDirect: true,
                });
              }, 0);
            }
          }
        }

        if (!bootstrapLoaded) {
          const manualEventsPromise = (async () => {
            let result = await supabase
              .from("manual_events")
              .select(MANUAL_EVENT_SUMMARY_COLUMNS)
              .eq("published", true)
              .limit(24);
            if (
              result.error &&
              (isMissingColumnError(result.error, "source_type") ||
                isMissingColumnError(result.error, "source_url"))
            ) {
              result = await supabase
                .from("manual_events")
                .select(MANUAL_EVENT_FALLBACK_COLUMNS)
                .eq("published", true)
                .limit(24);
            }
            return result;
          })();
          const [listingsRes, manualEventsRes, siteSettingsRes] = await withAsyncTimeout(
            Promise.all([
              supabase
                .from("listings")
                .select(LISTING_SUMMARY_COLUMNS)
                .eq("status", "active")
                .order("created_at", { ascending: false })
                .limit(120),
              manualEventsPromise,
              supabase
                .from("site_settings")
                .select(SITE_SETTINGS_COLUMNS)
                .eq("key", "global")
                .maybeSingle(),
            ]),
            useCachedBootSnapshot ? 3500 : 6000,
            "Marketplace refresh timed out.",
          );

          if (listingsRes.error) throw listingsRes.error;
          if (manualEventsRes.error) throw manualEventsRes.error;
          if (siteSettingsRes.error && !isMissingTableError(siteSettingsRes.error, "site_settings")) {
            throw siteSettingsRes.error;
          }

          nextListings = (listingsRes.data || []).map(fromListingRow).filter(isSupportedListing);
          const sellerIds = [...new Set([
            ...nextListings.map((listing) => String(listing.sellerId || "")).filter(Boolean),
            authedUserId ? String(authedUserId) : "",
          ])];

          let profilesRes = { data: [], error: null, resolvedColumns: profileBootColumnsRef.current };
          if (sellerIds.length) {
            profilesRes = await selectWithProfileFallback(
              (columns) => supabase.from("profiles").select(columns).in("id", sellerIds),
              profileBootColumnsRef.current,
            );
            if (profilesRes.error) throw profilesRes.error;
            if (profilesRes.resolvedColumns) {
              profileBootColumnsRef.current = profilesRes.resolvedColumns;
            }
          }

          normalizedProfiles = (profilesRes.data || [])
            .map((row) => mergeAuthedProfileMetadata(row, authUser))
            .map(fromProfileRow);
          nextManualEvents = (manualEventsRes.data || []).map(fromEventRow);
          nextSiteSettings =
            !siteSettingsRes.error && siteSettingsRes.data ? fromSiteSettingsRow(siteSettingsRes.data) : null;
        }

        if (!options.silent) {
          updateBootState(hasUsableCache ? 0.7 : 0.58, "Preparing listings");
        }

        if (allowServerEventSync && !nextManualEvents.length) {
          window.setTimeout(() => {
            void syncLocalEventsCache()
              .then((syncedPayload) => {
                if (Array.isArray(syncedPayload?.events) && syncedPayload.events.length) {
                  setManualEvents(syncedPayload.events.map(normalizeManualEventRecord));
                  writeEventSyncTimestamp(Date.now());
                }
              })
              .catch((syncError) => {
                console.error("Boot event sync fallback failed:", syncError);
              });
          }, 0);
        }

        setUsers(normalizedProfiles);
        setListings(nextListings);
        setManualEvents(nextManualEvents);
        if (nextSiteSettings) {
          setSiteSettings(nextSiteSettings);
        }

        if (!options.silent) {
          updateBootState(hasUsableCache ? 0.9 : 0.82, "Finalizing home");
        }

        const authedProfile = authedUserId
          ? normalizedProfiles.find((profile) => String(profile.id) === String(authedUserId)) || null
          : null;

        if (!authedUserId) {
          setWishlist([]);
          setThreads([]);
          setOffers([]);
          setReports([]);
          setBugReports([]);
          setNotifications([]);
          setListingDrafts([]);
          setCollectionItems([]);
          setActiveDraftId(null);
          setSearchHistory([]);
          setAdminAuditLog([]);
          setEventReminderIds([]);
          setEventAttendance({});
          setEventAttendanceFeed({});
          secondaryStateRef.current.workspaceUserId = null;
          secondaryStateRef.current.eventAttendanceLoaded = false;
          secondaryStateRef.current.adminUserId = null;
          return;
        }

        const shouldDeferSecondary = Boolean(options.deferSecondary);
        const shouldLoadSellerTrust = options.loadSellerTrust ?? true;
        const shouldLoadWorkspace = options.loadWorkspace ?? !shouldDeferSecondary;
        const shouldLoadEventAttendance = options.loadEventAttendance ?? !shouldDeferSecondary;
        const shouldLoadAdmin = Boolean(
          authedProfile?.role === "admin" && (options.loadAdmin ?? !shouldDeferSecondary),
        );

        const secondaryTasks = [];
        if (shouldLoadSellerTrust) {
          secondaryTasks.push(() => loadSellerTrustData());
        }
        if (!secondaryStateRef.current.directoryProfilesLoaded) {
          secondaryTasks.push(() => loadDirectoryProfilesData());
        }
        if (shouldLoadWorkspace) {
          secondaryTasks.push(() => loadWorkspaceData(authedUserId, normalizedProfiles));
        }
        if (shouldLoadEventAttendance) {
          secondaryTasks.push(() => loadEventAttendanceFeed(normalizedProfiles));
        }
        if (shouldLoadAdmin) {
          secondaryTasks.push(() => loadAdminData(authedUserId));
        } else if (authedProfile?.role !== "admin") {
          setReports([]);
          setAdminAuditLog([]);
        }

        if (shouldDeferSecondary) {
          window.setTimeout(() => {
            secondaryTasks.forEach((task) => {
              Promise.resolve(task()).catch((error) => {
                console.error("Deferred marketplace hydration failed:", error);
              });
            });
          }, 0);
        } else if (secondaryTasks.length) {
          await Promise.all(secondaryTasks.map((task) => task()));
        }
      } catch (error) {
        console.error("Marketplace refresh failed:", error);
      } finally {
        if (!options.silent && !useCachedBootSnapshot) {
          updateBootState(1, "Ready");
        }
        setLoading(false);
      }
    },
    [currentUserId, hasUsableCache, listings, loadAdminData, loadDirectoryProfilesData, loadEventAttendanceFeed, loadSellerTrustData, loadWorkspaceData, manualEvents, siteSettings, updateBootState, users],
  );

  const ensureSellerTrustLoaded = useCallback(
    async ({ force = false } = {}) => {
      if (!isSupabaseConfigured) {
        return { ok: true };
      }
      if (secondaryStateRef.current.reviewsLoaded && !force) {
        return { ok: true };
      }
      try {
        await loadSellerTrustData();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error?.message || "Seller trust data failed to load." };
      }
    },
    [loadSellerTrustData],
  );

  const ensureWorkspaceDataLoaded = useCallback(
    async ({ force = false } = {}) => {
      if (!isSupabaseConfigured || !currentUserId) {
        return { ok: true };
      }
      if (secondaryStateRef.current.workspaceUserId === String(currentUserId) && !force) {
        return { ok: true };
      }
      try {
        await loadWorkspaceData(currentUserId);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error?.message || "Workspace data failed to load." };
      }
    },
    [currentUserId, loadWorkspaceData],
  );

  const ensureEventAttendanceFeedLoaded = useCallback(
    async ({ force = false } = {}) => {
      if (!isSupabaseConfigured) {
        return { ok: true };
      }
      if (secondaryStateRef.current.eventAttendanceLoaded && !force) {
        return { ok: true };
      }
      try {
        await loadEventAttendanceFeed();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error?.message || "Event responses failed to load." };
      }
    },
    [loadEventAttendanceFeed],
  );

  const ensureAdminDataLoaded = useCallback(
    async ({ force = false } = {}) => {
      if (!isSupabaseConfigured || !currentUserId || currentUser?.role !== "admin") {
        return { ok: true };
      }
      if (secondaryStateRef.current.adminUserId === String(currentUserId) && !force) {
        return { ok: true };
      }
      try {
        await loadAdminData(currentUserId);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error?.message || "Admin data failed to load." };
      }
    },
    [currentUser?.role, currentUserId, loadAdminData],
  );

  useEffect(() => {
    writeSearchStorage(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    writeMarketplaceCache({
      users,
      listings,
      wishlist,
      reviews,
      threads,
      manualEvents,
      offers,
      reports,
      bugReports,
      notifications,
      listingDrafts,
      activeDraftId,
      searchHistory,
      siteSettings,
    });
  }, [
    activeDraftId,
    bugReports,
    listingDrafts,
    listings,
    manualEvents,
    notifications,
    offers,
    reports,
    reviews,
    searchHistory,
    siteSettings,
    threads,
    users,
    wishlist,
  ]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      return;
    }

    writeSiteSettingsStorage(siteSettings);
  }, [siteSettings]);

  const persistSeedMarketplaceSnapshot = useCallback(
    (overrides = {}) => {
      if (isSupabaseConfigured) {
        return;
      }

      writeMarketplaceCache({
        users,
        listings,
        wishlist,
        reviews,
        threads,
        manualEvents,
        offers,
        reports,
        bugReports,
        notifications,
        listingDrafts: overrides.listingDrafts ?? listingDrafts,
        activeDraftId: overrides.activeDraftId ?? activeDraftId,
        searchHistory: overrides.searchHistory ?? searchHistory,
        siteSettings: overrides.siteSettings ?? siteSettings,
      });
    },
    [
      activeDraftId,
      bugReports,
      isSupabaseConfigured,
      listingDrafts,
      listings,
      manualEvents,
      notifications,
      offers,
      reports,
      reviews,
      searchHistory,
      siteSettings,
      threads,
      users,
      wishlist,
    ],
  );

  useEffect(() => {
    if (!currentUserId) {
      setFollowedStoreSlugs([]);
      setEventReminderIds([]);
      setEventAttendance({});
      return;
    }

    if (isSupabaseConfigured) {
      return;
    }

    setFollowedStoreSlugs(readStoreFollowStorage(currentUserId));
    setEventReminderIds(readEventReminderStorage(currentUserId));
    setEventAttendance(readEventAttendanceStorage(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || !isSupabaseConfigured) {
      return;
    }

    setFollowedStoreSlugs(currentUserRecord?.followedStoreSlugs || []);
  }, [currentUserId, currentUserRecord?.followedStoreSlugs]);

  useEffect(() => {
    if (!currentUserId || isSupabaseConfigured) {
      return;
    }

    writeStoreFollowStorage(currentUserId, followedStoreSlugs);
  }, [currentUserId, followedStoreSlugs]);

  useEffect(() => {
    if (!currentUserId || isSupabaseConfigured) {
      return;
    }

    writeEventReminderStorage(currentUserId, eventReminderIds);
  }, [currentUserId, eventReminderIds]);

  useEffect(() => {
    if (!currentUserId || isSupabaseConfigured) {
      return;
    }

    writeEventAttendanceStorage(currentUserId, eventAttendance);
  }, [currentUserId, eventAttendance]);

  useEffect(() => {
    if (!currentUserId) {
      setHiddenThreadMap({});
      return;
    }

    if (isSupabaseConfigured) {
      setHiddenThreadMap({});
      return;
    }

    setHiddenThreadMap(readHiddenThreadsStorage(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      setCollectionItems([]);
      return;
    }

    if (isSupabaseConfigured) {
      return;
    }

    setCollectionItems(readCollectionStorage(currentUserId).map(normalizeCollectionRecord));
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || isSupabaseConfigured) {
      return;
    }

    writeHiddenThreadsStorage(currentUserId, hiddenThreadMap);
  }, [currentUserId, hiddenThreadMap]);

  useEffect(() => {
    if (!currentUserId || isSupabaseConfigured) {
      return;
    }

    writeCollectionStorage(currentUserId, collectionItems);
  }, [collectionItems, currentUserId]);

  useEffect(() => {
    writeAuditLogStorage(adminAuditLog);
  }, [adminAuditLog]);

  useEffect(() => {
    if (viewAsUserId && !users.some((user) => user.id === viewAsUserId)) {
      setViewAsUserId(null);
      writeViewAsStorage(null);
    }
  }, [users, viewAsUserId]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let mounted = true;

    async function hydrateAuthUser(authUser) {
      if (!mounted) {
        return;
      }

      try {
        if (authUser) {
          updateBootState(hasUsableCache ? 0.28 : 0.16, "Checking your account");
          setCurrentUserId(authUser.id);
          setAuthReady(true);
          window.setTimeout(() => {
            void bootstrapProfile(authUser)
              .then((profile) => {
                if (!mounted || !profile) {
                  return;
                }
                setUsers((current) => {
                  const nextUsers = current.filter((user) => user.id !== profile.id);
                  return [profile, ...nextUsers];
                });
              })
              .catch((error) => {
                console.error("Profile bootstrap fallback failed:", error);
              });
          }, 0);
          void refreshMarketplaceData(authUser.id, {
            silent: Boolean(hasUsableCache),
            deferSecondary: true,
            loadSellerTrust: true,
            loadWorkspace: true,
            loadEventAttendance: false,
            loadAdmin: false,
            authUser,
          });
        } else {
          if (!mounted) {
            return;
          }
          setCurrentUserId(null);
          setAuthReady(true);
          void refreshMarketplaceData(null, {
            silent: Boolean(hasUsableCache),
            deferSecondary: true,
            loadSellerTrust: true,
            loadWorkspace: false,
            loadEventAttendance: false,
            loadAdmin: false,
          });
        }
      } catch (error) {
        console.error("Supabase auth hydration failed:", error);
        if (mounted) {
          setLoading(false);
          setAuthReady(true);
        }
      }
    }

    async function initAuth() {
      updateBootState(hasUsableCache ? 0.16 : 0.1, "Checking session");
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }

      if (error) {
        console.error("Supabase getSession failed:", error);
        setAuthReady(true);
        return;
      }

      await hydrateAuthUser(data.session?.user || null);
    }

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        return;
      }
      window.setTimeout(() => {
        void hydrateAuthUser(session?.user || null);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [bootstrapProfile, hasUsableCache, refreshMarketplaceData, updateBootState]);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUserId || !authReady) {
      return;
    }

    const runRefresh = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      void refreshMarketplaceData(currentUserId, {
        silent: true,
        deferSecondary: true,
        loadSellerTrust: false,
        loadWorkspace: false,
        loadEventAttendance: false,
        loadAdmin: false,
      });
    };

    const intervalId = window.setInterval(() => {
      runRefresh();
    }, FOREGROUND_REFRESH_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runRefresh();
      }
    };

    window.addEventListener("focus", runRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", runRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authReady, currentUserId, refreshMarketplaceData]);

  useEffect(() => {
    if (!import.meta.env.DEV || !isSupabaseConfigured || !authReady || eventsSyncRunningRef.current) {
      return;
    }

    const lastSyncedAt = readEventSyncTimestamp();
    const maxAgeMs = 45 * 60 * 1000;
    const emptyRetryMs = 2 * 60 * 1000;
    const syncWindowMs = manualEvents.length ? maxAgeMs : emptyRetryMs;
    if (lastSyncedAt && Date.now() - lastSyncedAt < syncWindowMs) {
      return;
    }

    eventsSyncRunningRef.current = true;

    void syncLocalEventsCache()
      .then((payload) => {
        if (Array.isArray(payload?.events) && payload.events.length) {
          setManualEvents(payload.events.map(normalizeManualEventRecord));
        }
        writeEventSyncTimestamp(Date.now());
      })
      .catch((error) => {
        console.error("Background event sync failed:", error);
      })
      .finally(() => {
        eventsSyncRunningRef.current = false;
      });
  }, [authReady, manualEvents.length]);

  useEffect(() => {
    if (!currentUserId) {
      seenNotificationIdsRef.current = new Set();
      seededRealtimeStateRef.current = false;
      return;
    }

    if (!seededRealtimeStateRef.current) {
      seenNotificationIdsRef.current = readToastSeenStorage(currentUserId);
      notificationsForCurrentUser.forEach((notification) => {
        seenNotificationIdsRef.current.add(notification.id);
      });
      writeToastSeenStorage(currentUserId, seenNotificationIdsRef.current);
      seededRealtimeStateRef.current = true;
      return;
    }

    let hasSeenUpdates = false;
    notificationsForCurrentUser.forEach((notification) => {
      if (!seenNotificationIdsRef.current.has(notification.id) && !notification.read) {
        seenNotificationIdsRef.current.add(notification.id);
        hasSeenUpdates = true;
        pushToast({
          title: notification.title,
          body: notification.body,
            href:
              notification.type === "message"
                ? `/messages/${notification.entityId}`
                : notification.type.startsWith("offer-")
                  ? "/dashboard"
                  : notification.type === "bug-opened"
                    ? "/admin"
                    : notification.type === "bug-status"
                      ? "/beta/bugs"
                  : notification.type === "report-opened" || notification.type === "listing-flagged"
                    ? "/admin"
                    : notification.entityId
                    ? `/listing/${notification.entityId}`
                    : "/notifications",
          tone:
            notification.type === "message"
              ? "navy"
              : notification.type.includes("offer")
                ? "orange"
                : "slate",
        });
      }
    });

    if (hasSeenUpdates) {
      writeToastSeenStorage(currentUserId, seenNotificationIdsRef.current);
    }
  }, [currentUserId, notificationsForCurrentUser, pushToast]);

  async function pushNotification(notification) {
    if (!isSupabaseConfigured) {
      setNotifications((current) => [notification, ...current]);
      return;
    }

    await supabase.from("notifications").insert({
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      entity_id: notification.entityId,
      read: false,
    });
  }

  async function persistStorefrontSettings(nextSettings, audit = {}) {
    if (!isSupabaseConfigured) {
      return { ok: true, settings: nextSettings };
    }

    if (API_BASE_URL) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const response = await apiRequest("/api/admin/site-settings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
          body: JSON.stringify({
            payload: nextSettings,
            audit,
          }),
        });

        return {
          ok: true,
          settings: fromSiteSettingsRow(response.settings),
          persistedBy: "server",
        };
      } catch (error) {
        if (error?.status && error.status !== 501) {
          return { ok: false, error: error.message || "Failed to update storefront settings." };
        }
      }
    }

    const { data, error } = await supabase
      .from("site_settings")
      .upsert({
        key: "global",
        payload: nextSettings,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error && !isMissingTableError(error, "site_settings")) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      settings: data ? fromSiteSettingsRow(data) : nextSettings,
      persistedBy: "supabase",
    };
  }

  async function updateHomeHeroSettings(payload = {}) {
    if (!currentUser || currentUser.role !== "admin") {
      return { ok: false, error: "Only admins can update storefront hero settings." };
    }

    const nextSettings = normalizeSiteSettings({
      ...siteSettings,
      homeHero: {
        ...siteSettings.homeHero,
        ...payload,
      },
    });

    setSiteSettings(nextSettings);
    const details = `Featured listing: ${payload.featuredListingId || "auto"} | Pinned event: ${payload.pinnedEventId || "auto"} | Spotlight game: ${payload.spotlightGameSlug || "auto"}`;
    const persistResult = await persistStorefrontSettings(nextSettings, {
      action: "storefront-hero",
      title: "Updated homepage hero controls",
      details,
    });
    if (!persistResult.ok) {
      return persistResult;
    }

    if (persistResult.settings) {
      setSiteSettings(persistResult.settings);
    }

    pushAdminAuditEntry({
      action: "storefront-hero",
      title: "Updated homepage hero controls",
      details,
      targetType: "storefront",
      persist: persistResult.persistedBy !== "server",
    });
    return { ok: true, settings: nextSettings };
  }

  async function updateStorefrontSettings(payload = {}) {
    if (!currentUser || currentUser.role !== "admin") {
      return { ok: false, error: "Only admins can update storefront settings." };
    }

    const nextSettings = normalizeSiteSettings({
      ...siteSettings,
      ...payload,
      homeHero: {
        ...siteSettings.homeHero,
        ...(payload.homeHero || {}),
      },
      homeSections: {
        ...siteSettings.homeSections,
        ...(payload.homeSections || {}),
      },
    });

    setSiteSettings(nextSettings);
    const persistResult = await persistStorefrontSettings(nextSettings, {
      action: "storefront-settings",
      title: "Updated storefront settings",
      details: "Homepage sections or theme controls were adjusted.",
    });
    if (!persistResult.ok) {
      return persistResult;
    }

    if (persistResult.settings) {
      setSiteSettings(persistResult.settings);
    }

    pushAdminAuditEntry({
      action: "storefront-settings",
      title: "Updated storefront settings",
      details: "Homepage sections or theme controls were adjusted.",
      targetType: "storefront",
      persist: persistResult.persistedBy !== "server",
    });
    return { ok: true, settings: nextSettings };
  }

  async function recordSearchQuery(query, metadata = {}) {
    const trimmed = String(query || "").trim();
    if (!trimmed) {
      return;
    }

    if (!isSupabaseConfigured || !currentUserId) {
      setSearchHistory((current) => [
        {
          id: `search-${Date.now()}`,
          query: trimmed,
          createdAt: new Date().toISOString(),
          ...metadata,
        },
        ...current,
      ].slice(0, 40));
      return;
    }

    await supabase.from("search_history").insert({
      user_id: currentUserId,
      query: trimmed,
      game: metadata.game || null,
      source: metadata.source || null,
    });
    await refreshMarketplaceData(currentUserId);
  }

  async function clearSearchHistory() {
    if (!isSupabaseConfigured || !currentUserId) {
      setSearchHistory([]);
      return;
    }

    await supabase.from("search_history").delete().eq("user_id", currentUserId);
    setSearchHistory([]);
  }

  function setGlobalSearch(nextValue) {
    setGlobalSearchState(nextValue);
    if (String(nextValue || "").trim()) {
      void recordSearchQuery(nextValue, { source: "header" });
    }
  }

  function openCreateListing(preset = null) {
    if (!currentUser) {
      return false;
    }

    const access = ensureAccountActive();
    if (!access.ok) {
      return false;
    }

    if (preset) {
      setActiveDraftId(null);
    }
    setCreateListingPreset(preset);
    setCreateListingOpen(true);
    return true;
  }

  function closeCreateListing() {
    setCreateListingPreset(null);
    setCreateListingOpen(false);
  }

  async function login({ email, password }) {
    if (!isSupabaseConfigured) {
      const normalizedEmail = normalizeEmail(email);
      const seedUser = users.find(
        (user) => user.email === normalizedEmail && user.password === password,
      );

      if (!seedUser) {
        return { ok: false, error: "Email or password is incorrect." };
      }

      setCurrentUserId(seedUser.id);
      return { ok: true };
    }

    const normalizedEmail = normalizeEmail(email);
    const serverGuard = await runServerAuthGuard(
      "login",
      normalizedEmail || "anonymous",
    );
    if (!serverGuard.ok) {
      return serverGuard;
    }

    const rateGuard = guardMutationRate("login", normalizedEmail || "anonymous");
    if (!rateGuard.ok) {
      return rateGuard;
    }

    setAuthReady(false);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (error) {
        return {
          ok: false,
          error:
            error.message === "Email not confirmed"
              ? "Check your email and confirm the account before logging in."
              : error.message,
        };
      }

      if (data.user) {
        await bootstrapProfile(data.user);
        setCurrentUserId(data.user.id);
        await refreshMarketplaceData(data.user.id);
      }

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error?.message || "Login failed. Try again.",
      };
    } finally {
      setAuthReady(true);
    }
  }

  async function signup(payload) {
    if (!isSupabaseConfigured) {
      const username = normalizeUsername(payload.username);
      const normalizedEmail = normalizeEmail(payload.email);
      if (!username) {
        return { ok: false, error: "A username is required." };
      }
      if (!normalizedEmail) {
        return { ok: false, error: "A valid email is required." };
      }
      if (!payload.password || payload.password.length < 6) {
        return { ok: false, error: "Password must be at least 6 characters." };
      }
      if (
        users.some(
          (user) =>
            user.email === normalizedEmail || normalizeUsername(user.username) === username,
        )
      ) {
        return { ok: false, error: "That email or username is already in use." };
      }

      const newUser = normalizeUserRecord({
        id: `seller-${Date.now()}`,
        role: "seller",
        name: payload.name || username,
        username,
        email: normalizedEmail,
        password: payload.password,
        neighborhood: payload.neighborhood || "St. Vital",
        postalCode: normalizePostalCode(payload.postalCode),
        favoriteGames: [payload.defaultListingGame || "Pokemon"],
        defaultListingGame: payload.defaultListingGame || "Pokemon",
        trustedMeetupSpots: [],
        meetupPreferences: "",
        onboardingComplete: true,
      });

      setUsers((current) => [newUser, ...current]);
      setCurrentUserId(newUser.id);
      return { ok: true, requiresEmailConfirmation: false, email: normalizedEmail };
    }

    const username = normalizeUsername(payload.username);
    const normalizedEmail = normalizeEmail(payload.email);
    if (!username) {
      return { ok: false, error: "A username is required." };
    }

    const serverGuard = await runServerAuthGuard(
      "signup",
      normalizedEmail || username || "anonymous",
    );
    if (!serverGuard.ok) {
      return serverGuard;
    }

    const rateGuard = guardMutationRate("signup", normalizedEmail || username || "anonymous");
    if (!rateGuard.ok) {
      return rateGuard;
    }

    setAuthReady(false);

    try {
      const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: payload.password,
        options: {
          data: {
            name: payload.name,
            username,
            neighborhood: payload.neighborhood,
            postal_code: normalizePostalCode(payload.postalCode),
            onboarding_complete: false,
          },
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data.user && data.session?.user) {
        await bootstrapProfile(data.user, payload);
        setCurrentUserId(data.user.id);
        await refreshMarketplaceData(data.user.id);
      }

      return {
        ok: true,
        requiresEmailConfirmation: !data.session,
        email: normalizeEmail(payload.email),
      };
    } catch (error) {
      return {
        ok: false,
        error: error?.message || "Signup failed. Try again.",
      };
    } finally {
      setAuthReady(true);
    }
  }

  async function requestPasswordReset(email) {
    if (!isSupabaseConfigured) {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        return { ok: false, error: "Enter the email on your account first." };
      }
      return { ok: true };
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return { ok: false, error: "Enter the email on your account first." };
    }

    const serverGuard = await runServerAuthGuard("password-reset", normalizedEmail);
    if (!serverGuard.ok) {
      return serverGuard;
    }

    const rateGuard = guardMutationRate("passwordReset", normalizedEmail);
    if (!rateGuard.ok) {
      return rateGuard;
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth?mode=recovery`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  async function logout() {
    setAuthReady(false);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      setCurrentUserId(null);
    } finally {
      setAuthReady(true);
    }
  }

  async function updateCurrentUserProfile(payload) {
    if (!isSupabaseConfigured || !currentUserId) {
      return { ok: false, error: "You must be logged in." };
    }

    const username = normalizeUsername(payload.username);
    if (!username) {
      return { ok: false, error: "A username is required." };
    }

    const access = ensureAccountActive(
      "This account is suspended. Contact an admin or submit an appeal before changing seller settings.",
    );
    if (!access.ok) {
      return access;
    }

    let nextAvatarUrl = currentUserRecord?.avatarUrl || "";

    if (payload.removeAvatar) {
      nextAvatarUrl = "";
    } else if (payload.avatarFile) {
      if (!String(payload.avatarFile.type || "").startsWith("image/")) {
        return { ok: false, error: "Profile photo must be an image file." };
      }

      if (Number(payload.avatarFile.size) > 1_500_000) {
        return { ok: false, error: "Profile photo must be under 1.5 MB." };
      }

      const extension = getFileExtension(payload.avatarFile.name, payload.avatarFile.type);
      const filePath = `avatars/${currentUserId}/profile-${Date.now()}.${extension}`;
      const uploadResult = await retryStorageUpload(
        () =>
          supabase.storage
            .from(MEDIA_BUCKET)
            .upload(filePath, payload.avatarFile, {
              cacheControl: "3600",
              upsert: true,
              contentType: payload.avatarFile.type || undefined,
            })
            .then(({ data, error }) => {
              if (error) {
                throw error;
              }
              return { data };
            }),
        { retries: 2, retryDelayMs: 300 },
      ).catch((error) => ({ error }));

      if (uploadResult.error) {
        return {
          ok: false,
          error: uploadResult.error.message
            ? `${uploadResult.error.message} Make sure the 'listing-media' storage bucket exists and authenticated users can insert and update files in it.`
            : "Profile photo upload failed. Make sure the 'listing-media' storage bucket exists and authenticated users can insert and update files in it.",
        };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
      nextAvatarUrl = publicUrl;
    }

    const authUpdateResult = await supabase.auth.updateUser({
      data: {
        username,
        neighborhood: payload.neighborhood,
        postal_code: normalizePostalCode(payload.postalCode),
        avatar_url: nextAvatarUrl || null,
        default_listing_game:
          payload.defaultListingGame || currentUserRecord?.defaultListingGame || "Pokemon",
        trusted_meetup_spots: payload.trustedMeetupSpots || currentUserRecord?.trustedMeetupSpots || [],
        meetup_preferences_text: payload.meetupPreferences || currentUserRecord?.meetupPreferences || "",
        onboarding_complete:
          payload.onboardingComplete ?? currentUserRecord?.onboardingComplete ?? false,
      },
    });

    if (authUpdateResult.error) {
      return { ok: false, error: authUpdateResult.error.message };
    }

    const profilePayload = {
      username,
      neighborhood: payload.neighborhood,
      postal_code: normalizePostalCode(payload.postalCode),
      default_listing_game:
        payload.defaultListingGame || currentUserRecord?.defaultListingGame || "Pokemon",
      favorite_games: payload.favoriteGames || [],
      meetup_preferences: buildMeetupPreferenceValue(
        payload.meetupPreferences || "",
        payload.trustedMeetupSpots || currentUserRecord?.trustedMeetupSpots || [],
      ),
      response_time: payload.responseTime || "~ 1 hour",
      banner_style: payload.bannerStyle || "neutral",
      bio: payload.bio || "",
      avatar_url: nextAvatarUrl || null,
      updated_at: new Date().toISOString(),
    };

    let updateResult = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("id", currentUserId);
    const missingAvatarColumn =
      Boolean(updateResult.error) && isMissingColumnError(updateResult.error, "avatar_url");
    if (
      updateResult.error &&
      (isMissingColumnError(updateResult.error, "username") ||
        isMissingColumnError(updateResult.error, "avatar_url") ||
        isMissingColumnError(updateResult.error, "default_listing_game"))
    ) {
      const legacyProfilePayload = omitMissingProfileColumns(profilePayload, updateResult.error);
      updateResult = await supabase
        .from("profiles")
        .update(legacyProfilePayload)
        .eq("id", currentUserId);
    }

    const { error } = updateResult;

    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    return missingAvatarColumn
      ? {
          ok: true,
          avatarUrl: nextAvatarUrl,
          warning:
            "Username and profile settings were saved, but profile photos need the avatar_url column added to your Supabase profiles table.",
        }
      : {
          ok: true,
          avatarUrl: nextAvatarUrl,
        };
  }

  async function changeCurrentUserPassword(payload) {
    if (!isSupabaseConfigured || !currentUser) {
      return { ok: false, error: "You must be logged in." };
    }

    if (!payload.newPassword || payload.newPassword.length < 6) {
      return { ok: false, error: "New password must be at least 6 characters." };
    }

    if (payload.newPassword !== payload.confirmPassword) {
      return { ok: false, error: "New passwords do not match." };
    }

    const relogin = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: payload.currentPassword,
    });

    if (relogin.error) {
      return { ok: false, error: "Current password is incorrect." };
    }

    const { error } = await supabase.auth.updateUser({
      password: payload.newPassword,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  async function saveListingDraft(payload) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to save drafts." };
    }

    const access = ensureAccountActive();
    if (!access.ok) {
      return access;
    }

    const now = new Date().toISOString();
    const nextState = buildNextDraftState({
      drafts: listingDrafts,
      payload,
      now,
      maxDrafts: 12,
    });

    if (!isSupabaseConfigured) {
      setListingDrafts(nextState.drafts);
      setActiveDraftId(nextState.activeDraftId);
      persistSeedMarketplaceSnapshot({
        listingDrafts: nextState.drafts,
        activeDraftId: nextState.activeDraftId,
      });
      return { ok: true, draft: nextState.draft };
    }

    const { error } = await supabase.from("listing_drafts").upsert({
      user_id: currentUserId,
      payload: {
        drafts: nextState.drafts,
        activeDraftId: nextState.activeDraftId,
      },
      updated_at: now,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    setListingDrafts(nextState.drafts);
    setActiveDraftId(nextState.activeDraftId);
    return { ok: true, draft: nextState.draft };
  }

  async function clearListingDraft(draftId = activeDraftId) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to clear drafts." };
    }

    const nextState = buildClearedDraftState({
      drafts: listingDrafts,
      activeDraftId,
      draftId,
    });

    if (!isSupabaseConfigured) {
      setListingDrafts(nextState.drafts);
      setActiveDraftId(nextState.activeDraftId);
      persistSeedMarketplaceSnapshot({
        listingDrafts: nextState.drafts,
        activeDraftId: nextState.activeDraftId,
      });
      return { ok: true };
    }

    const { error } = await supabase.from("listing_drafts").upsert({
      user_id: currentUserId,
      payload: {
        drafts: nextState.drafts,
        activeDraftId: nextState.activeDraftId,
      },
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    setListingDrafts(nextState.drafts);
    setActiveDraftId(nextState.activeDraftId);
    return { ok: true };
  }

  async function selectListingDraft(draftId) {
    setActiveDraftId(draftId);

    if (!isSupabaseConfigured || !currentUserId) {
      if (!isSupabaseConfigured) {
        persistSeedMarketplaceSnapshot({ activeDraftId: draftId });
      }
      return { ok: true };
    }

    const { error } = await supabase.from("listing_drafts").upsert({
      user_id: currentUserId,
      payload: {
        drafts: listingDrafts,
        activeDraftId: draftId,
      },
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  async function completePasswordRecovery(payload) {
    if (!isSupabaseConfigured) {
      return { ok: false, error: "Supabase is not configured." };
    }

    if (!payload.newPassword || payload.newPassword.length < 6) {
      return { ok: false, error: "New password must be at least 6 characters." };
    }

    if (payload.newPassword !== payload.confirmPassword) {
      return { ok: false, error: "New passwords do not match." };
    }

    const { error } = await supabase.auth.updateUser({
      password: payload.newPassword,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  async function addCollectionItem(payload) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to track a collection." };
    }

    const nextItem = normalizeCollectionRecord({
      ...payload,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!isSupabaseConfigured) {
      setCollectionItems((current) => [nextItem, ...current.filter((item) => item.id !== nextItem.id)]);
      return { ok: true, item: nextItem };
    }

    const { data, error } = await supabase
      .from("collection_items")
      .insert(toCollectionItemPayload(nextItem, currentUserId, { includeId: false }))
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    const storedItem = fromCollectionItemRow(data);
    setCollectionItems((current) => [storedItem, ...current.filter((item) => item.id !== storedItem.id)]);
    return { ok: true, item: storedItem };
  }

  async function updateCollectionItem(itemId, updates) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to track a collection." };
    }

    const existingItem = collectionItems.find((item) => item.id === itemId);
    if (!existingItem) {
      return { ok: false, error: "Collection item not found." };
    }

    const nextItem = normalizeCollectionRecord({
      ...existingItem,
      ...updates,
      id: existingItem.id,
      addedAt: existingItem.addedAt,
      updatedAt: new Date().toISOString(),
    });

    if (!isSupabaseConfigured) {
      setCollectionItems((current) =>
        current.map((item) => (item.id === itemId ? nextItem : item)),
      );
      return { ok: true, item: nextItem };
    }

    const { data, error } = await supabase
      .from("collection_items")
      .update(toCollectionItemPayload(nextItem, currentUserId, { includeId: false }))
      .eq("id", itemId)
      .eq("user_id", currentUserId)
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    const storedItem = fromCollectionItemRow(data);
    setCollectionItems((current) =>
      current.map((item) => (item.id === itemId ? storedItem : item)),
    );

    return { ok: true, item: storedItem };
  }

  async function removeCollectionItem(itemId) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to track a collection." };
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from("collection_items")
        .delete()
        .eq("id", itemId)
        .eq("user_id", currentUserId);

      if (error) {
        return { ok: false, error: error.message };
      }
    }

    setCollectionItems((current) => current.filter((item) => item.id !== itemId));
    return { ok: true };
  }

  async function clearCollection() {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to track a collection." };
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from("collection_items")
        .delete()
        .eq("user_id", currentUserId);

      if (error) {
        return { ok: false, error: error.message };
      }
    }

    setCollectionItems([]);
    return { ok: true };
  }

  async function addListing(payload) {
    if (!authReady) {
      return { ok: false, error: "Your account is still loading. Try again in a second." };
    }

    if (!currentUserId || !currentUserRecord) {
      return { ok: false, error: "You must be logged in to post a listing." };
    }

    const access = ensureAccountActive();
    if (!access.ok) {
      return access;
    }

    if (!isSupabaseConfigured) {
      const nowIso = new Date().toISOString();
      const localListing = normalizeListingRecord({
        id: `listing-${Date.now()}`,
        sellerId: currentUserRecord.id,
        seller: currentUserRecord,
        sellerName: currentUserRecord.publicName || currentUserRecord.name,
        title: payload.title,
        type: payload.type || "WTS",
        game: payload.game,
        gameSlug: normalizeSupportedGameSlug(payload.game),
        listingFormat: payload.listingFormat || "single",
        bundleItems: Array.isArray(payload.bundleItems) ? payload.bundleItems : [],
        acceptsTrade: Boolean(payload.acceptsTrade),
        condition: payload.condition,
        language: payload.language || "English",
        quantity: Number(payload.quantity) || 1,
        price: Number(payload.price) || 0,
        neighborhood: payload.neighborhood,
        postalCode: normalizePostalCode(payload.postalCode),
        description: payload.description || "",
        imageUrl: payload.imageUrl || "",
        primaryImage: payload.imageUrl || "",
        conditionImages: Array.isArray(payload.conditionImages) ? payload.conditionImages : [],
        marketPrice: Number(payload.marketPrice) || 0,
        marketPriceCurrency: payload.marketPriceCurrency || "CAD",
        views: 0,
        offers: 0,
        featured: false,
        flagged: false,
        createdAt: nowIso,
        updatedAt: nowIso,
        status: "active",
      });

      setListings((current) => [localListing, ...current]);
      return { ok: true, listing: localListing };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const sellerId = session?.user?.id || currentUserId;

    if (!sellerId) {
      return { ok: false, error: "Your login session is not ready yet. Reload and try again." };
    }

    const sellerRecord =
      currentUserRecord.id === sellerId
        ? currentUserRecord
        : {
            ...currentUserRecord,
            id: sellerId,
          };

    const { data, error } = await supabase
      .from("listings")
      .insert(toListingPayload(payload, sellerRecord))
      .select("*")
      .single();

    if (error) {
      return {
        ok: false,
        error:
          /row-level security/i.test(error.message)
            ? "Listing post was blocked because your login session was not fully ready. Reload once, then try posting again."
            : error.message,
      };
    }

    if (payload.id) {
      await clearListingDraft(payload.id);
    }
    await pushNotification(
      normalizeNotificationRecord({
        userId: currentUserRecord.id,
        type: "listing-created",
        title: "Listing posted",
        body: `${payload.title} is now live in the marketplace.`,
        entityId: data.id,
      }),
    );

    try {
      const { data: followerRows, error: followerError } = await supabase
        .from("profiles")
        .select("id")
        .contains("followed_seller_ids", [currentUserRecord.id])
        .neq("id", currentUserRecord.id);

      if (!followerError && Array.isArray(followerRows) && followerRows.length) {
        await Promise.all(
          followerRows.map((follower) =>
            pushNotification({
              userId: follower.id,
              type: "seller-posted",
              title: `New listing from ${currentUserRecord.publicName || currentUserRecord.name}`,
              body: `${payload.title} was just posted.`,
              entityId: data.id,
            }),
          ),
        );
      }
    } catch {
      // Ignore missing followed_seller_ids support until the migration is applied.
    }

    await refreshMarketplaceData(currentUserId);
    return { ok: true, listing: fromListingRow(data) };
  }

  async function editListing(listingId, payload) {
    if (!isSupabaseConfigured || !currentUserId) {
      return null;
    }

    const access = ensureAccountActive();
    if (!access.ok) {
      return access;
    }

    const listing = listings.find((item) => item.id === listingId);
    if (!listing) {
      return null;
    }

    const nextPrice = payload.price !== undefined ? Number(payload.price) || 0 : listing.price;
    const nextCondition = payload.condition ?? listing.condition;
    const nextDescription = payload.description ?? listing.description;
    const nextQuantity =
      payload.quantity !== undefined ? Number(payload.quantity) || 1 : listing.quantity;
    const changes = [];

    if (nextPrice !== listing.price) {
      changes.push({ field: "price", from: listing.price, to: nextPrice });
    }

    if (nextCondition !== listing.condition) {
      changes.push({ field: "condition", from: listing.condition, to: nextCondition });
    }

    if (nextDescription !== listing.description) {
      changes.push({
        field: "description",
        from: listing.description,
        to: nextDescription,
      });
    }

    if (nextQuantity !== listing.quantity) {
      changes.push({ field: "quantity", from: listing.quantity, to: nextQuantity });
    }

    const { data, error } = await supabase
      .from("listings")
      .update({
        price: nextPrice,
        previous_price: nextPrice !== listing.price ? listing.price : listing.previousPrice,
        condition: nextCondition,
        description: nextDescription,
        quantity: nextQuantity,
        price_history: listing.priceHistory || [],
        edit_history: changes.length
          ? [
              {
                id: `edit-${Date.now()}`,
                createdAt: new Date().toISOString(),
                changes,
              },
              ...(listing.editHistory || []),
            ]
          : listing.editHistory || [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId)
      .select("*")
      .single();

    if (error) {
      return null;
    }

    await refreshMarketplaceData(currentUserId);
    return fromListingRow(data);
  }

  async function bumpListing(listingId) {
    const nextUpdatedAt = new Date().toISOString();

    const access = ensureAccountActive();
    if (!access.ok) {
      return access;
    }

    if (!isSupabaseConfigured || !currentUserId) {
      setListings((current) =>
        current.map((listing) =>
          listing.id === listingId
            ? normalizeListingRecord({
                ...listing,
                updatedAt: nextUpdatedAt,
                timeAgo: "Just listed",
              })
            : listing,
        ),
      );
      return { ok: true };
    }

    const { error } = await supabase
      .from("listings")
      .update({ updated_at: nextUpdatedAt })
      .eq("id", listingId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    return { ok: true };
  }

  async function markListingSold(listingId) {
    const nextUpdatedAt = new Date().toISOString();

    const access = ensureAccountActive();
    if (!access.ok) {
      return access;
    }

    if (!isSupabaseConfigured || !currentUserId) {
      setListings((current) =>
        current.map((listing) =>
          listing.id === listingId
            ? normalizeListingRecord({
                ...listing,
                status: "sold",
                updatedAt: nextUpdatedAt,
              })
            : listing,
        ),
      );
      return { ok: true };
    }

    const { error } = await supabase
      .from("listings")
      .update({ status: "sold", updated_at: nextUpdatedAt })
      .eq("id", listingId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    return { ok: true };
  }

  async function deleteListing(listingId) {
    const nextUpdatedAt = new Date().toISOString();

    const access = ensureAccountActive();
    if (!access.ok) {
      return access;
    }

    const listing = listings.find((item) => String(item.id) === String(listingId));
    if (!listing) {
      return { ok: false, error: "Listing not found." };
    }

    const ownerId = String(listing.sellerId || listing.seller?.id || "");
    if (currentUserId && ownerId && ownerId !== String(currentUserId)) {
      return { ok: false, error: "You can only delete your own listings." };
    }

    if (!isSupabaseConfigured || !currentUserId) {
      setListings((current) =>
        current.map((item) =>
          String(item.id) === String(listingId)
            ? normalizeListingRecord({
                ...item,
                status: "removed",
                updatedAt: nextUpdatedAt,
              })
            : item,
        ),
      );
      return { ok: true };
    }

    const { error } = await supabase
      .from("listings")
      .update({ status: "removed", updated_at: nextUpdatedAt })
      .eq("id", listingId)
      .eq("seller_id", currentUserId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    return { ok: true };
  }

  const recordListingView = useCallback(async (listingId) => {
    const normalizedId = String(listingId || "");
    if (!normalizedId || pendingViewedListingsRef.current.has(normalizedId)) {
      return;
    }

    if (typeof window !== "undefined") {
      const latestViewedListings = readViewedListingIds();
      if (latestViewedListings.has(normalizedId)) {
        viewedListingsRef.current = latestViewedListings;
        return;
      }
    }

    if (viewedListingsRef.current.has(normalizedId)) {
      return;
    }

    const listing = listingsRef.current.find((item) => String(item.id) === normalizedId);
    if (!listing) {
      return;
    }

    const nextViews = Number(listing.views || 0) + 1;
    const previousViews = Number(listing.views || 0);
    pendingViewedListingsRef.current.add(normalizedId);

    setListings((current) =>
      current.map((item) =>
        String(item.id) === normalizedId
          ? normalizeListingRecord({ ...item, views: nextViews })
          : item,
      ),
    );

    try {
      if (!isSupabaseConfigured) {
        viewedListingsRef.current.add(normalizedId);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              VIEWED_LISTINGS_STORAGE_KEY,
              JSON.stringify([...viewedListingsRef.current]),
            );
          } catch {
            // Ignore storage errors and keep in-memory dedupe.
          }
        }
        return;
      }

      const { error } = await supabase.from("listings").update({ views: nextViews }).eq("id", normalizedId);
      if (error) {
        throw error;
      }

      viewedListingsRef.current.add(normalizedId);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            VIEWED_LISTINGS_STORAGE_KEY,
            JSON.stringify([...viewedListingsRef.current]),
          );
        } catch {
          // Ignore storage errors and keep in-memory dedupe.
        }
      }
    } catch (error) {
      setListings((current) =>
        current.map((item) =>
          String(item.id) === normalizedId
            ? normalizeListingRecord({ ...item, views: previousViews })
            : item,
        ),
      );
      console.error("recordListingView failed:", error);
    } finally {
      pendingViewedListingsRef.current.delete(normalizedId);
    }
  }, [isSupabaseConfigured]);

  async function toggleWishlist(listingId) {
    const access = ensureAccountActive(
      "This account is suspended. You can browse listings, but wishlist changes are disabled.",
    );
    if (!access.ok) {
      return access;
    }

    const alreadyWishlisted = wishlist.includes(listingId);

    if (!isSupabaseConfigured || !currentUserId) {
      setWishlist((current) =>
        alreadyWishlisted
          ? current.filter((id) => id !== listingId)
          : [...current, listingId],
      );
      return { ok: true };
    }

    if (alreadyWishlisted) {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", currentUserId)
        .eq("listing_id", listingId);

      if (error) {
        return { ok: false, error: error.message };
      }
    } else {
      const { error } = await supabase.from("wishlists").insert({
        user_id: currentUserId,
        listing_id: listingId,
      });

      if (error) {
        return { ok: false, error: error.message };
      }
    }

    setWishlist((current) =>
      alreadyWishlisted
        ? current.filter((id) => id !== listingId)
        : [...current, listingId],
    );

    return { ok: true };
  }

  async function toggleSellerFollow(sellerId) {
    if (!currentUserId || !currentUserRecord) {
      return { ok: false, error: "You must be logged in to follow a seller." };
    }

    if (String(sellerId || "") === String(currentUserId || "")) {
      return { ok: false, error: "You cannot follow your own seller page." };
    }

    const access = ensureAccountActive(
      "This account is suspended. Browsing is still available, but follow alerts are disabled.",
    );
    if (!access.ok) {
      return access;
    }

    const alreadyFollowing = followedSellerSet.has(sellerId);
    const previousFollowedSellerIds = followedSellerIds;
    const nextFollowedSellerIds = alreadyFollowing
      ? followedSellerIds.filter((id) => id !== sellerId)
      : [...followedSellerIds, sellerId];

    const rollbackFollow = () => {
      setUsers((current) =>
        current.map((user) =>
          user.id === currentUserId
            ? normalizeUserRecord({ ...user, followedSellerIds: previousFollowedSellerIds })
            : user,
        ),
      );
    };

    setUsers((current) =>
      current.map((user) =>
        user.id === currentUserId
          ? normalizeUserRecord({ ...user, followedSellerIds: nextFollowedSellerIds })
          : user,
      ),
    );

    if (!isSupabaseConfigured) {
      return { ok: true, followed: !alreadyFollowing };
    }

    const authUpdateResult = await supabase.auth.updateUser({
      data: {
        followed_seller_ids: nextFollowedSellerIds,
      },
    });

    if (authUpdateResult.error) {
      rollbackFollow();
      return { ok: false, error: authUpdateResult.error.message };
    }

    const profilePayload = {
      followed_seller_ids: nextFollowedSellerIds,
      updated_at: new Date().toISOString(),
    };

    let updateResult = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("id", currentUserId);

    const missingFollowedSellersColumn =
      Boolean(updateResult.error) && isMissingColumnError(updateResult.error, "followed_seller_ids");

    if (updateResult.error && missingFollowedSellersColumn) {
      const legacyProfilePayload = omitMissingProfileColumns(profilePayload, updateResult.error);
      updateResult = await supabase
        .from("profiles")
        .update(legacyProfilePayload)
        .eq("id", currentUserId);
    }

    if (updateResult.error) {
      rollbackFollow();
      return { ok: false, error: updateResult.error.message };
    }

    return { ok: true, followed: !alreadyFollowing };
  }

  async function toggleStoreFollow(storeSlug) {
    if (!currentUserId || !currentUserRecord) {
      return { ok: false, error: "You must be logged in to follow a store." };
    }

    const normalizedSlug = String(storeSlug || "").trim();
    if (!normalizedSlug) {
      return { ok: false, error: "Store not found." };
    }

    const access = ensureAccountActive(
      "This account is suspended. Store follows are disabled until the suspension is lifted.",
    );
    if (!access.ok) {
      return access;
    }

    const alreadyFollowing = followedStoreSet.has(normalizedSlug);
    const previousFollowedStoreSlugs = followedStoreSlugs;
    const nextFollowedStoreSlugs = alreadyFollowing
      ? followedStoreSlugs.filter((slug) => slug !== normalizedSlug)
      : [...followedStoreSlugs, normalizedSlug];

    const rollbackStoreFollow = () => {
      setFollowedStoreSlugs(previousFollowedStoreSlugs);
      setUsers((current) =>
        current.map((user) =>
          user.id === currentUserId
            ? normalizeUserRecord({ ...user, followedStoreSlugs: previousFollowedStoreSlugs })
            : user,
        ),
      );
    };

    setFollowedStoreSlugs(nextFollowedStoreSlugs);
    setUsers((current) =>
      current.map((user) =>
        user.id === currentUserId
          ? normalizeUserRecord({ ...user, followedStoreSlugs: nextFollowedStoreSlugs })
          : user,
      ),
    );

    if (isSupabaseConfigured) {
      const authUpdateResult = await supabase.auth.updateUser({
        data: {
          followed_store_slugs: nextFollowedStoreSlugs,
        },
      });

      if (authUpdateResult.error) {
        rollbackStoreFollow();
        return { ok: false, error: authUpdateResult.error.message };
      }

      const profilePayload = {
        followed_store_slugs: nextFollowedStoreSlugs,
        updated_at: new Date().toISOString(),
      };

      let updateResult = await supabase
        .from("profiles")
        .update(profilePayload)
        .eq("id", currentUserId);

      if (
        updateResult.error &&
        isMissingColumnError(updateResult.error, "followed_store_slugs")
      ) {
        const legacyProfilePayload = omitMissingProfileColumns(profilePayload, updateResult.error);
        updateResult = await supabase
          .from("profiles")
          .update(legacyProfilePayload)
          .eq("id", currentUserId);
      }

      if (updateResult.error) {
        rollbackStoreFollow();
        return { ok: false, error: updateResult.error.message };
      }
    }

    return { ok: true, followed: !alreadyFollowing };
  }

  async function toggleEventReminder(eventId) {
    if (!currentUserId || !currentUserRecord) {
      return { ok: false, error: "You must be logged in to save an event reminder." };
    }

    const normalizedEventId = String(eventId || "").trim();
    if (!normalizedEventId) {
      return { ok: false, error: "Event not found." };
    }

    const access = ensureAccountActive(
      "This account is suspended. Event reminders are disabled until the suspension is lifted.",
    );
    if (!access.ok) {
      return access;
    }

    const alreadyEnabled = eventReminderIdSet.has(normalizedEventId);
    const nextReminderIds = alreadyEnabled
      ? eventReminderIds.filter((id) => id !== normalizedEventId)
      : [...eventReminderIds, normalizedEventId];

    if (!isSupabaseConfigured) {
      setEventReminderIds(nextReminderIds);
      return { ok: true, enabled: !alreadyEnabled };
    }

    const nextIntent = eventAttendance[normalizedEventId] || null;
    if (!nextIntent && alreadyEnabled) {
      const { error } = await supabase
        .from("user_event_preferences")
        .delete()
        .eq("user_id", currentUserId)
        .eq("event_id", normalizedEventId);

      if (error) {
        return { ok: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from("user_event_preferences")
        .upsert({
          user_id: currentUserId,
          event_id: normalizedEventId,
          reminder_enabled: !alreadyEnabled,
          attendance_intent: nextIntent,
          updated_at: new Date().toISOString(),
        })
        .select("event_id")
        .single();

      if (error) {
        return { ok: false, error: error.message };
      }
    }

    setEventReminderIds(nextReminderIds);
    return { ok: true, enabled: !alreadyEnabled };
  }

  async function setEventAttendanceIntent(eventId, intent) {
    if (!currentUserId || !currentUserRecord) {
      return { ok: false, error: "You must be logged in to set event intent." };
    }

    const normalizedEventId = String(eventId || "").trim();
    const normalizedIntent = String(intent || "").trim().toLowerCase();
    if (!normalizedEventId) {
      return { ok: false, error: "Event not found." };
    }

    const access = ensureAccountActive(
      "This account is suspended. Event attendance intent is disabled until the suspension is lifted.",
    );
    if (!access.ok) {
      return access;
    }

    const existingIntent = eventAttendance[normalizedEventId] || "";
    const nextAttendance = { ...eventAttendance };
    if (!normalizedIntent || existingIntent === normalizedIntent) {
      delete nextAttendance[normalizedEventId];
    } else {
      nextAttendance[normalizedEventId] = normalizedIntent;
    }

    const nextReminderEnabled = eventReminderIdSet.has(normalizedEventId);

    if (!isSupabaseConfigured) {
      setEventAttendance(nextAttendance);
      return { ok: true, intent: nextAttendance[normalizedEventId] || null };
    }

    if (!nextAttendance[normalizedEventId] && !nextReminderEnabled) {
      const { error } = await supabase
        .from("user_event_preferences")
        .delete()
        .eq("user_id", currentUserId)
        .eq("event_id", normalizedEventId);

      if (error) {
        return { ok: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from("user_event_preferences")
        .upsert({
          user_id: currentUserId,
          event_id: normalizedEventId,
          reminder_enabled: nextReminderEnabled,
          attendance_intent: nextAttendance[normalizedEventId] || null,
          updated_at: new Date().toISOString(),
        })
        .select("event_id")
        .single();

      if (error) {
        return { ok: false, error: error.message };
      }
    }

    setEventAttendance(nextAttendance);

    return { ok: true, intent: nextAttendance[normalizedEventId] || null };
  }

  async function addReview(payload) {
    if (!currentUser) {
      return { ok: false, error: "You must be logged in to leave a review." };
    }

    const access = ensureAccountActive();
    if (!access.ok) {
      return access;
    }

    if (!String(payload.comment || "").trim()) {
      return { ok: false, error: "Review comment is required." };
    }

    if (String(payload.sellerId || "") === String(currentUser.id || "")) {
      return { ok: false, error: "You cannot leave a review on your own seller profile." };
    }

    if (!isSupabaseConfigured) {
      const review = {
        id: `review-${Date.now()}`,
        sellerId: payload.sellerId,
        authorId: currentUser.id,
        author: currentUser.username || currentUser.publicName || currentUser.name,
        rating: Number(payload.rating) || 5,
        comment: String(payload.comment || "").trim(),
        imageUrl: payload.imageUrl || "",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setReviews((current) => [review, ...current]);
      return { ok: true, review };
    }

    const reviewPayload = {
      seller_id: payload.sellerId,
      author_id: currentUser.id,
      author_name: currentUser.username || currentUser.publicName || currentUser.name,
      rating: Number(payload.rating) || 5,
      comment: String(payload.comment || "").trim(),
      image_url: payload.imageUrl || null,
    };

    let insertResult = await supabase
      .from("reviews")
      .insert(reviewPayload)
      .select("*")
      .single();

    if (insertResult.error && isMissingColumnError(insertResult.error, "image_url")) {
      const { image_url, ...legacyReviewPayload } = reviewPayload;
      insertResult = await supabase
        .from("reviews")
        .insert(legacyReviewPayload)
        .select("*")
        .single();
    }

    const { data, error } = insertResult;

    if (error) {
      return { ok: false, error: error.message };
    }

    await pushNotification({
      userId: payload.sellerId,
      type: "review-posted",
      title: "New seller review",
      body: `${currentUser.username || currentUser.publicName || currentUser.name} left you a ${Number(payload.rating) || 5}-star review.`,
      entityId: payload.sellerId,
    });
    await refreshMarketplaceData(currentUserId);
    return { ok: true, review: fromReviewRow(data) };
  }

  async function deleteReview(reviewId) {
    const review = reviews.find((item) => item.id === reviewId);
    if (!review) {
      return { ok: false, error: "Review not found." };
    }

    if (!currentUserRecord || currentUserRecord.role !== "admin") {
      return { ok: false, error: "Only admins can remove reviews." };
    }

    if (!isSupabaseConfigured) {
      setReviews((current) => current.filter((item) => item.id !== reviewId));
      pushAdminAuditEntry({
        action: "review-delete",
        title: "Removed seller review",
        details: review.comment,
        targetId: reviewId,
        targetType: "review",
      });
      return { ok: true };
    }

    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId, { silent: true });
    pushAdminAuditEntry({
      action: "review-delete",
      title: "Removed seller review",
      details: review.comment,
      targetId: reviewId,
      targetType: "review",
    });
    return { ok: true };
  }

  function getThreadById(threadId) {
    return threadsForCurrentUser.find((thread) => thread.id === threadId) || null;
  }

  async function uploadMessagePhotos(threadId, files = []) {
    const validFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    if (!validFiles.length) {
      return { ok: true, attachments: [] };
    }

    for (const file of validFiles) {
      if (!String(file.type || "").startsWith("image/")) {
        return { ok: false, error: "Chat attachments must be image files." };
      }

    }

    const preparedFiles = await Promise.all(
      validFiles.map((file) =>
        compressChatImage(file, {
          maxDimension: 1800,
          targetBytes: 2_400_000,
          hardLimitBytes: 5_500_000,
        }),
      ),
    );

    for (const file of preparedFiles) {
      if (Number(file.size || 0) > 5_500_000) {
        return {
          ok: false,
          error: "A chat photo is still too large after compression. Try a smaller image.",
        };
      }
    }

    if (!isSupabaseConfigured) {
      const attachments = await Promise.all(
        preparedFiles.map(async (file, index) => ({
          id: `attachment-${Date.now()}-${index + 1}`,
          url: await readFileAsDataUrl(file),
          name: file.name || `Photo ${index + 1}`,
          type: file.type || "image/jpeg",
        })),
      );
      return { ok: true, attachments };
    }

    try {
      const attachments = [];
      for (const [index, file] of preparedFiles.entries()) {
        const extension = getFileExtension(file.name, file.type);
        const filePath = `chat/${threadId}/${currentUserId}/${Date.now()}-${index + 1}.${extension}`;
          const uploadResult = await retryStorageUpload(
            () =>
              supabase.storage.from(MEDIA_BUCKET).upload(filePath, file, {
                cacheControl: "3600",
                upsert: true,
                contentType: file.type || undefined,
              })
                .then(({ data, error }) => {
                  if (error) {
                    throw error;
                  }
                  return { data };
                }),
            { retries: 2, retryDelayMs: 300 },
          ).catch((error) => ({ error }));

          if (uploadResult.error) {
            return {
            ok: false,
            error:
              uploadResult.error.message ||
              "Photo upload failed. Make sure the listing-media bucket allows authenticated uploads.",
          };
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);

        attachments.push({
          id: `attachment-${Date.now()}-${index + 1}`,
          url: publicUrl,
          name: file.name || `Photo ${index + 1}`,
          type: file.type || "image/jpeg",
        });
      }

      return { ok: true, attachments };
    } catch (error) {
      return {
        ok: false,
        error: error?.message || "Photo upload failed.",
      };
    }
  }

  async function findOrCreateThreadInternal({ participantIds, listingId = null }) {
    const uniqueParticipantIds = [...new Set(participantIds.filter(Boolean))];

    if (!uniqueParticipantIds.length || !currentUserId) {
      return { ok: false, error: "Conversation participants are missing." };
    }

    const existingThread =
      threads.find((thread) => {
        const sameListing = String(thread.listingId || "") === String(listingId || "");
        return sameListing && sameParticipantSet(thread.participantIds, uniqueParticipantIds);
      }) || null;

    if (existingThread) {
      return { ok: true, thread: existingThread };
    }

    if (!isSupabaseConfigured) {
      const thread = {
        id: `thread-${Date.now()}`,
        participantIds: uniqueParticipantIds,
        listingId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      setThreads((current) => [thread, ...current]);
      return { ok: true, thread };
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await apiRequest("/api/messages/threads", {
        method: "POST",
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
        body: JSON.stringify({
          listingId,
          participantIds: uniqueParticipantIds,
        }),
      });

      const existingServerThread =
        threads.find((thread) => String(thread.id) === String(response.thread?.id)) || null;
      const thread = mapThreadRow(response.thread, existingServerThread);
      setThreads((current) => {
        const alreadyExists = current.some((item) => String(item.id) === String(thread.id));
        if (alreadyExists) {
          return current.map((item) => (String(item.id) === String(thread.id) ? thread : item));
        }
        return [thread, ...current];
      });
      return { ok: true, thread };
    } catch (error) {
      if (!shouldFallbackToClientMutation(error, ["request failed", "failed to fetch"])) {
        return { ok: false, error: error.message };
      }
    }

    const { data, error } = await supabase
      .from("message_threads")
      .insert({
        listing_id: listingId,
        participant_ids: uniqueParticipantIds,
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    const thread = {
      ...mapThreadRow(data),
      messages: [],
    };

    setThreads((current) => [thread, ...current]);
    return { ok: true, thread };
  }

  async function findOrCreateThread({ otherUserId, listingId = null, participantIds = null }) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to message sellers." };
    }

    if (otherUserId && String(otherUserId) === String(currentUserId)) {
      return { ok: false, error: "You cannot message yourself from your own listing." };
    }

    const nextParticipants = participantIds || [currentUserId, otherUserId];
    const result = await findOrCreateThreadInternal({
      participantIds: nextParticipants,
      listingId,
    });

    if (result.ok && result.thread?.id) {
      setHiddenThreadMap((current) => {
        if (!current[result.thread.id]) {
          return current;
        }

        const next = { ...current };
        delete next[result.thread.id];
        return next;
      });
    }

    return result;
  }

  async function markThreadRead(threadId, options = {}) {
    const thread =
      threads.find((item) => item.id === threadId) ||
      options.thread ||
      null;
    if (!thread || !currentUserId) {
      return { ok: false, error: "Conversation not found." };
    }

    const unreadMessages = thread.messages.filter(
      (message) =>
        message.senderId !== currentUserId && !(message.readBy || []).includes(currentUserId),
    );

    if (!unreadMessages.length) {
      return { ok: true };
    }

    setThreads((current) =>
      current.map((item) =>
        item.id === threadId
          ? {
              ...item,
              messages: item.messages.map((message) =>
                unreadMessages.some((candidate) => candidate.id === message.id)
                  ? {
                      ...message,
                      readBy: [...new Set([...(message.readBy || []), currentUserId])],
                    }
                  : message,
              ),
            }
          : item,
      ),
    );
    setNotifications((current) =>
      current.map((notification) =>
        notification.userId === currentUserId &&
        notification.type === "message" &&
        notification.entityId === threadId
          ? normalizeNotificationRecord({ ...notification, read: true })
          : notification,
      ),
    );

    if (!isSupabaseConfigured) {
      return { ok: true };
    }

    const readUpdates = await Promise.all(
      unreadMessages.map(async (message) => {
        const { error } = await supabase
          .from("messages")
          .update({
            read_by: [...new Set([...(message.readBy || []), currentUserId])],
          })
          .eq("id", message.id);

        if (error) {
          throw error;
        }
      }),
    ).catch((error) => ({ error }));

    if (readUpdates?.error) {
      console.error("markThreadRead message update failed:", readUpdates.error);
      return { ok: false, error: readUpdates.error.message };
    }

    const { error: notificationError } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", currentUserId)
      .eq("type", "message")
      .eq("entity_id", threadId);

    if (notificationError) {
      console.error("markThreadRead notification update failed:", notificationError);
      return { ok: false, error: notificationError.message };
    }

    return { ok: true };
  }

  async function sendMessage(threadId, body, options = {}) {
    const messageInput =
      body && typeof body === "object" && !Array.isArray(body)
        ? body
        : { text: String(body || "") };
    const trimmedText = String(messageInput.text || "").trim();
    const pendingFiles = Array.isArray(messageInput.files) ? messageInput.files : [];

    const access = options.system
      ? { ok: true }
      : ensureAccountActive(
          "This account is suspended. Messaging is disabled until the suspension is lifted.",
        );
      if (!access.ok) {
        return access;
      }

      if (!options.system) {
        const rateGuard = guardMutationRate("messageSend", `${currentUserId || "anonymous"}:${threadId}`);
        if (!rateGuard.ok) {
          return rateGuard;
        }
      }

      const thread = threads.find((item) => item.id === threadId);
    if (!thread || !currentUserId) {
      return { ok: false, error: "Conversation not found." };
    }

    const uploadResult = await uploadMessagePhotos(threadId, pendingFiles);
    if (!uploadResult.ok) {
      return uploadResult;
    }

    const attachments = uploadResult.attachments || [];
    if (!trimmedText && !attachments.length) {
      return { ok: false, error: "Message cannot be empty." };
    }

    const otherParticipantIds = thread.participantIds.filter((id) => id !== currentUserId);
    const createdAt = new Date().toISOString();
    const optimisticMessageId = `message-pending-${Date.now()}`;
    const encodedBody = buildMessageBody({
      text: trimmedText,
      attachments,
    });
    const optimisticMessage = {
      id: optimisticMessageId,
      senderId: options.senderId || currentUserId,
      body: trimmedText || `${attachments.length} photo${attachments.length === 1 ? "" : "s"}`,
      rawBody: encodedBody,
      text: trimmedText,
      attachments,
      isRich: attachments.length > 0,
      sentAt: createdAt,
      readBy: [currentUserId],
    };

    setHiddenThreadMap((current) => {
      if (!current[threadId]) {
        return current;
      }

      const next = { ...current };
      delete next[threadId];
      return next;
    });

    if (!isSupabaseConfigured) {
      setThreads((current) =>
        current.map((item) =>
          item.id === threadId
            ? {
                ...item,
                updatedAt: createdAt,
                messages: [
                  ...item.messages,
                  {
                    id: `message-${Date.now()}`,
                    senderId: options.senderId || currentUserId,
                    body: trimmedText || `${attachments.length} photo${attachments.length === 1 ? "" : "s"}`,
                    rawBody: encodedBody,
                    text: trimmedText,
                    attachments,
                    isRich: attachments.length > 0,
                    sentAt: createdAt,
                    readBy: [currentUserId],
                  },
                ],
              }
            : item,
        ),
      );
      return { ok: true };
    }

    setThreads((current) =>
      current.map((item) =>
        item.id === threadId
          ? {
              ...item,
              updatedAt: createdAt,
              messages: [...item.messages, optimisticMessage],
            }
          : item,
      ),
    );

    let insertedMessage = null;
    let usedBackendRoute = false;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await apiRequest(`/api/messages/threads/${threadId}/messages`, {
        method: "POST",
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
        body: JSON.stringify({
          body: encodedBody,
        }),
      });

      insertedMessage = response.message;
      usedBackendRoute = true;
    } catch (error) {
      if (!shouldFallbackToClientMutation(error, ["request failed", "failed to fetch"])) {
        setThreads((current) =>
          current.map((item) =>
            item.id === threadId
              ? {
                  ...item,
                  messages: item.messages.filter((message) => message.id !== optimisticMessageId),
                }
              : item,
          ),
        );
        return { ok: false, error: error.message };
      }
    }

    if (!insertedMessage) {
      const { data: fallbackMessage, error: messageError } = await supabase
        .from("messages")
        .insert({
          thread_id: threadId,
          sender_id: options.senderId || currentUserId,
          body: encodedBody,
          read_by: [currentUserId],
        })
        .select("*")
        .single();

      if (messageError || !fallbackMessage) {
        setThreads((current) =>
          current.map((item) =>
            item.id === threadId
              ? {
                  ...item,
                  messages: item.messages.filter((message) => message.id !== optimisticMessageId),
                }
              : item,
          ),
        );
        return { ok: false, error: messageError.message };
      }

      insertedMessage = fallbackMessage;
    }

    setThreads((current) =>
      current.map((item) =>
        item.id === threadId
          ? {
              ...item,
              updatedAt: createdAt,
              messages: item.messages.map((message) =>
                message.id === optimisticMessageId ? mapMessageRow(insertedMessage) : message,
              ),
            }
          : item,
      ),
    );

    if (!usedBackendRoute) {
      const { error: threadError } = await supabase
        .from("message_threads")
        .update({ updated_at: createdAt })
        .eq("id", threadId);

      if (threadError) {
        setThreads((current) =>
          current.map((item) =>
            item.id === threadId
              ? {
                  ...item,
                  messages: item.messages.filter((message) => message.id !== optimisticMessageId),
                }
              : item,
          ),
        );
        return { ok: false, error: threadError.message };
      }

      await Promise.all(
        otherParticipantIds.map((userId) =>
          pushNotification({
            userId,
            type: "message",
            title: "New message",
            body: `${currentUser?.publicName || currentUser?.name || "A buyer"} sent a new message.`,
            entityId: threadId,
          }),
        ),
      );
    }

    window.setTimeout(() => {
      void refreshMarketplaceData(currentUserId, { silent: true });
    }, 250);
    return { ok: true };
  }

  async function hideThreadForCurrentUser(threadId) {
    if (!currentUserId || !threadId) {
      return { ok: false, error: "Conversation not found." };
    }

    const hiddenAt = new Date().toISOString();
    const targetThread = threads.find((thread) => thread.id === threadId) || null;
    const previousHiddenAt = hiddenThreadMap[threadId] || targetThread?.hiddenBy?.[currentUserId] || null;
    const previousHiddenBy = { ...(targetThread?.hiddenBy || {}) };
    const removedNotifications = notifications.filter(
      (notification) =>
        notification.userId === currentUserId &&
        notification.type === "message" &&
        notification.entityId === threadId,
    );
    const nextHiddenBy = {
      ...(targetThread?.hiddenBy || {}),
      [currentUserId]: hiddenAt,
    };

    const rollbackHideThread = () => {
      setHiddenThreadMap((current) => {
        const next = { ...current };
        if (previousHiddenAt) {
          next[threadId] = previousHiddenAt;
        } else {
          delete next[threadId];
        }
        return next;
      });
      setThreads((current) =>
        current.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                hiddenBy: previousHiddenBy,
              }
            : thread,
        ),
      );
      if (removedNotifications.length) {
        setNotifications((current) => {
          const existingIds = new Set(current.map((notification) => notification.id));
          return [...removedNotifications.filter((notification) => !existingIds.has(notification.id)), ...current];
        });
      }
    };

    setHiddenThreadMap((current) => ({
      ...current,
      [threadId]: hiddenAt,
    }));
    setThreads((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              hiddenBy: {
                ...(thread.hiddenBy || {}),
                [currentUserId]: hiddenAt,
              },
            }
          : thread,
      ),
    );
    setNotifications((current) =>
      current.filter(
        (notification) =>
          !(
            notification.userId === currentUserId &&
            notification.type === "message" &&
            notification.entityId === threadId
        ),
      ),
    );

    if (isSupabaseConfigured) {
      const [threadUpdate, notificationUpdate] = await Promise.all([
        supabase
          .from("message_threads")
          .update({
            hidden_by: nextHiddenBy,
          })
          .eq("id", threadId),
        supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", currentUserId)
          .eq("type", "message")
          .eq("entity_id", threadId),
      ]);

      if (threadUpdate.error && !isMissingColumnError(threadUpdate.error, "hidden_by")) {
        rollbackHideThread();
        return { ok: false, error: threadUpdate.error.message };
      }

      if (notificationUpdate.error) {
        rollbackHideThread();
        return { ok: false, error: notificationUpdate.error.message };
      }
    }

    return { ok: true };
  }

  async function createOffer(payload) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to make an offer." };
    }

    const access = ensureAccountActive(
      "This account is suspended. Offers are disabled until the suspension is lifted.",
    );
      if (!access.ok) {
        return access;
      }

      const rateGuard = guardMutationRate("createOffer", `${currentUserId || "anonymous"}:${payload.listingId || "listing"}`);
      if (!rateGuard.ok) {
        return rateGuard;
      }

      const listing = listings.find((item) => item.id === payload.listingId);
    if (!listing) {
      return { ok: false, error: "Listing not found." };
    }

    if (listing.sellerId === currentUserId) {
      return { ok: false, error: "You cannot offer on your own listing." };
    }

    const normalizedTradeItems = Array.isArray(payload.tradeItems)
      ? payload.tradeItems.filter(Boolean)
      : [];
    const normalizedCashAmount = Number(payload.cashAmount) || 0;

    if (payload.offerType !== "trade" && normalizedCashAmount <= 0) {
      return { ok: false, error: "Cash offers need a valid amount." };
    }

    if (payload.offerType !== "cash" && normalizedTradeItems.length === 0) {
      return { ok: false, error: "Trade offers need at least one trade item." };
    }

    const threadResult = await findOrCreateThread({
      otherUserId: listing.sellerId,
      listingId: payload.listingId,
    });

    if (!threadResult.ok) {
      return threadResult;
    }

      if (!isSupabaseConfigured) {
        const offer = normalizeOfferRecord({
          id: `offer-${Date.now()}`,
          listingId: payload.listingId,
          sellerId: listing.sellerId,
          buyerId: currentUserId,
          offerType: payload.offerType,
          cashAmount: normalizedCashAmount,
          tradeItems: normalizedTradeItems,
          note: String(payload.note || "").trim(),
          status: "pending",
          lastActorId: currentUserId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      setOffers((current) => [offer, ...current]);
      setListings((current) =>
        current.map((item) =>
          item.id === payload.listingId
            ? normalizeListingRecord({ ...item, offers: Number(item.offers || 0) + 1 })
            : item,
        ),
      );
      await sendMessage(
        threadResult.thread.id,
        buildOfferMessage({
          buyerName: currentUser?.publicName || currentUser?.name,
          offerType: payload.offerType,
          cashAmount: normalizedCashAmount,
          tradeItems: normalizedTradeItems,
          note: payload.note,
        }),
        { thread: threadResult.thread },
      );
      return { ok: true, offer, threadId: threadResult.thread.id };
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await apiRequest("/api/offers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          listingId: payload.listingId,
          offerType: payload.offerType,
          cashAmount: normalizedCashAmount,
          tradeItems: normalizedTradeItems,
          note: String(payload.note || "").trim(),
        }),
      });

      await sendMessage(
        threadResult.thread.id,
        buildOfferMessage({
          buyerName: currentUser?.publicName || currentUser?.name,
          offerType: payload.offerType,
          cashAmount: normalizedCashAmount,
          tradeItems: normalizedTradeItems,
          note: payload.note,
        }),
        { system: true, thread: threadResult.thread },
      );

      await refreshMarketplaceData(currentUserId, { silent: true });
      return { ok: true, offer: fromOfferRow(response.offer), threadId: threadResult.thread.id };
    } catch (error) {
      if (!shouldFallbackToClientMutation(error)) {
        return { ok: false, error: error.message };
      }
    }

    const offerInsertPayload = {
      listing_id: payload.listingId,
      seller_id: listing.sellerId,
      buyer_id: currentUserId,
      offer_type: payload.offerType,
      cash_amount: normalizedCashAmount,
      trade_items: normalizedTradeItems,
      note: String(payload.note || "").trim(),
      last_actor_id: currentUserId,
    };

    let insertResult = await supabase
      .from("offers")
      .insert(offerInsertPayload)
      .select("*")
      .single();

    if (insertResult.error && isMissingColumnError(insertResult.error, "last_actor_id")) {
      insertResult = await supabase
        .from("offers")
        .insert(omitMissingOfferColumns(offerInsertPayload, insertResult.error))
        .select("*")
        .single();
    }

    const { data, error } = insertResult;

    if (error) {
      return { ok: false, error: error.message };
    }

    const nextOfferCount = Number(listing.offers || 0) + 1;
    await supabase
      .from("listings")
      .update({ offers: nextOfferCount, updated_at: new Date().toISOString() })
      .eq("id", payload.listingId);

    await pushNotification({
      userId: listing.sellerId,
      type: "offer-received",
      title: "New offer received",
      body: `${currentUser?.publicName || currentUser?.name || "A buyer"} sent an offer on ${listing.title}.`,
      entityId: payload.listingId,
    });

    await sendMessage(
      threadResult.thread.id,
      buildOfferMessage({
        buyerName: currentUser?.publicName || currentUser?.name,
        offerType: payload.offerType,
        cashAmount: normalizedCashAmount,
        tradeItems: normalizedTradeItems,
        note: payload.note,
      }),
      { system: true, thread: threadResult.thread },
    );

    await refreshMarketplaceData(currentUserId, { silent: true });
    return { ok: true, offer: fromOfferRow(data), threadId: threadResult.thread.id };
  }

  async function respondToOffer(offerId, action, counterPayload = {}) {
      const offer = offers.find((item) => item.id === offerId);
      if (!offer || !currentUserId) {
        return { ok: false, error: "Offer not found." };
      }

    const access = ensureAccountActive();
      if (!access.ok) {
        return access;
      }

        const rateGuard = guardMutationRate("respondToOffer", `${currentUserId || "anonymous"}:${offerId}`);
        if (!rateGuard.ok) {
          return rateGuard;
        }

    const transition = resolveOfferResponse(offer, currentUserId, action, counterPayload);
    if (!transition.ok) {
      return transition;
    }

    const {
      nextStatus,
      nextOfferType,
      nextCashAmount,
      nextTradeItems,
      nextNote,
      nextUpdatedAt,
      updatePayload,
    } = transition;
    const counterpartyUserId = getOfferCounterpartyId(offer, currentUserId);

    if (!isSupabaseConfigured) {
      setOffers((current) =>
        current.map((item) =>
          item.id === offerId
            ? normalizeOfferRecord({
                ...item,
                status: nextStatus,
                offerType: nextOfferType,
                  cashAmount: nextCashAmount,
                  tradeItems: nextTradeItems,
                  note: nextNote,
                  lastActorId: currentUserId,
                  updatedAt: nextUpdatedAt,
                })
              : item,
        ),
      );
      return { ok: true };
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await apiRequest(`/api/offers/${offerId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          action,
          counterPayload,
        }),
      });

      const threadResult = await findOrCreateThread({
        otherUserId: counterpartyUserId,
        listingId: offer.listingId,
      });
      if (threadResult.ok) {
        await sendMessage(
          threadResult.thread.id,
          buildOfferMessage({
            buyerName: currentUser?.publicName || currentUser?.name || "Seller",
            offerType: nextOfferType,
            cashAmount: nextCashAmount,
            tradeItems: nextTradeItems,
            note: nextNote,
            status: nextStatus,
          }),
          { system: true, thread: threadResult.thread },
        );
      }

      await refreshMarketplaceData(currentUserId, { silent: true });
      return { ok: true };
    } catch (error) {
      if (!shouldFallbackToClientMutation(error)) {
        return { ok: false, error: error.message };
      }
    }

    let updateResult = await supabase.from("offers").update(updatePayload).eq("id", offerId);

    if (updateResult.error && isMissingColumnError(updateResult.error, "last_actor_id")) {
      updateResult = await supabase
        .from("offers")
        .update(omitMissingOfferColumns(updatePayload, updateResult.error))
        .eq("id", offerId);
    }

    const { error } = updateResult;

    if (error) {
      return { ok: false, error: error.message };
    }

    if (nextStatus === "accepted") {
      const sellerRow = users.find((user) => user.id === offer.sellerId);
      const buyerRow = users.find((user) => user.id === offer.buyerId);

      if (sellerRow) {
        await supabase
          .from("profiles")
          .update({ completed_deals: Number(sellerRow.completedDeals || 0) + 1 })
          .eq("id", offer.sellerId);
      }

      if (buyerRow) {
        await supabase
          .from("profiles")
          .update({ completed_deals: Number(buyerRow.completedDeals || 0) + 1 })
          .eq("id", offer.buyerId);
      }
    }

    await pushNotification({
      userId: counterpartyUserId,
      type:
        nextStatus === "accepted"
          ? "offer-accepted"
          : nextStatus === "declined"
            ? "offer-declined"
            : "offer-countered",
      title:
        nextStatus === "accepted"
          ? "Offer accepted"
          : nextStatus === "declined"
            ? "Offer declined"
            : "Counter offer received",
      body:
        nextStatus === "countered"
          ? `${currentUser?.publicName || currentUser?.name || "Seller"} sent a counter offer.`
          : `${currentUser?.publicName || currentUser?.name || "Seller"} ${nextStatus} your offer.`,
      entityId: offer.listingId,
    });

    const threadResult = await findOrCreateThread({
      otherUserId: counterpartyUserId,
      listingId: offer.listingId,
    });
    if (threadResult.ok) {
      await sendMessage(
        threadResult.thread.id,
        buildOfferMessage({
          buyerName: currentUser?.publicName || currentUser?.name || "Seller",
          offerType: nextOfferType,
          cashAmount: nextCashAmount,
          tradeItems: nextTradeItems,
          note: nextNote,
          status: nextStatus,
        }),
        { system: true, thread: threadResult.thread },
      );
    }

    await refreshMarketplaceData(currentUserId, { silent: true });
    return { ok: true };
  }

  async function submitReport(payload) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to submit a report." };
    }

    const access = ensureAccountActive(
      "This account is suspended. Reporting stays disabled until the suspension is reviewed.",
    );
      if (!access.ok) {
        return access;
      }

      const rateGuard = guardMutationRate(
        "submitReport",
        `${currentUserId || "anonymous"}:${payload.targetType || payload.listingId || payload.sellerId || "report"}`,
      );
      if (!rateGuard.ok) {
        return rateGuard;
      }

      const reasonLabel =
      {
        "fake-card": "Fake or proxy suspected",
        "misleading-condition": "Misleading condition",
        "no-show": "No-show meetup behavior",
        harassment: "Harassment or abusive messages",
        "scam-risk": "Scam risk",
      }[payload.reason] || payload.reason;

    if (!isSupabaseConfigured) {
      const report = normalizeReportRecord({
        id: `report-${Date.now()}`,
        listingId: payload.listingId,
        sellerId: payload.sellerId,
        reporterId: currentUserId,
        reason: reasonLabel,
        details: payload.details,
        status: "open",
        createdAt: new Date().toISOString(),
      });
      setReports((current) => [report, ...current]);
      return { ok: true, report };
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await apiRequest("/api/reports", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          listingId: payload.listingId,
          sellerId: payload.sellerId,
          reason: payload.reason,
          details: payload.details,
          targetType: payload.targetType || "listing",
        }),
      });

      await refreshMarketplaceData(currentUserId);
      return { ok: true, report: fromReportRow(response.report) };
    } catch (error) {
      if (!shouldFallbackToClientMutation(error)) {
        return { ok: false, error: error.message };
      }
    }

    const { data, error } = await supabase
      .from("reports")
      .insert({
        listing_id: payload.listingId,
        seller_id: payload.sellerId,
        reporter_id: currentUserId,
        reason: reasonLabel,
        details: payload.details,
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await Promise.all(
      users
        .filter((user) => user.role === "admin")
        .map((admin) =>
          pushNotification({
            userId: admin.id,
            type: "report-opened",
            title: "New report opened",
            body: `${currentUser?.publicName || currentUser?.name || "A user"} reported a listing for ${reasonLabel}.`,
            entityId: payload.listingId,
          }),
        ),
    );

    await refreshMarketplaceData(currentUserId);
    return { ok: true, report: fromReportRow(data) };
  }

  async function openReportResolutionThread(reportId) {
    const report = reports.find((item) => item.id === reportId);
    if (!report || !currentUserId) {
      return { ok: false, error: "Report not found." };
    }

    const participantIds = [currentUserId, report.reporterId, report.sellerId];
    const threadResult = await findOrCreateThread({
      listingId: report.listingId,
      participantIds,
    });

    if (!threadResult.ok) {
      return threadResult;
    }

    const thread = threadResult.thread;
    const hasContextMessage = (thread.messages || []).some((message) =>
      String(message.body || "").includes(`Report ${report.reason}`),
    );

    if (!hasContextMessage) {
      const listing = listings.find((item) => item.id === report.listingId);
      await sendMessage(
        thread.id,
        `Report ${report.reason} | Listing: ${listing?.title || "Removed listing"} | Details: ${report.details}`,
        { system: true, thread },
      );
    }

    return { ok: true, thread: threadResult.thread };
  }

  async function updateReportStatus(reportId, status) {
    const report = reports.find((item) => item.id === reportId);

    if (!isSupabaseConfigured || !currentUserId) {
      setReports((current) =>
        current.map((report) =>
          report.id === reportId
            ? normalizeReportRecord({
                ...report,
                status,
                updatedAt: new Date().toISOString(),
              })
            : report,
        ),
      );
      pushAdminAuditEntry({
        action: "report-status",
        title: `Marked report ${status}`,
        details: report?.reason || reportId,
        targetId: reportId,
        targetType: "report",
      });
      return { ok: true };
    }

    const { error } = await supabase
      .from("reports")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) {
      return { ok: false, error: error.message };
    }

    if (report) {
      await Promise.all(
        [report.reporterId, report.sellerId].map((userId) =>
          pushNotification({
            userId,
            type: "report-status",
            title: status === "resolved" ? "Report resolved" : "Report dismissed",
            body:
              status === "resolved"
                ? "An admin marked the report as resolved."
                : "An admin dismissed the report after review.",
            entityId: report.listingId,
          }),
        ),
      );
    }

    await refreshMarketplaceData(currentUserId);
    pushAdminAuditEntry({
      action: "report-status",
      title: `Marked report ${status}`,
      details: report?.reason || reportId,
      targetId: reportId,
      targetType: "report",
    });
    return { ok: true };
  }

  async function submitBugReport(payload) {
    if (!currentUserId || !currentUserRecord) {
      return { ok: false, error: "You must be logged in to submit a bug report." };
    }

      if (!isBetaTester) {
        return { ok: false, error: "Only beta testers can access the bug tracker." };
      }

      const rateGuard = guardMutationRate("submitBugReport", currentUserId || "anonymous");
      if (!rateGuard.ok) {
        return rateGuard;
      }

      const title = String(payload.title || "").trim();
    const actualBehavior = String(payload.actualBehavior || "").trim();
    const reproductionSteps = String(payload.reproductionSteps || "").trim();

    if (!title) {
      return { ok: false, error: "Bug title is required." };
    }

    if (!actualBehavior || !reproductionSteps) {
      return {
        ok: false,
        error: "Actual behavior and reproduction steps are required.",
      };
    }

    const nextBugReport = normalizeBugReportRecord({
      id: `bug-${Date.now()}`,
      reporterId: currentUserId,
      title,
      area: payload.area || "general",
      severity: payload.severity || "medium",
      pagePath: String(payload.pagePath || "").trim(),
      expectedBehavior: String(payload.expectedBehavior || "").trim(),
      actualBehavior,
      reproductionSteps,
      environmentLabel: String(payload.environmentLabel || "").trim(),
      screenshotUrl: String(payload.screenshotUrl || "").trim(),
      adminNotes: "",
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!isSupabaseConfigured) {
      setBugReports((current) => [nextBugReport, ...current]);
      return { ok: true, bugReport: nextBugReport, warning: "Saved locally only." };
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await apiRequest("/api/bug-reports", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          title,
          area: payload.area || "general",
          severity: payload.severity || "medium",
          pagePath: String(payload.pagePath || "").trim(),
          expectedBehavior: String(payload.expectedBehavior || "").trim(),
          actualBehavior,
          reproductionSteps,
          environmentLabel: String(payload.environmentLabel || "").trim(),
          screenshotUrl: String(payload.screenshotUrl || "").trim(),
        }),
      });

      await refreshMarketplaceData(currentUserId, { silent: true });
      return { ok: true, bugReport: fromBugReportRow(response.bugReport) };
    } catch (error) {
      if (
        !shouldFallbackToClientMutation(error, ["BUG_REPORTS_TABLE_MISSING"])
      ) {
        return { ok: false, error: error.message };
      }
    }

    const insertPayload = {
      reporter_id: currentUserId,
      title,
      area: payload.area || "general",
      severity: payload.severity || "medium",
      status: "open",
      page_path: String(payload.pagePath || "").trim() || null,
      expected_behavior: String(payload.expectedBehavior || "").trim() || null,
      actual_behavior: actualBehavior,
      reproduction_steps: reproductionSteps,
      environment_label: String(payload.environmentLabel || "").trim() || null,
      screenshot_url: String(payload.screenshotUrl || "").trim() || null,
      admin_notes: null,
    };

    const { data, error } = await supabase
      .from("bug_reports")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error && isMissingTableError(error, "bug_reports")) {
      setBugReports((current) => [nextBugReport, ...current]);
      return {
        ok: true,
        bugReport: nextBugReport,
        warning:
          "Bug report was saved only in this browser because the bug_reports table is not set up in Supabase yet.",
      };
    }

    if (error) {
      return { ok: false, error: error.message };
    }

    await Promise.all(
      users
        .filter((user) => user.role === "admin")
        .map((admin) =>
          pushNotification({
            userId: admin.id,
            type: "bug-opened",
            title: "New beta bug report",
            body: `${currentUserRecord.publicName || currentUserRecord.name} reported: ${title}.`,
            entityId: "/admin",
          }),
        ),
    );

    await refreshMarketplaceData(currentUserId, { silent: true });
    return { ok: true, bugReport: fromBugReportRow(data) };
  }

  async function updateBugReport(reportId, updates) {
    const report = bugReports.find((item) => item.id === reportId);
    if (!report) {
      return { ok: false, error: "Bug report not found." };
    }

    if (!currentUserRecord || currentUserRecord.role !== "admin") {
      return { ok: false, error: "Only admins can update bug reports." };
    }

    const nextStatus = updates.status || report.status;
    const nextSeverity = updates.severity || report.severity;
    const nextAdminNotes =
      updates.adminNotes !== undefined ? String(updates.adminNotes || "") : report.adminNotes;
    const nextUpdatedAt = new Date().toISOString();

    const nextBugReport = normalizeBugReportRecord({
      ...report,
      status: nextStatus,
      severity: nextSeverity,
      adminNotes: nextAdminNotes,
      updatedAt: nextUpdatedAt,
    });

    if (!isSupabaseConfigured) {
      setBugReports((current) =>
        current.map((item) => (item.id === reportId ? nextBugReport : item)),
      );
      pushAdminAuditEntry({
        action: "bug-update",
        title: "Updated bug report",
        details: `${report.title} -> ${nextStatus}/${nextSeverity}`,
        targetId: reportId,
        targetType: "bug-report",
      });
      return { ok: true, bugReport: nextBugReport };
    }

    const { data, error } = await supabase
      .from("bug_reports")
      .update({
        status: nextStatus,
        severity: nextSeverity,
        admin_notes: nextAdminNotes || null,
        updated_at: nextUpdatedAt,
      })
      .eq("id", reportId)
      .select("*")
      .single();

    if (error && isMissingTableError(error, "bug_reports")) {
      setBugReports((current) =>
        current.map((item) => (item.id === reportId ? nextBugReport : item)),
      );
      return {
        ok: true,
        bugReport: nextBugReport,
        warning:
          "Bug report was updated only in this browser because the bug_reports table is not set up in Supabase yet.",
      };
    }

    if (error) {
      return { ok: false, error: error.message };
    }

    if (report.reporterId) {
      await pushNotification({
        userId: report.reporterId,
        type: "bug-status",
        title: "Bug report updated",
        body: `${titleCaseWords(nextStatus.replace("-", " "))} | ${report.title}`,
        entityId: "/beta/bugs",
      });
    }

    await refreshMarketplaceData(currentUserId, { silent: true });
    pushAdminAuditEntry({
      action: "bug-update",
      title: "Updated bug report",
      details: `${report.title} -> ${nextStatus}/${nextSeverity}`,
      targetId: reportId,
      targetType: "bug-report",
    });
    return { ok: true, bugReport: fromBugReportRow(data) };
  }

  async function submitSuspensionAppeal(body) {
    if (!currentUserId || !currentUserRecord) {
      return { ok: false, error: "You must be logged in to submit an appeal." };
    }

    const admins = users.filter((user) => user.role === "admin" && user.id !== currentUserId);
    if (!admins.length) {
      return { ok: false, error: "No admin accounts are available for appeals right now." };
    }

    const appealThread = await findOrCreateThread({
      participantIds: [currentUserId, ...admins.map((admin) => admin.id)],
    });

    if (!appealThread.ok) {
      return appealThread;
    }

    const result = await sendMessage(
      appealThread.thread.id,
      `Suspension appeal from ${currentUserRecord.name}: ${String(body || "").trim()}`,
      { system: true, thread: appealThread.thread },
    );

    if (!result.ok) {
      return result;
    }

    await Promise.all(
      admins.map((admin) =>
        pushNotification({
          userId: admin.id,
          type: "suspension-appeal",
          title: "Suspension appeal submitted",
          body: `${currentUserRecord.name} submitted a suspension appeal.`,
          entityId: appealThread.thread.id,
        }),
      ),
    );

    return { ok: true, threadId: appealThread.thread.id };
  }

  async function markNotificationRead(notificationId) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? normalizeNotificationRecord({ ...notification, read: true })
          : notification,
      ),
    );

    if (!isSupabaseConfigured) {
      return { ok: true };
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    return error ? { ok: false, error: error.message } : { ok: true };
  }

  async function markAllNotificationsRead() {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in." };
    }

    const previousNotifications = notifications;
    setNotifications((current) =>
      current.map((notification) =>
        notification.userId === currentUserId
          ? normalizeNotificationRecord({ ...notification, read: true })
          : notification,
      ),
    );

    if (!isSupabaseConfigured) {
      return { ok: true };
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", currentUserId)
      .eq("read", false);

    if (error) {
      setNotifications(previousNotifications);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  async function deleteNotification(notificationId) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in." };
    }

    const previousNotifications = notifications;
    const previousSeenNotificationIds = new Set(seenNotificationIdsRef.current);
    setNotifications((current) =>
      current.filter(
        (notification) =>
          !(notification.id === notificationId && notification.userId === currentUserId),
      ),
    );
    seenNotificationIdsRef.current.delete(notificationId);
    writeToastSeenStorage(currentUserId, seenNotificationIdsRef.current);

    if (!isSupabaseConfigured) {
      return { ok: true };
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", currentUserId);

    if (error) {
      setNotifications(previousNotifications);
      seenNotificationIdsRef.current = previousSeenNotificationIds;
      writeToastSeenStorage(currentUserId, seenNotificationIdsRef.current);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  async function clearReadNotifications() {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in." };
    }

    const previousNotifications = notifications;
    const previousSeenNotificationIds = new Set(seenNotificationIdsRef.current);
    const readIds = notificationsForCurrentUser
      .filter((notification) => notification.read)
      .map((notification) => notification.id);

    setNotifications((current) =>
      current.filter(
        (notification) => !(notification.userId === currentUserId && notification.read),
      ),
    );
    readIds.forEach((notificationId) => seenNotificationIdsRef.current.delete(notificationId));
    writeToastSeenStorage(currentUserId, seenNotificationIdsRef.current);

    if (!isSupabaseConfigured) {
      return { ok: true };
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", currentUserId)
      .eq("read", true);

    if (error) {
      setNotifications(previousNotifications);
      seenNotificationIdsRef.current = previousSeenNotificationIds;
      writeToastSeenStorage(currentUserId, seenNotificationIdsRef.current);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  async function toggleListingFlag(listingId) {
    const listing = listings.find((item) => item.id === listingId);
    if (!listing) {
      return { ok: false, error: "Listing not found." };
    }

    const flagged = !listing.flagged;

    if (!isSupabaseConfigured) {
      setListings((current) =>
        current.map((item) =>
          item.id === listingId ? normalizeListingRecord({ ...item, flagged }) : item,
        ),
      );
      pushAdminAuditEntry({
        action: "listing-flag",
        title: `${flagged ? "Flagged" : "Unflagged"} listing`,
        details: listing.title,
        targetId: listingId,
        targetType: "listing",
      });
      return { ok: true };
    }

    const { error } = await supabase.from("listings").update({ flagged }).eq("id", listingId);
    if (error) {
      return { ok: false, error: error.message };
    }

    if (flagged) {
      await pushNotification({
        userId: listing.sellerId,
        type: "listing-flagged",
        title: "Listing flagged",
        body: `${listing.title} was flagged for admin review.`,
        entityId: listingId,
      });
    }

    await refreshMarketplaceData(currentUserId);
    pushAdminAuditEntry({
      action: "listing-flag",
      title: `${flagged ? "Flagged" : "Unflagged"} listing`,
      details: listing.title,
      targetId: listingId,
      targetType: "listing",
    });
    return { ok: true };
  }

  async function toggleListingRemoved(listingId) {
    const listing = listings.find((item) => item.id === listingId);
    if (!listing) {
      return { ok: false, error: "Listing not found." };
    }

    const nextStatus = listing.status === "removed" ? "active" : "removed";

    if (!isSupabaseConfigured) {
      setListings((current) =>
        current.map((item) =>
          item.id === listingId
            ? normalizeListingRecord({
                ...item,
                status: nextStatus,
                updatedAt: new Date().toISOString(),
              })
            : item,
        ),
      );
      pushAdminAuditEntry({
        action: "listing-status",
        title: nextStatus === "removed" ? "Removed listing" : "Restored listing",
        details: listing.title,
        targetId: listingId,
        targetType: "listing",
      });
      return { ok: true };
    }

    const { error } = await supabase
      .from("listings")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", listingId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    pushAdminAuditEntry({
      action: "listing-status",
      title: nextStatus === "removed" ? "Removed listing" : "Restored listing",
      details: listing.title,
      targetId: listingId,
      targetType: "listing",
    });
    return { ok: true };
  }

  async function toggleListingFeatured(listingId) {
    const listing = listings.find((item) => item.id === listingId);
    if (!listing) {
      return { ok: false, error: "Listing not found." };
    }

    const featured = !listing.featured;

    if (!isSupabaseConfigured) {
      setListings((current) =>
        current.map((item) =>
          item.id === listingId ? normalizeListingRecord({ ...item, featured }) : item,
        ),
      );
      pushAdminAuditEntry({
        action: "listing-feature",
        title: `${featured ? "Featured" : "Unfeatured"} listing`,
        details: listing.title,
        targetId: listingId,
        targetType: "listing",
      });
      return { ok: true };
    }

    const { error } = await supabase.from("listings").update({ featured }).eq("id", listingId);
    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    pushAdminAuditEntry({
      action: "listing-feature",
      title: `${featured ? "Featured" : "Unfeatured"} listing`,
      details: listing.title,
      targetId: listingId,
      targetType: "listing",
    });
    return { ok: true };
  }

  async function updateListingAdminNote(listingId, adminNotes) {
    if (!isSupabaseConfigured) {
      setListings((current) =>
        current.map((item) =>
          item.id === listingId
            ? normalizeListingRecord({ ...item, adminNotes: String(adminNotes || "") })
            : item,
        ),
      );
      pushAdminAuditEntry({
        action: "listing-note",
        title: "Updated listing admin note",
        details: listings.find((item) => item.id === listingId)?.title || listingId,
        targetId: listingId,
        targetType: "listing",
      });
      return { ok: true };
    }

    const { error } = await supabase
      .from("listings")
      .update({ admin_notes: String(adminNotes || "") })
      .eq("id", listingId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    pushAdminAuditEntry({
      action: "listing-note",
      title: "Updated listing admin note",
      details: listings.find((item) => item.id === listingId)?.title || listingId,
      targetId: listingId,
      targetType: "listing",
    });
    return { ok: true };
  }

  async function toggleUserBadge(userId, badgeId) {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }

    const badges = user.badges.includes(badgeId)
      ? user.badges.filter((badge) => badge !== badgeId)
      : [...user.badges, badgeId];

    if (!isSupabaseConfigured) {
      setUsers((current) =>
        current.map((item) =>
          item.id === userId ? normalizeUserRecord({ ...item, badges }) : item,
        ),
      );
      pushAdminAuditEntry({
        action: "user-badge",
        title: "Updated user badge",
        details: `${user.name} -> ${badgeId}`,
        targetId: userId,
        targetType: "user",
      });
      return { ok: true };
    }

    const { error } = await supabase.from("profiles").update({ badges }).eq("id", userId);
    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    pushAdminAuditEntry({
      action: "user-badge",
      title: "Updated user badge",
      details: `${user.name} -> ${badgeId}`,
      targetId: userId,
      targetType: "user",
    });
    return { ok: true };
  }

  async function toggleUserVerified(userId) {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }

    const verified = !user.verified;

    if (!isSupabaseConfigured) {
      setUsers((current) =>
        current.map((item) =>
          item.id === userId ? normalizeUserRecord({ ...item, verified }) : item,
        ),
      );
      pushAdminAuditEntry({
        action: "user-verified",
        title: verified ? "Verified user" : "Removed user verification",
        details: user.name,
        targetId: userId,
        targetType: "user",
      });
      return { ok: true };
    }

    const { error } = await supabase.from("profiles").update({ verified }).eq("id", userId);
    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    pushAdminAuditEntry({
      action: "user-verified",
      title: verified ? "Verified user" : "Removed user verification",
      details: user.name,
      targetId: userId,
      targetType: "user",
    });
    return { ok: true };
  }

  async function toggleUserSuspended(userId) {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }

    const accountStatus =
      user.accountStatus === "suspended" ? "active" : "suspended";

    if (!isSupabaseConfigured) {
      setUsers((current) =>
        current.map((item) =>
          item.id === userId
            ? normalizeUserRecord({ ...item, accountStatus })
            : item,
        ),
      );
      pushAdminAuditEntry({
        action: "user-suspension",
        title: accountStatus === "suspended" ? "Suspended user" : "Restored user",
        details: user.name,
        targetId: userId,
        targetType: "user",
      });
      return { ok: true };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ account_status: accountStatus })
      .eq("id", userId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await pushNotification({
      userId,
      type: accountStatus === "suspended" ? "account-suspended" : "account-restored",
      title:
        accountStatus === "suspended"
          ? "Account suspended"
          : "Account restored",
      body:
        accountStatus === "suspended"
          ? "Your account is suspended. Browsing is still available, and you can submit an appeal from Account settings."
          : "Your account has been restored. Selling, messaging, and offers are available again.",
      entityId: "/account",
    });

    await refreshMarketplaceData(currentUserId);
    pushAdminAuditEntry({
      action: "user-suspension",
      title: accountStatus === "suspended" ? "Suspended user" : "Restored user",
      details: user.name,
      targetId: userId,
      targetType: "user",
    });
    return { ok: true };
  }

  async function toggleUserAdmin(userId) {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      return { ok: false, error: "User not found." };
    }

    const role = user.role === "admin" ? "seller" : "admin";

    if (!isSupabaseConfigured) {
      setUsers((current) =>
        current.map((item) =>
          item.id === userId ? normalizeUserRecord({ ...item, role }) : item,
        ),
      );
      pushAdminAuditEntry({
        action: "user-role",
        title: role === "admin" ? "Granted admin" : "Removed admin",
        details: user.name,
        targetId: userId,
        targetType: "user",
      });
      return { ok: true };
    }

    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    pushAdminAuditEntry({
      action: "user-role",
      title: role === "admin" ? "Granted admin" : "Removed admin",
      details: user.name,
      targetId: userId,
      targetType: "user",
    });
    return { ok: true };
  }

  async function deleteCurrentUserAccount() {
    if (!currentUserId || !currentUser) {
      return { ok: false, error: "You must be logged in." };
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await apiRequest("/api/admin/delete-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          userId: currentUserId,
        }),
      });

      await logout();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error:
          error.message ||
          "Account deletion is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the API server to enable it.",
      };
    }
  }

  async function deleteUserAccount(userId) {
    if (!currentUserId || !currentUser) {
      return { ok: false, error: "You must be logged in." };
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await apiRequest("/api/admin/delete-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          userId,
        }),
      });

      await refreshMarketplaceData(currentUserId);
      pushAdminAuditEntry({
        action: "user-delete",
        title: "Deleted user account",
        details: users.find((user) => user.id === userId)?.name || userId,
        targetId: userId,
        targetType: "user",
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error:
          error.message ||
          "Account deletion is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the API server to enable it.",
      };
    }
  }

  async function addManualEvent(payload) {
    if (!String(payload.title || "").trim()) {
      return { ok: false, error: "Event title is required." };
    }

    if (!isSupabaseConfigured) {
      const event = normalizeManualEventRecord({
        id: `manual-event-${Date.now()}`,
        title: payload.title,
        store: payload.store,
        source: "Admin override",
        sourceType: "manual",
        sourceUrl: payload.sourceUrl || "",
        dateStr: payload.dateStr,
        time: payload.time,
        game: payload.game,
        fee: payload.fee || "TBD",
        neighborhood: payload.neighborhood,
        note: payload.note || "",
        published: true,
      });
      setManualEvents((current) => [event, ...current]);
      pushAdminAuditEntry({
        action: "event-create",
        title: "Added manual event",
        details: payload.title,
        targetId: event.id,
        targetType: "event",
      });
      return { ok: true, event };
    }

    const { data, error } = await supabase
      .from("manual_events")
      .insert({
        title: payload.title,
        store: payload.store,
        source: "Admin override",
        source_type: "manual",
        source_url: payload.sourceUrl || null,
        date_str: payload.dateStr,
        time: payload.time,
        game: payload.game,
        fee: payload.fee || "TBD",
        neighborhood: payload.neighborhood || null,
        note: payload.note || "",
        published: true,
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    pushAdminAuditEntry({
      action: "event-create",
      title: "Added manual event",
      details: payload.title,
      targetId: data.id,
      targetType: "event",
    });
    return { ok: true, event: fromEventRow(data) };
  }

  async function toggleManualEventPublished(eventId) {
    const event = manualEvents.find((item) => item.id === eventId);
    if (!event) {
      return { ok: false, error: "Event not found." };
    }

    const published = !event.published;

    if (!isSupabaseConfigured) {
      setManualEvents((current) =>
        current.map((item) =>
          item.id === eventId ? normalizeManualEventRecord({ ...item, published }) : item,
        ),
      );
      pushAdminAuditEntry({
        action: "event-publish",
        title: published ? "Published event" : "Unpublished event",
        details: event.title,
        targetId: eventId,
        targetType: "event",
      });
      return { ok: true };
    }

    const { error } = await supabase
      .from("manual_events")
      .update({ published })
      .eq("id", eventId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    pushAdminAuditEntry({
      action: "event-publish",
      title: published ? "Published event" : "Unpublished event",
      details: event.title,
      targetId: eventId,
      targetType: "event",
    });
    return { ok: true };
  }

  async function removeManualEvent(eventId) {
    const event = manualEvents.find((item) => item.id === eventId);
    if (!isSupabaseConfigured) {
      setManualEvents((current) => current.filter((item) => item.id !== eventId));
      pushAdminAuditEntry({
        action: "event-delete",
        title: "Deleted manual event",
        details: event?.title || eventId,
        targetId: eventId,
        targetType: "event",
      });
      return { ok: true };
    }

    const { error } = await supabase.from("manual_events").delete().eq("id", eventId);
    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    pushAdminAuditEntry({
      action: "event-delete",
      title: "Deleted manual event",
      details: event?.title || eventId,
      targetId: eventId,
      targetType: "event",
    });
    return { ok: true };
  }

  const value = {
    addListing,
    addManualEvent,
    addReview,
    addCollectionItem,
    adminOverview,
    adminAuditLog,
    authReady,
    bootProgress,
    bootStatus,
    activeListings,
    bumpListing,
    changeCurrentUserPassword,
    clearListingDraft,
    clearCollection,
    clearSearchHistory,
    closeCreateListing,
    collectionItems,
    collectionSummary,
    createOffer,
    createListingPreset,
    currentUser,
    currentUserDrafts,
    currentUserId,
    currentUserListings,
    clearReadNotifications,
    deleteListing,
    deleteReview,
    deleteNotification,
    deleteCurrentUserAccount,
    deleteUserAccount,
    dismissToast,
    ensureAdminDataLoaded,
    ensureEventAttendanceFeedLoaded,
    ensureSellerTrustLoaded,
    ensureWorkspaceDataLoaded,
    editListing,
    enrichedListings,
    eventAttendance,
    eventAttendanceFeed,
    eventReminderIds,
    featuredMerchandising,
      findOrCreateThread,
      formatCadPrice,
      gameCatalog,
      getThreadById,
      globalSearch,
      hasBootCache: hasUsableCache,
      hideThreadForCurrentUser,
      hotListings,
    isAdmin: currentUser?.role === "admin",
    isAuthenticated: Boolean(currentUser),
    isBetaTester,
    isCreateListingOpen,
    isSuspended,
    isSupabaseConfigured,
    bugReports,
    bugReportsForCurrentUser,
    listingDraft,
    listingDrafts: currentUserDrafts,
    listings: enrichedListings,
    loading,
    login,
    logout,
    manualEvents,
    markAllNotificationsRead,
    markListingSold,
    markNotificationRead,
    markThreadRead,
    notificationsForCurrentUser,
    offers,
    offersByListingId,
    offersForCurrentUser,
    adminBugReports,
    openReportResolutionThread,
    openCreateListing,
    openReports,
    recordListingView,
    recordSearchQuery,
    refreshMarketplaceData,
    requestPasswordReset,
    removeManualEvent,
    removeCollectionItem,
    reports,
    respondToOffer,
    reviewBadgeCatalog,
    reviews,
    saveListingDraft,
    searchHistory,
    selectListingDraft,
    sellerMap,
    sellers: Object.values(sellerMap),
    sendMessage,
    setEventAttendanceIntent,
    setGlobalSearch,
    signup,
    submitBugReport,
    submitReport,
    submitSuspensionAppeal,
    startViewAs,
    stopViewAs,
    toastItems,
    threadsForCurrentUser,
    toggleListingFeatured,
    toggleListingFlag,
    toggleListingRemoved,
    toggleEventReminder,
    toggleManualEventPublished,
    toggleSellerFollow,
    toggleStoreFollow,
    toggleUserAdmin,
    toggleUserBadge,
    toggleUserSuspended,
    toggleUserVerified,
    unreadMessageCount,
    unreadNotificationCount,
    completePasswordRecovery,
    updateBugReport,
    updateCollectionItem,
    updateCurrentUserProfile,
    updateHomeHeroSettings,
    updateStorefrontSettings,
    updateListingAdminNote,
    updateReportStatus,
    users: Object.values(sellerMap),
    viewedUserRecord,
    isViewingAs,
    wishlist: normalizedWishlist,
    wishlistedListings,
    toggleWishlist,
    followedSellerIds,
    followedStoreSlugs,
    siteSettings,
  };

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace() {
  const context = useContext(MarketplaceContext);

  if (!context) {
    throw new Error("useMarketplace must be used within a MarketplaceProvider.");
  }

  return context;
}
