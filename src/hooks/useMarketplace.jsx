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
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { average, formatCurrency, slugify } from "../utils/formatters";

const MarketplaceContext = createContext(null);
const SEARCH_STORAGE_KEY = "tcgwpg.globalSearch";
const TOAST_SEEN_STORAGE_PREFIX = "tcgwpg.seenToasts";
const HIDDEN_THREADS_STORAGE_PREFIX = "tcgwpg.hiddenThreads";
const MARKETPLACE_CACHE_KEY = "tcgwpg.marketplaceCache";
const SITE_SETTINGS_STORAGE_KEY = "tcgwpg.siteSettings";
const COLLECTION_STORAGE_PREFIX = "tcgwpg.collection";
const AUDIT_LOG_STORAGE_KEY = "tcgwpg.adminAuditLog";
const VIEW_AS_STORAGE_KEY = "tcgwpg.viewAsUserId";
const SUPPORTED_GAME_SLUGS = new Set(["magic", "pokemon", "one-piece"]);
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
const MEDIA_BUCKET = "listing-media";
const FOREGROUND_REFRESH_MS = 12000;
const RICH_MESSAGE_PREFIX = "[[tcgwpg-message]]";
const DEFAULT_SITE_SETTINGS = {
  themePreset: "collector-strip",
  customTheme: normalizeCustomTheme({
    primary: "#b11d23",
    accent: "#ef3b33",
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

function readSearchStorage() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(SEARCH_STORAGE_KEY) || "";
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
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
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
    users: trimCacheArray(snapshot.users, 120).map((user) => ({
      id: user.id,
      role: user.role,
      name: user.name,
      username: user.username,
      email: user.email,
      neighborhood: user.neighborhood,
      postalCode: user.postalCode,
      bio: user.bio,
      badges: Array.isArray(user.badges) ? user.badges.slice(0, 8) : [],
      verified: user.verified,
      accountStatus: user.accountStatus,
      bannerStyle: user.bannerStyle,
      favoriteGames: Array.isArray(user.favoriteGames) ? user.favoriteGames.slice(0, 5) : [],
      meetupPreferences: user.meetupPreferences,
      responseTime: user.responseTime,
      completedDeals: user.completedDeals,
      avatarUrl: user.avatarUrl || "",
      defaultListingGame: user.defaultListingGame || "",
      followedSellerIds: Array.isArray(user.followedSellerIds)
        ? user.followedSellerIds.slice(0, 200)
        : [],
      trustedMeetupSpots: Array.isArray(user.trustedMeetupSpots)
        ? user.trustedMeetupSpots.slice(0, 8)
        : [],
      createdAt: user.createdAt || "",
      onboardingComplete: Boolean(user.onboardingComplete),
      publicName: user.publicName,
      firstName: user.firstName,
      initials: user.initials,
    })),
    listings: trimCacheArray(snapshot.listings, 160).map((listing) => ({
      ...listing,
      imageGallery: trimCacheArray(listing.imageGallery, 4),
      conditionImages: trimCacheArray(listing.conditionImages, 4),
      bundleItems: trimCacheArray(listing.bundleItems, 12),
      priceHistory: trimCacheArray(listing.priceHistory, 8),
      editHistory: trimCacheArray(listing.editHistory, 8),
    })),
    wishlist: trimCacheArray(snapshot.wishlist, 200),
    reviews: trimCacheArray(snapshot.reviews, 120),
    bugReports: trimCacheArray(snapshot.bugReports, 120),
    manualEvents: trimCacheArray(snapshot.manualEvents, 80),
    listingDrafts: trimCacheArray(snapshot.listingDrafts, 8),
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
    throw new Error(data.error || "Request failed.");
  }

  return data;
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

  return nextPayload;
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

function normalizeDraftCollection(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (value && Array.isArray(value.drafts)) {
    return value.drafts.filter(Boolean);
  }

  if (value && typeof value === "object" && Object.keys(value).length) {
    return [value];
  }

  return [];
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

function isSupportedListing(listing) {
  const gameSlug = slugify(String(listing?.gameSlug || listing?.game || ""));
  return SUPPORTED_GAME_SLUGS.has(gameSlug);
}

function normalizeUserRecord(user) {
  const meetupData = parseMeetupPreferenceValue(user.meetupPreferences || "");
  const username = normalizeUsername(user.username || "");
  const publicName = username || user.publicName || getPublicName(user.name);
  const favoriteGames = Array.isArray(user.favoriteGames) ? user.favoriteGames : [];
  const followedSellerIds = Array.isArray(user.followedSellerIds) ? user.followedSellerIds : [];
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
  const normalizedGameSlug = slugify(String(listing.gameSlug || listing.game || ""));
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

  return {
    seller_id: seller.id,
    type: payload.type || "WTS",
    game: payload.game,
    game_slug: slugify(payload.game),
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
    id: thread.id,
    participantIds: thread.participant_ids || [],
    listingId: thread.listing_id,
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
    messages: (messageRows || [])
      .filter((message) => message.thread_id === thread.id)
      .sort(
        (left, right) =>
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
      )
      .map((message) => {
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
      }),
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
  const cachedState = useMemo(() => (isSupabaseConfigured ? readMarketplaceCache() : null), []);
  const [users, setUsers] = useState(() =>
    isSupabaseConfigured ? cachedState?.users || [] : seedState.users,
  );
  const [currentUserId, setCurrentUserId] = useState(null);
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
    isSupabaseConfigured ? cachedState?.listingDrafts || [] : seedState.listingDrafts,
  );
  const [activeDraftId, setActiveDraftId] = useState(() =>
    isSupabaseConfigured ? cachedState?.activeDraftId || null : seedState.activeDraftId,
  );
  const [searchHistory, setSearchHistory] = useState(() =>
    isSupabaseConfigured ? cachedState?.searchHistory || [] : seedState.searchHistory,
  );
  const [collectionItems, setCollectionItems] = useState([]);
  const [adminAuditLog, setAdminAuditLog] = useState(() => readAuditLogStorage());
  const [viewAsUserId, setViewAsUserId] = useState(() => readViewAsStorage());
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
    Boolean(isSupabaseConfigured && !cachedState?.listings?.length),
  );
  const [toastItems, setToastItems] = useState([]);
  const seenNotificationIdsRef = useRef(new Set());
  const seededRealtimeStateRef = useRef(false);

  const currentUser = useMemo(
    () => sanitizeUser(users.find((user) => user.id === currentUserId)) || null,
    [currentUserId, users],
  );

  const currentUserRecord = useMemo(
    () => users.find((user) => user.id === currentUserId) || null,
    [currentUserId, users],
  );
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
  const listingDraft = useMemo(
    () =>
      activeDraftId
        ? listingDrafts.find((draft) => draft.id === activeDraftId) || null
        : null,
    [activeDraftId, listingDrafts],
  );
  const currentUserDrafts = useMemo(
    () =>
      [...listingDrafts].sort(
        (left, right) =>
          new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime(),
      ),
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
      const key = slugify(item.game);
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

  const sellerMap = useMemo(() => {
    const map = {};

    users.forEach((user) => {
      const sellerReviews = reviews.filter((review) => review.sellerId === user.id);
      const sellerListings = listings.filter((listing) => listing.sellerId === user.id);
      const listingCount = sellerListings.filter((listing) => listing.status === "active").length;
      const moderationActions =
        sellerListings.filter((listing) => listing.flagged || listing.status === "removed").length +
        reports.filter(
          (report) =>
            report.sellerId === user.id &&
            String(report.status || "").toLowerCase() !== "dismissed",
        ).length;
      const responseRate = estimateResponseRate(user, sellerReviews.length);
      map[user.id] = {
        ...sanitizeUser(user),
        activeListingCount: listingCount,
        followedByCurrentUser: followedSellerSet.has(user.id),
        reviewCount: sellerReviews.length,
        overallRating: average(sellerReviews.map((review) => review.rating)),
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
  }, [followedSellerSet, listings, reports, reviews, users]);
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
        (listing) => listing.sellerId === currentUserId && listing.status !== "removed",
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
        const hiddenAt = hiddenThreadMap[thread.id];
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

  const pushAdminAuditEntry = useCallback(
    ({ action, title, details = "", targetId = "", targetType = "record" }) => {
      if (!currentUserRecord || currentUserRecord.role !== "admin") {
        return;
      }

      setAdminAuditLog((current) => [
        normalizeAuditRecord({
          actorId: currentUserRecord.id,
          actorName: currentUserRecord.publicName || currentUserRecord.name,
          action,
          title,
          details,
          targetId,
          targetType,
          createdAt: new Date().toISOString(),
        }),
        ...current,
      ].slice(0, 200));
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

  const bootstrapProfile = useCallback(async (authUser, payload = {}) => {
    if (!isSupabaseConfigured || !authUser) {
      return null;
    }

    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

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
          .select("*")
          .single();

        if (!updateResult.error) {
          return fromProfileRow(updateResult.data);
        }

        if (!isMissingColumnError(updateResult.error, "username") && !isMissingColumnError(updateResult.error, "avatar_url")) {
          throw updateResult.error;
        }

        const fallbackPatch = omitMissingProfileColumns(nextProfilePatch, updateResult.error);
        if (Object.keys(fallbackPatch).length > 1) {
          const fallbackResult = await supabase
            .from("profiles")
            .update(fallbackPatch)
            .eq("id", authUser.id)
            .select("*")
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
      .select("*")
      .single();

    if (insertResult.error && (isMissingColumnError(insertResult.error, "username") || isMissingColumnError(insertResult.error, "avatar_url"))) {
      const legacyProfilePayload = omitMissingProfileColumns(profilePayload, insertResult.error);
      insertResult = await supabase
        .from("profiles")
        .insert(legacyProfilePayload)
        .select("*")
        .single();
    }

    const { data: insertedProfile, error: insertError } = insertResult;

    if (insertError) {
      throw insertError;
    }

    return fromProfileRow(insertedProfile);
  }, []);

  const refreshMarketplaceData = useCallback(
    async (authedUserId = currentUserId, options = {}) => {
      if (!isSupabaseConfigured) {
        return;
      }

      if (!options.silent) {
        setLoading(true);
      }

      try {
        let authUser = null;
        if (authedUserId) {
          const authResult = await supabase.auth.getUser();
          authUser = authResult.data?.user || null;
        }

        const [profilesRes, listingsRes, reviewsRes, manualEventsRes] = await Promise.all([
          supabase.from("profiles").select("*"),
          supabase.from("listings").select("*"),
          supabase.from("reviews").select("*"),
          supabase.from("manual_events").select("*"),
        ]);

        if (profilesRes.error) throw profilesRes.error;
        if (listingsRes.error) throw listingsRes.error;
        if (reviewsRes.error) throw reviewsRes.error;
        if (manualEventsRes.error) throw manualEventsRes.error;

        const normalizedProfiles = (profilesRes.data || [])
          .map((row) => mergeAuthedProfileMetadata(row, authUser))
          .map(fromProfileRow);

        setUsers(normalizedProfiles);
        setListings((listingsRes.data || []).map(fromListingRow).filter(isSupportedListing));
        setReviews((reviewsRes.data || []).map(fromReviewRow));
        setManualEvents((manualEventsRes.data || []).map(fromEventRow));

        if (!authedUserId) {
          setWishlist([]);
          setThreads([]);
          setOffers([]);
          setReports([]);
          setBugReports([]);
          setNotifications([]);
          setListingDrafts([]);
          setActiveDraftId(null);
          setSearchHistory([]);
          return;
        }

        const [
          wishlistsRes,
            draftRes,
            threadRowsRes,
            offersRes,
            reportsRes,
            bugReportsRes,
            notificationsRes,
            searchHistoryRes,
          ] = await Promise.all([
          supabase.from("wishlists").select("listing_id").eq("user_id", authedUserId),
          supabase
            .from("listing_drafts")
            .select("*")
            .eq("user_id", authedUserId)
            .maybeSingle(),
            supabase
              .from("message_threads")
              .select("*")
              .contains("participant_ids", [authedUserId]),
            supabase.from("offers").select("*"),
            supabase.from("reports").select("*"),
            supabase.from("bug_reports").select("*"),
            supabase
              .from("notifications")
              .select("*")
            .eq("user_id", authedUserId),
          supabase
            .from("search_history")
            .select("*")
            .eq("user_id", authedUserId)
            .order("created_at", { ascending: false }),
        ]);

        if (wishlistsRes.error) throw wishlistsRes.error;
        if (draftRes.error) throw draftRes.error;
          if (threadRowsRes.error) throw threadRowsRes.error;
          if (offersRes.error) throw offersRes.error;
          if (reportsRes.error) throw reportsRes.error;
          if (bugReportsRes.error && !isMissingTableError(bugReportsRes.error, "bug_reports")) {
            throw bugReportsRes.error;
          }
          if (notificationsRes.error) throw notificationsRes.error;
        if (searchHistoryRes.error) throw searchHistoryRes.error;

        const threadRows = threadRowsRes.data || [];
        let messageRows = [];
        if (threadRows.length) {
          const messagesRes = await supabase
            .from("messages")
            .select("*")
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
        setActiveDraftId(
          draftPayload?.activeDraftId ||
            nextDrafts[0]?.id ||
            null,
        );
          setThreads(buildThreadMap(threadRows, messageRows));
          setOffers((offersRes.data || []).map(fromOfferRow));
          setReports((reportsRes.data || []).map(fromReportRow));
          if (!bugReportsRes.error) {
            setBugReports((bugReportsRes.data || []).map(fromBugReportRow));
          }
          setNotifications((notificationsRes.data || []).map(fromNotificationRow));
        setSearchHistory(
          (searchHistoryRes.data || []).map((row) => ({
            id: row.id,
            query: row.query,
            game: row.game,
            source: row.source,
            createdAt: row.created_at,
          })),
        );
      } finally {
        if (!options.silent) {
          setLoading(false);
        }
      }
    },
    [currentUserId],
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
    writeSiteSettingsStorage(siteSettings);
  }, [siteSettings]);

  useEffect(() => {
    if (!currentUserId) {
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

    setCollectionItems(readCollectionStorage(currentUserId).map(normalizeCollectionRecord));
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    writeHiddenThreadsStorage(currentUserId, hiddenThreadMap);
  }, [currentUserId, hiddenThreadMap]);

  useEffect(() => {
    if (!currentUserId) {
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
          const profile = await bootstrapProfile(authUser);
          if (!mounted) {
            return;
          }
          if (profile) {
            setUsers((current) => {
              const nextUsers = current.filter((user) => user.id !== profile.id);
              return [profile, ...nextUsers];
            });
          }
          setCurrentUserId(authUser.id);
          setAuthReady(true);
          void refreshMarketplaceData(authUser.id, { silent: true });
        } else {
          if (!mounted) {
            return;
          }
          setCurrentUserId(null);
          setAuthReady(true);
          void refreshMarketplaceData(null, { silent: true });
        }
      } catch (error) {
        console.error("Supabase auth hydration failed:", error);
        if (mounted) {
          setAuthReady(true);
        }
      }
    }

    async function initAuth() {
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        void hydrateAuthUser(session?.user || null);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [bootstrapProfile, refreshMarketplaceData]);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUserId || !authReady) {
      return;
    }

    const runRefresh = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      void refreshMarketplaceData(currentUserId, { silent: true });
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
    pushAdminAuditEntry({
      action: "storefront-hero",
      title: "Updated homepage hero controls",
      details: `Featured listing: ${payload.featuredListingId || "auto"} | Pinned event: ${payload.pinnedEventId || "auto"} | Spotlight game: ${payload.spotlightGameSlug || "auto"}`,
      targetType: "storefront",
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
    pushAdminAuditEntry({
      action: "storefront-settings",
      title: "Updated storefront settings",
      details: "Homepage sections or theme controls were adjusted.",
      targetType: "storefront",
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
      return { ok: false, error: "Supabase is not configured." };
    }

    setAuthReady(false);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
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
      return { ok: false, error: "Supabase is not configured." };
    }

    const username = normalizeUsername(payload.username);
    if (!username) {
      return { ok: false, error: "A username is required." };
    }

    setAuthReady(false);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(payload.email),
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
      const uploadResult = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filePath, payload.avatarFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: payload.avatarFile.type || undefined,
        });

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
    const nextDraft = {
      ...payload,
      id: payload.id || `draft-${Date.now()}`,
      name: payload.name || payload.title || `${payload.game || "Listing"} draft`,
      updatedAt: now,
    };
    const nextDrafts = [
      nextDraft,
      ...listingDrafts.filter((draft) => draft.id !== nextDraft.id),
    ].slice(0, 12);

    if (!isSupabaseConfigured) {
      setListingDrafts(nextDrafts);
      setActiveDraftId(nextDraft.id);
      return { ok: true, draft: nextDraft };
    }

    const { error } = await supabase.from("listing_drafts").upsert({
      user_id: currentUserId,
      payload: {
        drafts: nextDrafts,
        activeDraftId: nextDraft.id,
      },
      updated_at: now,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    setListingDrafts(nextDrafts);
    setActiveDraftId(nextDraft.id);
    return { ok: true, draft: nextDraft };
  }

  async function clearListingDraft(draftId = activeDraftId) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to clear drafts." };
    }

    const nextDrafts = listingDrafts.filter((draft) => draft.id !== draftId);
    const nextActiveDraftId =
      draftId === activeDraftId ? nextDrafts[0]?.id || null : activeDraftId;

    if (!isSupabaseConfigured) {
      setListingDrafts(nextDrafts);
      setActiveDraftId(nextActiveDraftId);
      return { ok: true };
    }

    const { error } = await supabase.from("listing_drafts").upsert({
      user_id: currentUserId,
      payload: {
        drafts: nextDrafts,
        activeDraftId: nextActiveDraftId,
      },
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    setListingDrafts(nextDrafts);
    setActiveDraftId(nextActiveDraftId);
    return { ok: true };
  }

  async function selectListingDraft(draftId) {
    setActiveDraftId(draftId);

    if (!isSupabaseConfigured || !currentUserId) {
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

  async function addCollectionItem(payload) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to track a collection." };
    }

    const nextItem = normalizeCollectionRecord({
      ...payload,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setCollectionItems((current) => [nextItem, ...current.filter((item) => item.id !== nextItem.id)]);
    return { ok: true, item: nextItem };
  }

  async function updateCollectionItem(itemId, updates) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to track a collection." };
    }

    let nextItem = null;
    setCollectionItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        nextItem = normalizeCollectionRecord({
          ...item,
          ...updates,
          id: item.id,
          addedAt: item.addedAt,
          updatedAt: new Date().toISOString(),
        });
        return nextItem;
      }),
    );

    return nextItem
      ? { ok: true, item: nextItem }
      : { ok: false, error: "Collection item not found." };
  }

  async function removeCollectionItem(itemId) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to track a collection." };
    }

    setCollectionItems((current) => current.filter((item) => item.id !== itemId));
    return { ok: true };
  }

  async function clearCollection() {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to track a collection." };
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
      return { ok: false, error: "Supabase is not configured." };
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

  async function recordListingView(listingId) {
    const listing = listings.find((item) => item.id === listingId);
    if (!listing) {
      return;
    }

    const nextViews = Number(listing.views || 0) + 1;

    setListings((current) =>
      current.map((item) =>
        item.id === listingId ? normalizeListingRecord({ ...item, views: nextViews }) : item,
      ),
    );

    if (!isSupabaseConfigured) {
      return;
    }

    await supabase.from("listings").update({ views: nextViews }).eq("id", listingId);
  }

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
    const nextFollowedSellerIds = alreadyFollowing
      ? followedSellerIds.filter((id) => id !== sellerId)
      : [...followedSellerIds, sellerId];

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
      return { ok: false, error: updateResult.error.message };
    }

    return { ok: true, followed: !alreadyFollowing };
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

      if (Number(file.size || 0) > 4_000_000) {
        return { ok: false, error: "Each chat photo must be under 4 MB." };
      }
    }

    if (!isSupabaseConfigured) {
      const attachments = await Promise.all(
        validFiles.map(async (file, index) => ({
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
      for (const [index, file] of validFiles.entries()) {
        const extension = getFileExtension(file.name, file.type);
        const filePath = `chat/${threadId}/${currentUserId}/${Date.now()}-${index + 1}.${extension}`;
        const uploadResult = await supabase.storage.from(MEDIA_BUCKET).upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || undefined,
        });

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
      id: data.id,
      participantIds: data.participant_ids || [],
      listingId: data.listing_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
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

    const { data: insertedMessage, error: messageError } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        sender_id: options.senderId || currentUserId,
        body: encodedBody,
        read_by: [currentUserId],
      })
      .select("*")
      .single();

    if (messageError || !insertedMessage) {
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

    setThreads((current) =>
      current.map((item) =>
        item.id === threadId
          ? {
              ...item,
              updatedAt: createdAt,
              messages: item.messages.map((message) =>
                message.id === optimisticMessageId
                  ? (() => {
                      const parsedBody = parseMessageBody(insertedMessage.body);
                      return {
                        id: insertedMessage.id,
                        senderId: insertedMessage.sender_id,
                        body: parsedBody.preview,
                        rawBody: parsedBody.rawBody,
                        text: parsedBody.text,
                        attachments: parsedBody.attachments,
                        isRich: parsedBody.isRich,
                        sentAt: insertedMessage.created_at,
                        readBy: insertedMessage.read_by || [currentUserId],
                      };
                    })()
                  : message,
              ),
            }
          : item,
      ),
    );

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
    setHiddenThreadMap((current) => ({
      ...current,
      [threadId]: hiddenAt,
    }));
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
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", currentUserId)
        .eq("type", "message")
        .eq("entity_id", threadId);

      if (error) {
        return { ok: false, error: error.message };
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

      const isParticipant =
        String(currentUserId) === String(offer.sellerId) ||
        String(currentUserId) === String(offer.buyerId);
      if (!isParticipant) {
        return { ok: false, error: "You cannot respond to this offer." };
      }

      const lastActorId =
        offer.lastActorId ||
        (offer.status === "pending" ? offer.buyerId : offer.sellerId);

      if (offer.status === "pending" && String(currentUserId) !== String(offer.sellerId)) {
        return { ok: false, error: "Only the seller can respond to a new offer." };
      }

      if (
        offer.status === "countered" &&
        String(currentUserId) === String(lastActorId)
      ) {
        return { ok: false, error: "You cannot respond to your own counter offer." };
      }

      const nextStatus =
        action === "accept" ? "accepted" : action === "decline" ? "declined" : "countered";
    const nextUpdatedAt = new Date().toISOString();
    const nextOfferType = counterPayload.offerType || offer.offerType;
    const nextCashAmount =
      counterPayload.cashAmount !== undefined
        ? Number(counterPayload.cashAmount) || 0
        : offer.cashAmount;
    const nextTradeItems = Array.isArray(counterPayload.tradeItems)
      ? counterPayload.tradeItems.filter(Boolean)
      : offer.tradeItems;
    const nextNote =
      counterPayload.note !== undefined ? String(counterPayload.note || "") : offer.note;

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

      const updatePayload = {
        status: nextStatus,
        last_actor_id: currentUserId,
        updated_at: nextUpdatedAt,
      };

    if (action === "counter") {
      updatePayload.offer_type = nextOfferType;
      updatePayload.cash_amount = nextCashAmount;
      updatePayload.trade_items = nextTradeItems;
      updatePayload.note = nextNote;
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
      userId: offer.buyerId,
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
      otherUserId: offer.buyerId,
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

    return error ? { ok: false, error: error.message } : { ok: true };
  }

  async function deleteNotification(notificationId) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in." };
    }

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

    return error ? { ok: false, error: error.message } : { ok: true };
  }

  async function clearReadNotifications() {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in." };
    }

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

    return error ? { ok: false, error: error.message } : { ok: true };
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
    deleteReview,
    deleteNotification,
    deleteCurrentUserAccount,
    deleteUserAccount,
    dismissToast,
    editListing,
    enrichedListings,
    featuredMerchandising,
      findOrCreateThread,
      formatCadPrice,
      gameCatalog,
      getThreadById,
      globalSearch,
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
    toggleManualEventPublished,
    toggleSellerFollow,
    toggleUserAdmin,
    toggleUserBadge,
    toggleUserSuspended,
    toggleUserVerified,
    unreadMessageCount,
    unreadNotificationCount,
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
