import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
const SUPPORTED_GAME_SLUGS = new Set(["magic", "pokemon", "one-piece"]);

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

  window.localStorage.setItem(SEARCH_STORAGE_KEY, value);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePostalCode(value) {
  const normalized = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

  if (normalized.length <= 3) {
    return normalized;
  }

  return `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
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
  return {
    role: "seller",
    badges: [],
    verified: false,
    accountStatus: "active",
    bannerStyle: "neutral",
    favoriteGames: [],
    meetupPreferences: "Flexible local meetup.",
    responseTime: "~ 1 hour",
    completedDeals: 0,
    ...user,
    email: normalizeEmail(user.email),
    postalCode: normalizePostalCode(user.postalCode),
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
    notifications: [],
    manualEvents: seedManualEvents.map(normalizeManualEventRecord),
    listingDraft: null,
    searchHistory: [],
  };
}

export function MarketplaceProvider({ children }) {
  const seedState = useMemo(() => buildSeedState(), []);
  const [users, setUsers] = useState(() => (isSupabaseConfigured ? [] : seedState.users));
  const [currentUserId, setCurrentUserId] = useState(null);
  const [listings, setListings] = useState(() =>
    isSupabaseConfigured ? [] : seedState.listings,
  );
  const [wishlist, setWishlist] = useState(() =>
    isSupabaseConfigured ? [] : seedState.wishlist,
  );
  const [reviews, setReviews] = useState(() =>
    isSupabaseConfigured ? [] : seedState.reviews,
  );
  const [threads, setThreads] = useState(() =>
    isSupabaseConfigured ? [] : seedState.threads,
  );
  const [manualEvents, setManualEvents] = useState(() =>
    isSupabaseConfigured ? [] : seedState.manualEvents,
  );
  const [offers, setOffers] = useState(() =>
    isSupabaseConfigured ? [] : seedState.offers,
  );
  const [reports, setReports] = useState(() =>
    isSupabaseConfigured ? [] : seedState.reports,
  );
  const [notifications, setNotifications] = useState(() =>
    isSupabaseConfigured ? [] : seedState.notifications,
  );
  const [listingDraft, setListingDraft] = useState(() =>
    isSupabaseConfigured ? null : seedState.listingDraft,
  );
  const [searchHistory, setSearchHistory] = useState(() =>
    isSupabaseConfigured ? [] : seedState.searchHistory,
  );
  const [globalSearch, setGlobalSearchState] = useState(() => readSearchStorage());
  const [isCreateListingOpen, setCreateListingOpen] = useState(false);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [loading, setLoading] = useState(false);

  const currentUser = useMemo(
    () => sanitizeUser(users.find((user) => user.id === currentUserId)) || null,
    [currentUserId, users],
  );

  const currentUserRecord = useMemo(
    () => users.find((user) => user.id === currentUserId) || null,
    [currentUserId, users],
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

  const enrichedListings = useMemo(
    () =>
      listings.map((listing) => ({
        ...listing,
        seller: sellerMap[listing.sellerId],
        wishlisted: wishlist.includes(listing.id),
      })),
    [listings, sellerMap, wishlist],
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
    () => activeListings.filter((listing) => wishlist.includes(listing.id)),
    [activeListings, wishlist],
  );

  const threadsForCurrentUser = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    return [...threads]
      .filter((thread) => thread.participantIds.includes(currentUserId))
      .map((thread) => {
        const otherUserId = thread.participantIds.find((id) => id !== currentUserId);
        const otherParticipant = sellerMap[otherUserId];
        const listing = enrichedListings.find((item) => item.id === thread.listingId) || null;
        const lastMessage = thread.messages[thread.messages.length - 1] || null;
        const unreadCount = thread.messages.filter(
          (message) =>
            message.senderId !== currentUserId &&
            !(message.readBy || []).includes(currentUserId),
        ).length;

        return {
          ...thread,
          listing,
          otherParticipant,
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
    () => reports.filter((report) => report.status === "open"),
    [reports],
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
      conversionRate,
      flaggedRate,
      topNeighborhoods,
      topSearches,
    };
  }, [listings, manualEvents.length, openReports.length, threads.length, topSearches, users]);

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
      return fromProfileRow(existingProfile);
    }

    const { data: insertedProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: authUser.id,
        role: "seller",
        name:
          payload.name ||
          authUser.user_metadata?.name ||
          authUser.email?.split("@")[0] ||
          "TCGWPG User",
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
      })
      .select("*")
      .single();

    if (insertError) {
      throw insertError;
    }

    return fromProfileRow(insertedProfile);
  }, []);

  const refreshMarketplaceData = useCallback(
    async (authedUserId = currentUserId) => {
      if (!isSupabaseConfigured) {
        return;
      }

      setLoading(true);

      try {
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

        setUsers((profilesRes.data || []).map(fromProfileRow));
        setListings((listingsRes.data || []).map(fromListingRow).filter(isSupportedListing));
        setReviews((reviewsRes.data || []).map(fromReviewRow));
        setManualEvents((manualEventsRes.data || []).map(fromEventRow));

        if (!authedUserId) {
          setWishlist([]);
          setThreads([]);
          setOffers([]);
          setReports([]);
          setNotifications([]);
          setListingDraft(null);
          setSearchHistory([]);
          return;
        }

        const [
          wishlistsRes,
          draftRes,
          threadRowsRes,
          offersRes,
          reportsRes,
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

        setWishlist((wishlistsRes.data || []).map((item) => item.listing_id));
        setListingDraft(draftRes.data?.payload || null);
        setThreads(buildThreadMap(threadRows, messageRows));
        setOffers((offersRes.data || []).map(fromOfferRow));
        setReports((reportsRes.data || []).map(fromReportRow));
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
        setLoading(false);
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

    let mounted = true;

    async function hydrateAuthUser(authUser) {
      if (!mounted) {
        return;
      }

      setAuthReady(false);

      try {
        if (authUser) {
          await bootstrapProfile(authUser);
          if (!mounted) {
            return;
          }
          setCurrentUserId(authUser.id);
          await refreshMarketplaceData(authUser.id);
        } else {
          if (!mounted) {
            return;
          }
          setCurrentUserId(null);
          await refreshMarketplaceData(null);
        }
      } catch (error) {
        console.error("Supabase auth hydration failed:", error);
      } finally {
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

  function openCreateListing() {
    if (!currentUser) {
      return false;
    }

    setCreateListingOpen(true);
    return true;
  }

  function closeCreateListing() {
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

    setAuthReady(false);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(payload.email),
        password: payload.password,
        options: {
          data: {
            name: payload.name,
            neighborhood: payload.neighborhood,
            postal_code: normalizePostalCode(payload.postalCode),
          },
        },
      });

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data.user) {
        await bootstrapProfile(data.user, payload);
        if (data.session?.user) {
          setCurrentUserId(data.user.id);
          await refreshMarketplaceData(data.user.id);
        }
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

    const { error } = await supabase
      .from("profiles")
      .update({
        neighborhood: payload.neighborhood,
        postal_code: normalizePostalCode(payload.postalCode),
        favorite_games: payload.favoriteGames || [],
        meetup_preferences: payload.meetupPreferences || "",
        response_time: payload.responseTime || "~ 1 hour",
        banner_style: payload.bannerStyle || "neutral",
        bio: payload.bio || "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentUserId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    return { ok: true };
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

    if (!isSupabaseConfigured) {
      setListingDraft(payload);
      return { ok: true };
    }

    const { error } = await supabase.from("listing_drafts").upsert({
      user_id: currentUserId,
      payload: {
        ...payload,
        updatedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    setListingDraft(payload);
    return { ok: true };
  }

  async function clearListingDraft() {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to clear drafts." };
    }

    if (!isSupabaseConfigured) {
      setListingDraft(null);
      return { ok: true };
    }

    const { error } = await supabase
      .from("listing_drafts")
      .delete()
      .eq("user_id", currentUserId);

    if (error) {
      return { ok: false, error: error.message };
    }

    setListingDraft(null);
    return { ok: true };
  }

  async function addListing(payload) {
    if (!currentUserRecord) {
      return { ok: false, error: "You must be logged in to post a listing." };
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

    await clearListingDraft();
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

    if (!String(payload.comment || "").trim()) {
      return { ok: false, error: "Review comment is required." };
    }

    if (!isSupabaseConfigured) {
      const review = {
        id: `review-${Date.now()}`,
        sellerId: payload.sellerId,
        authorId: currentUser.id,
        author: currentUser.name,
        rating: Number(payload.rating) || 5,
        comment: String(payload.comment || "").trim(),
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setReviews((current) => [review, ...current]);
      return { ok: true, review };
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        seller_id: payload.sellerId,
        author_id: currentUser.id,
        author_name: currentUser.name,
        rating: Number(payload.rating) || 5,
        comment: String(payload.comment || "").trim(),
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await pushNotification({
      userId: payload.sellerId,
      type: "review-posted",
      title: "New seller review",
      body: `${currentUser.name} left you a ${Number(payload.rating) || 5}-star review.`,
      entityId: payload.sellerId,
    });
    await refreshMarketplaceData(currentUserId);
    return { ok: true, review: fromReviewRow(data) };
  }

  function getThreadById(threadId) {
    return threadsForCurrentUser.find((thread) => thread.id === threadId) || null;
  }

  async function findOrCreateThread({ otherUserId, listingId = null }) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to message sellers." };
    }

    const existingThread =
      threads.find((thread) => {
        const sameListing = String(thread.listingId || "") === String(listingId || "");
        const includesBothUsers =
          thread.participantIds.includes(currentUserId) &&
          thread.participantIds.includes(otherUserId) &&
          thread.participantIds.length === 2;

        return sameListing && includesBothUsers;
      }) || null;

    if (existingThread) {
      return { ok: true, thread: existingThread };
    }

    if (!isSupabaseConfigured) {
      const thread = {
        id: `thread-${Date.now()}`,
        participantIds: [currentUserId, otherUserId],
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
        participant_ids: [currentUserId, otherUserId],
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    await refreshMarketplaceData(currentUserId);
    return {
      ok: true,
      thread: {
        id: data.id,
        participantIds: data.participant_ids || [],
        listingId: data.listing_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        messages: [],
      },
    };
  }

  async function sendMessage(threadId, body) {
    const trimmed = String(body || "").trim();
    if (!trimmed) {
      return { ok: false, error: "Message cannot be empty." };
    }

    const thread = threads.find((item) => item.id === threadId);
    if (!thread || !currentUserId) {
      return { ok: false, error: "Conversation not found." };
    }

    const otherUserId = thread.participantIds.find((id) => id !== currentUserId);
    const createdAt = new Date().toISOString();

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
                    senderId: currentUserId,
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

    const { error: messageError } = await supabase.from("messages").insert({
      thread_id: threadId,
      sender_id: currentUserId,
      body: trimmed,
      read_by: [currentUserId],
    });

    if (messageError) {
      return { ok: false, error: messageError.message };
    }

    const { error: threadError } = await supabase
      .from("message_threads")
      .update({ updated_at: createdAt })
      .eq("id", threadId);

    if (threadError) {
      return { ok: false, error: threadError.message };
    }

    if (otherUserId) {
      await pushNotification({
        userId: otherUserId,
        type: "message",
        title: "New message",
        body: `${currentUser?.name || "A buyer"} sent a new message.`,
        entityId: threadId,
      });
    }

    await refreshMarketplaceData(currentUserId);
    return { ok: true };
  }

  async function createOffer(payload) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to make an offer." };
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
      return { ok: true, offer };
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
      body: `${currentUser?.name || "A buyer"} sent an offer on ${listing.title}.`,
      entityId: payload.listingId,
    });

    await refreshMarketplaceData(currentUserId);
    return { ok: true, offer: fromOfferRow(data) };
  }

  async function respondToOffer(offerId, action, counterPayload = {}) {
    const offer = offers.find((item) => item.id === offerId);
    if (!offer || !currentUserId) {
      return { ok: false, error: "Offer not found." };
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
          ? `${currentUser?.name || "Seller"} sent a counter offer.`
          : `${currentUser?.name || "Seller"} ${nextStatus} your offer.`,
      entityId: offer.listingId,
    });

    await refreshMarketplaceData(currentUserId);
    return { ok: true };
  }

  async function submitReport(payload) {
    if (!currentUserId) {
      return { ok: false, error: "You must be logged in to submit a report." };
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
            body: `${currentUser?.name || "A user"} reported a listing for ${reasonLabel}.`,
            entityId: payload.listingId,
          }),
        ),
    );

    await refreshMarketplaceData(currentUserId);
    return { ok: true, report: fromReportRow(data) };
  }

  async function updateReportStatus(reportId, status) {
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

    await refreshMarketplaceData(currentUserId);
    return { ok: true };
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
    currentUser,
    currentUserId,
    currentUserListings,
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
    isCreateListingOpen,
    isSupabaseConfigured,
    listingDraft,
    listings: enrichedListings,
    loading,
    login,
    logout,
    manualEvents,
    markAllNotificationsRead,
    markListingSold,
    markNotificationRead,
    notificationsForCurrentUser,
    offers,
    offersByListingId,
    offersForCurrentUser,
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
    sellerMap,
    sellers: Object.values(sellerMap),
    sendMessage,
    setGlobalSearch,
    signup,
    submitReport,
    threadsForCurrentUser,
    toggleListingFeatured,
    toggleListingFlag,
    toggleListingRemoved,
    toggleManualEventPublished,
    toggleUserAdmin,
    toggleUserBadge,
    toggleUserSuspended,
    toggleUserVerified,
    unreadNotificationCount,
    updateCurrentUserProfile,
    updateListingAdminNote,
    updateReportStatus,
    users: Object.values(sellerMap),
    wishlist,
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
