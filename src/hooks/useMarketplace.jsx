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
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { average, formatCurrency, slugify } from "../utils/formatters";

const MarketplaceContext = createContext(null);
const SEARCH_STORAGE_KEY = "tcgwpg.globalSearch";
const TOAST_SEEN_STORAGE_PREFIX = "tcgwpg.seenToasts";
const MARKETPLACE_CACHE_KEY = "tcgwpg.marketplaceCache";
const SUPPORTED_GAME_SLUGS = new Set(["magic", "pokemon", "one-piece"]);
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
const MEDIA_BUCKET = "listing-media";
const FOREGROUND_REFRESH_MS = 12000;

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
  const username = normalizeUsername(user.username || "");
  const publicName = username || user.publicName || getPublicName(user.name);
  const favoriteGames = Array.isArray(user.favoriteGames) ? user.favoriteGames : [];
  const defaultListingGame = user.defaultListingGame || favoriteGames[0] || "Pokemon";

  return {
    role: "seller",
    badges: [],
    verified: false,
    accountStatus: "active",
    bannerStyle: "neutral",
    meetupPreferences: "Flexible local meetup.",
    responseTime: "~ 1 hour",
    completedDeals: 0,
    avatarUrl: "",
    ...user,
    email: normalizeEmail(user.email),
    postalCode: normalizePostalCode(user.postalCode),
    favoriteGames,
    defaultListingGame,
    username,
    firstName: getFirstName(user.name),
    publicName,
    initials: user.initials || buildInitials(user.name),
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

function normalizeNotificationRecord(notification) {
  return {
    read: false,
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
    meetupPreferences: row.meetup_preferences,
    responseTime: row.response_time,
    completedDeals: row.completed_deals || 0,
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
    price_history:
      payload.priceHistory ||
      [
        {
          id: `price-history-${Date.now()}`,
          price,
          label: "Listed",
          createdAt: now,
        },
      ],
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
      .map((message) => ({
        id: message.id,
        senderId: message.sender_id,
        body: message.body,
        sentAt: message.created_at,
        readBy: message.read_by || [],
      })),
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
  const isSuspended = currentUserRecord?.accountStatus === "suspended";
  const isBetaTester = Boolean(
    currentUserRecord?.badges?.includes("beta") || currentUserRecord?.role === "admin",
  );
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

  const reviewBadgeCatalog = sellerBadgeCatalog;

  const sellerMap = useMemo(() => {
    const map = {};

    users.forEach((user) => {
      const sellerReviews = reviews.filter((review) => review.sellerId === user.id);
      const listingCount = listings.filter(
        (listing) => listing.sellerId === user.id && listing.status === "active",
      ).length;
      map[user.id] = {
        ...sanitizeUser(user),
        activeListingCount: listingCount,
        reviewCount: sellerReviews.length,
        overallRating: average(sellerReviews.map((review) => review.rating)),
      };
    });

    return map;
  }, [listings, reviews, users]);
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
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
  }, [currentUserId, enrichedListings, sellerMap, threads]);

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

      if ((!existingProfile.username && desiredUsername) || (!existingProfile.avatar_url && desiredAvatarUrl)) {
        const nextProfilePatch = {
          updated_at: new Date().toISOString(),
        };

        if (!existingProfile.username && desiredUsername) {
          nextProfilePatch.username = desiredUsername;
        }

        if (!existingProfile.avatar_url && desiredAvatarUrl) {
          nextProfilePatch.avatar_url = desiredAvatarUrl;
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
      meetup_preferences: payload.meetupPreferences || "Flexible local meetup.",
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
    threads,
    users,
    wishlist,
  ]);

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
      meetup_preferences: payload.meetupPreferences || "",
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
    const missingDefaultListingGameColumn =
      Boolean(updateResult.error) &&
      isMissingColumnError(updateResult.error, "default_listing_game");

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
      : missingDefaultListingGameColumn
        ? {
            ok: true,
            avatarUrl: nextAvatarUrl,
            warning:
              "Profile settings were saved, but the profiles table is still missing the default_listing_game column in Supabase.",
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

  async function addListing(payload) {
    if (!currentUserRecord) {
      return { ok: false, error: "You must be logged in to post a listing." };
    }

    const access = ensureAccountActive();
    if (!access.ok) {
      return access;
    }

    if (!isSupabaseConfigured) {
      return { ok: false, error: "Supabase is not configured." };
    }

    const { data, error } = await supabase
      .from("listings")
      .insert(toListingPayload(payload, currentUserRecord))
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
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
    const priceHistory = [...(listing.priceHistory || [])];

    if (nextPrice !== listing.price) {
      changes.push({ field: "price", from: listing.price, to: nextPrice });
      priceHistory.push({
        id: `price-history-${Date.now()}`,
        price: nextPrice,
        label: "Updated",
        createdAt: new Date().toISOString(),
      });
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
        price_history: priceHistory,
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
      return { ok: true };
    }

    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId, { silent: true });
    return { ok: true };
  }

  function getThreadById(threadId) {
    return threadsForCurrentUser.find((thread) => thread.id === threadId) || null;
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
    return findOrCreateThreadInternal({ participantIds: nextParticipants, listingId });
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
    const trimmed = String(body || "").trim();
    if (!trimmed) {
      return { ok: false, error: "Message cannot be empty." };
    }

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

    const otherParticipantIds = thread.participantIds.filter((id) => id !== currentUserId);
    const createdAt = new Date().toISOString();
    const optimisticMessageId = `message-pending-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticMessageId,
      senderId: options.senderId || currentUserId,
      body: trimmed,
      sentAt: createdAt,
      readBy: [currentUserId],
    };

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
                    body: trimmed,
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

    const { error: messageError } = await supabase.from("messages").insert({
      thread_id: threadId,
      sender_id: options.senderId || currentUserId,
      body: trimmed,
      read_by: [currentUserId],
    });

    if (messageError) {
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

    await refreshMarketplaceData(currentUserId, { silent: true });
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

    const { data, error } = await supabase
      .from("offers")
      .insert({
        listing_id: payload.listingId,
        seller_id: listing.sellerId,
        buyer_id: currentUserId,
        offer_type: payload.offerType,
        cash_amount: normalizedCashAmount,
        trade_items: normalizedTradeItems,
        note: String(payload.note || "").trim(),
      })
      .select("*")
      .single();

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
                updatedAt: nextUpdatedAt,
              })
            : item,
        ),
      );
      return { ok: true };
    }

    const updatePayload = {
      status: nextStatus,
      updated_at: nextUpdatedAt,
    };

    if (action === "counter") {
      updatePayload.offer_type = nextOfferType;
      updatePayload.cash_amount = nextCashAmount;
      updatePayload.trade_items = nextTradeItems;
      updatePayload.note = nextNote;
    }

    const { error } = await supabase.from("offers").update(updatePayload).eq("id", offerId);

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
      return { ok: true };
    }

    const { error } = await supabase.from("listings").update({ featured }).eq("id", listingId);
    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
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
      return { ok: true };
    }

    const { error } = await supabase.from("profiles").update({ badges }).eq("id", userId);
    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
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
      return { ok: true };
    }

    const { error } = await supabase.from("profiles").update({ verified }).eq("id", userId);
    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
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
      return { ok: true };
    }

    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
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
    return { ok: true };
  }

  async function removeManualEvent(eventId) {
    if (!isSupabaseConfigured) {
      setManualEvents((current) => current.filter((item) => item.id !== eventId));
      return { ok: true };
    }

    const { error } = await supabase.from("manual_events").delete().eq("id", eventId);
    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    return { ok: true };
  }

  const value = {
    addListing,
    addManualEvent,
    addReview,
    adminOverview,
    authReady,
    activeListings,
    bumpListing,
    changeCurrentUserPassword,
    clearListingDraft,
    clearSearchHistory,
    closeCreateListing,
    createOffer,
    createListingPreset,
    currentUser,
    currentUserDrafts,
    currentUserId,
    currentUserListings,
    deleteReview,
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
    toastItems,
    threadsForCurrentUser,
    toggleListingFeatured,
    toggleListingFlag,
    toggleListingRemoved,
    toggleManualEventPublished,
    toggleUserAdmin,
    toggleUserBadge,
    toggleUserSuspended,
    toggleUserVerified,
    unreadMessageCount,
    unreadNotificationCount,
    updateBugReport,
    updateCurrentUserProfile,
    updateListingAdminNote,
    updateReportStatus,
    users: Object.values(sellerMap),
    wishlist: normalizedWishlist,
    wishlistedListings,
    toggleWishlist,
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
