import {
  ArrowRight,
  CalendarRange,
  Clock3,
  Heart,
  MapPin,
  MessageCircleMore,
  Shield,
  Store,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CardArtwork from "../components/shared/CardArtwork";
import UserAvatar from "../components/shared/UserAvatar";
import PageSkeleton from "../components/ui/PageSkeleton";
import { useMarketplace } from "../hooks/useMarketplace";
import { fetchLocalEvents } from "../services/cardDatabase";
import { formatNumber } from "../utils/formatters";

function sortByUpcomingDate(events) {
  return [...events].sort(
    (left, right) => new Date(left.dateStr).getTime() - new Date(right.dateStr).getTime(),
  );
}

function normalizeGameKey(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.includes("one piece")) {
    return "one-piece";
  }
  if (normalized.includes("pokemon")) {
    return "pokemon";
  }
  if (normalized.includes("magic")) {
    return "magic";
  }
  return normalized || null;
}

function QuickActionButton({ children, tone = "light", ...props }) {
  return (
    <button
      className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
        tone === "primary"
          ? "bg-navy text-white shadow-soft"
          : tone === "orange"
            ? "bg-orange text-white shadow-soft"
            : "border border-[rgba(203,220,231,0.92)] bg-white/80 text-ink hover:border-slate-300"
      }`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

function PulseTile({ label, value, detail }) {
  return (
    <div className="console-well px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy/65">{label}</p>
      <p className="mt-2 font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-ink">{value}</p>
      {detail ? <p className="mt-1 text-sm text-steel">{detail}</p> : null}
    </div>
  );
}

function FeedRow({ listing, formatCadPrice, onOpen, onToggleWishlist }) {
  return (
    <div className="flex items-start gap-3 rounded-[22px] border border-[rgba(203,220,231,0.92)] bg-white/82 px-4 py-4 shadow-[0_14px_32px_-28px_rgba(26,91,120,0.55)]">
      <button className="min-w-0 flex-1 text-left" type="button" onClick={() => onOpen(listing.id)}>
        <p className="truncate font-semibold text-ink">{listing.title}</p>
        <p className="mt-1 text-sm text-steel">
          {listing.game} | {listing.neighborhood}
        </p>
      </button>
      <div className="text-right">
        <p className="font-semibold text-ink">
          {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-steel">{listing.timeAgo}</p>
      </div>
      <button
        aria-label={listing.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className={`inline-flex items-center justify-center rounded-full p-2 ${
          listing.wishlisted ? "bg-orange/15 text-orange" : "bg-[#eef5f9] text-steel"
        }`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleWishlist(listing.id);
        }}
      >
        <Heart fill={listing.wishlisted ? "currentColor" : "none"} size={15} />
      </button>
    </div>
  );
}

function ShelfCard({ listing, formatCadPrice, onOpen }) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-[20px] border border-[rgba(203,220,231,0.92)] bg-white/82 px-4 py-4 text-left transition hover:border-navy/20"
      type="button"
      onClick={() => onOpen(listing.id)}
    >
      <CardArtwork
        className="aspect-[63/88] w-[4.5rem] rounded-[16px] object-cover"
        game={listing.game}
        src={listing.imageUrl}
        title={listing.title}
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-semibold text-ink">{listing.title}</p>
        <p className="mt-1 text-sm text-steel">
          {listing.neighborhood} | {listing.seller?.publicName || listing.seller?.name}
        </p>
      </div>
      <p className="font-semibold text-ink">
        {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
      </p>
    </button>
  );
}

function BannerCard({
  slide,
  active,
  formatCadPrice,
  onOpenListing,
  onOpenEvent,
  onOpenSeller,
}) {
  const paletteMap = {
    listing: "from-[#102739]/95 via-[#17384c]/92 to-[#0b1d2a]/95 text-white",
    event: "from-[#0f2637]/96 via-[#17384c]/94 to-[#102739]/96 text-white",
    seller: "from-[#122b3d]/96 via-[#17384c]/94 to-[#0b1d2a]/96 text-white",
  };

  const buttonMap = {
    listing: "bg-white text-navy",
    event: "bg-orange text-white",
    seller: "bg-white text-navy",
  };

  const secondaryMap = {
    listing: "text-white/74",
    event: "text-white/76",
    seller: "text-white/74",
  };

  const badgeMap = {
    listing: "bg-white/12 text-white",
    event: "bg-white/12 text-white",
    seller: "bg-white/12 text-white",
  };
  const listingGallery = slide.kind === "listing" ? slide.payload.gallery || [] : [];
  const backgroundImage = slide.payload.backgroundImage || slide.payload.imageUrl || null;

  return (
    <article
      className={`absolute inset-0 transition-all duration-700 ease-out ${
        active
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div
        className={`relative h-full overflow-hidden rounded-[36px] border border-white/18 bg-gradient-to-br p-6 shadow-[0_30px_80px_-46px_rgba(20,54,74,0.52)] sm:p-8 lg:p-10 ${paletteMap[slide.kind]}`}
      >
        {backgroundImage ? (
          <div className="absolute inset-0">
            <img
              alt=""
              aria-hidden="true"
              className="h-full w-full scale-110 object-cover opacity-40 blur-[2px]"
              src={backgroundImage}
            />
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(7,18,27,0.88),rgba(14,38,56,0.72)_44%,rgba(7,18,27,0.8))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,153,0,0.16),transparent_18%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_24%)]" />
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-y-0 right-0 w-[38%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_68%)]" />

        <div className="relative z-10 grid h-full gap-8 lg:grid-cols-[minmax(0,1.05fr)_24rem] lg:items-center">
          <div className="max-w-3xl">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeMap[slide.kind]}`}
            >
              {slide.kicker}
            </span>
            <h1 className="mt-5 max-w-3xl font-display text-[2.65rem] font-semibold leading-[0.92] tracking-[-0.07em] sm:text-[4rem]">
              {slide.title}
            </h1>
            <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${secondaryMap[slide.kind]}`}>
              {slide.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {slide.meta.map((item) => (
                <span
                  key={item}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${
                    slide.kind === "event"
                      ? "bg-white/12 text-white"
                      : "bg-white/66 text-steel"
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className={`rounded-full px-5 py-3 text-sm font-semibold shadow-soft ${buttonMap[slide.kind]}`}
                type="button"
                onClick={() => {
                  if (slide.kind === "listing") {
                    onOpenListing(slide.payload.id);
                  } else if (slide.kind === "event") {
                    onOpenEvent();
                  } else {
                    onOpenSeller(slide.payload.id);
                  }
                }}
              >
                {slide.cta}
              </button>
              {slide.kind === "listing" ? (
                <div className="rounded-full bg-white/12 px-4 py-3 text-sm font-semibold text-white">
                  {formatCadPrice(slide.payload.price, slide.payload.priceCurrency || "CAD")}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-center">
            {slide.kind === "listing" ? (
              <div className="relative w-full max-w-[22rem]">
                {listingGallery[1] ? (
                  <div className="absolute -left-2 top-10 hidden w-[7rem] rotate-[-8deg] rounded-[22px] border border-white/20 bg-white/8 p-2 shadow-soft backdrop-blur sm:block">
                    <CardArtwork
                      className="aspect-[63/88] w-full rounded-[16px] object-cover"
                      game={slide.payload.game}
                      src={listingGallery[1]}
                      title={`${slide.payload.title} alt 1`}
                    />
                  </div>
                ) : null}
                {listingGallery[2] ? (
                  <div className="absolute -right-1 bottom-10 hidden w-[7rem] rotate-[9deg] rounded-[22px] border border-white/20 bg-white/8 p-2 shadow-soft backdrop-blur sm:block">
                    <CardArtwork
                      className="aspect-[63/88] w-full rounded-[16px] object-cover"
                      game={slide.payload.game}
                      src={listingGallery[2]}
                      title={`${slide.payload.title} alt 2`}
                    />
                  </div>
                ) : null}
                <div className="relative z-10 rounded-[30px] border border-white/18 bg-white/10 p-4 backdrop-blur">
                  <div className="mx-auto w-[11rem] sm:w-[13rem]">
                    <CardArtwork
                      className="aspect-[63/88] w-full rounded-[24px] object-cover shadow-soft"
                      game={slide.payload.game}
                      src={slide.payload.imageUrl}
                      title={slide.payload.title}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {slide.kind === "event" ? (
              <div className="grid w-full max-w-[22rem] gap-3">
                <div className="rounded-[30px] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-5 backdrop-blur">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-white/78">
                    <CalendarRange size={16} />
                    Upcoming local night
                  </div>
                  <p className="mt-4 font-display text-[1.8rem] font-semibold tracking-[-0.04em] text-white">
                    {slide.payload.title}
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-white/78">
                    <p>{slide.payload.store}</p>
                    <p>
                      {slide.payload.dateStr} | {slide.payload.time}
                    </p>
                    {slide.payload.neighborhood ? <p>{slide.payload.neighborhood}</p> : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[24px] border border-white/16 bg-white/10 p-4 backdrop-blur">
                    <Clock3 size={18} className="text-orange" />
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
                      Time
                    </p>
                    <p className="mt-2 font-display text-[1.3rem] font-semibold tracking-[-0.04em] text-white">
                      {slide.payload.time}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/16 bg-white/10 p-4 backdrop-blur">
                    <Store size={18} className="text-orange" />
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
                      Store
                    </p>
                    <p className="mt-2 line-clamp-2 font-display text-[1.1rem] font-semibold tracking-[-0.04em] text-white">
                      {slide.payload.store}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {slide.kind === "seller" ? (
              <div className="w-full max-w-[22rem] space-y-3">
                <div className="rounded-[30px] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] p-5 backdrop-blur">
                  <div className="flex items-center gap-4">
                    <UserAvatar className="h-16 w-16 text-lg font-bold" user={slide.payload} />
                    <div className="min-w-0">
                      <p className="truncate font-display text-[1.5rem] font-semibold tracking-[-0.04em] text-white">
                        {slide.payload.publicName || slide.payload.firstName || slide.payload.name}
                      </p>
                      <p className="mt-1 text-sm text-white/72">{slide.payload.neighborhood}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] border border-white/16 bg-white/8 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">
                        Deals
                      </p>
                      <p className="mt-2 font-semibold text-white">{slide.payload.completedDeals || 0}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/16 bg-white/8 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">
                        Rating
                      </p>
                      <p className="mt-2 font-semibold text-white">
                        {slide.payload.overallRating ? slide.payload.overallRating.toFixed(1) : "New"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(slide.payload.favoriteGames || []).slice(0, 3).map((game) => (
                    <div
                      key={`${slide.payload.id}-${game}`}
                      className="rounded-[22px] border border-white/16 bg-white/10 px-3 py-4 text-center backdrop-blur"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange/80">
                        Game
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold text-white">{game}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const {
    activeListings,
    formatCadPrice,
    gameCatalog,
    hotListings,
    loading,
    manualEvents,
    openCreateListing,
    sellers,
    setGlobalSearch,
    toggleWishlist,
  } = useMarketplace();
  const [remoteEvents, setRemoteEvents] = useState([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const safeListings = Array.isArray(activeListings) ? activeListings.filter(Boolean) : [];
  const safeHotListings = Array.isArray(hotListings) ? hotListings.filter(Boolean) : [];
  const safeManualEvents = Array.isArray(manualEvents) ? manualEvents.filter(Boolean) : [];
  const safeSellers = Array.isArray(sellers) ? sellers.filter(Boolean) : [];
  const featuredCategories = (Array.isArray(gameCatalog) ? gameCatalog : []).filter(
    (game) => game?.slug && game.slug !== "all",
  );

  const categorySummaries = useMemo(
    () =>
      featuredCategories.map((game) => ({
        ...game,
        count: safeListings.filter((listing) => listing?.gameSlug === game.slug).length,
      })),
    [featuredCategories, safeListings],
  );

  const artworkByGame = useMemo(() => {
    const map = {};
    safeListings.forEach((listing) => {
      const gameKey = normalizeGameKey(listing?.gameSlug || listing?.game);
      if (gameKey && !map[gameKey] && listing?.imageUrl) {
        map[gameKey] = listing.imageUrl;
      }
    });
    return map;
  }, [safeListings]);

  const sellerArtworkById = useMemo(() => {
    const map = {};
    safeListings.forEach((listing) => {
      if (listing?.sellerId && !map[listing.sellerId] && listing?.imageUrl) {
        map[listing.sellerId] = listing.imageUrl;
      }
    });
    return map;
  }, [safeListings]);

  const gameShelves = useMemo(
    () =>
      categorySummaries.map((game) => ({
        ...game,
        listings: safeListings
          .filter((listing) => listing?.gameSlug === game.slug)
          .sort(
            (left, right) =>
              Number(right.featured) - Number(left.featured) ||
              (right.sortTimestamp || 0) - (left.sortTimestamp || 0),
          )
          .slice(0, 2),
      })),
    [categorySummaries, safeListings],
  );

  const freshListings = safeHotListings.slice(0, 4);
  const featuredListing = safeHotListings[0] || safeListings[0] || null;
  const verifiedSellerCount = safeSellers.filter((seller) => seller?.verified).length;
  const topSellers = [...safeSellers]
    .sort((left, right) => {
      const dealsDiff = Number(right.completedDeals || 0) - Number(left.completedDeals || 0);
      if (dealsDiff !== 0) {
        return dealsDiff;
      }
      return Number(right.overallRating || 0) - Number(left.overallRating || 0);
    })
    .slice(0, 4);
  const featuredSeller = topSellers[0] || null;

  const mergedEvents = useMemo(
    () =>
      sortByUpcomingDate(
        [...remoteEvents, ...safeManualEvents]
          .filter((event) => event?.published !== false && event?.title && event?.dateStr)
          .filter(
            (event, index, items) =>
              items.findIndex(
                (candidate) =>
                  String(candidate.title || "") === String(event.title || "") &&
                  String(candidate.dateStr || "") === String(event.dateStr || "") &&
                  String(candidate.store || "") === String(event.store || ""),
              ) === index,
          ),
      ),
    [remoteEvents, safeManualEvents],
  );
  const upcomingEvents = mergedEvents.slice(0, 4);
  const nextEvent = upcomingEvents[0] || null;

  const bannerSlides = useMemo(() => {
    const slides = [];

    if (featuredListing) {
      const gallery = [
        featuredListing.imageUrl,
        ...(featuredListing.conditionImages || []),
      ].filter(Boolean);
      slides.push({
        id: `listing-${featuredListing.id}`,
        kind: "listing",
        kicker: "Featured listing",
        title: featuredListing.title,
        description:
          "A highlighted local card with full in-app offers, meetup planning, and seller context built in.",
        meta: [
          featuredListing.game,
          featuredListing.neighborhood,
          `${featuredListing.views || 0} views`,
        ],
        cta: "Open listing",
        payload: {
          ...featuredListing,
          gallery,
          backgroundImage: featuredListing.imageUrl,
        },
      });
    }

    if (nextEvent) {
      const eventGameKey = normalizeGameKey(nextEvent.game);
      slides.push({
        id: `event-${nextEvent.id}`,
        kind: "event",
        kicker: "Upcoming event",
        title: nextEvent.title,
        description:
          "Use the events calendar to line up store nights, prereleases, and local tournaments with what is happening in the market.",
        meta: [nextEvent.store, nextEvent.game, nextEvent.time],
        cta: "View events",
        payload: {
          ...nextEvent,
          backgroundImage:
            artworkByGame[eventGameKey] ||
            featuredListing?.imageUrl ||
            null,
        },
      });
    }

    if (featuredSeller) {
      slides.push({
        id: `seller-${featuredSeller.id}`,
        kind: "seller",
        kicker: "Seller spotlight",
        title: `${featuredSeller.publicName || featuredSeller.firstName || featuredSeller.name} is active in the market`,
        description:
          "Trusted local storefronts make the market feel alive. Browse sellers by completed deals, rating, and favorite games.",
        meta: [
          `${featuredSeller.completedDeals || 0} deals`,
          featuredSeller.overallRating ? `${featuredSeller.overallRating.toFixed(1)} rating` : "New seller",
          featuredSeller.neighborhood || "Winnipeg",
        ],
        cta: "View seller",
        payload: {
          ...featuredSeller,
          backgroundImage: sellerArtworkById[featuredSeller.id] || featuredListing?.imageUrl || null,
        },
      });
    }

    return slides;
  }, [artworkByGame, featuredListing, featuredSeller, nextEvent, sellerArtworkById]);

  const marketPulse = [
    { label: "Live listings", value: formatNumber(safeListings.length) },
    { label: "Verified sellers", value: formatNumber(verifiedSellerCount) },
    { label: "Games", value: "3", detail: "Pokemon, Magic, One Piece" },
    { label: "Next meetup", value: nextEvent?.store || "Events", detail: nextEvent?.dateStr || "Calendar ready" },
  ];

  useEffect(() => {
    let cancelled = false;

    async function loadHomeEvents() {
      try {
        const data = await fetchLocalEvents();
        if (!cancelled) {
          setRemoteEvents(Array.isArray(data?.events) ? data.events.filter(Boolean) : []);
        }
      } catch {
        if (!cancelled) {
          setRemoteEvents([]);
        }
      }
    }

    void loadHomeEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (bannerSlides.length <= 1) {
      setActiveBannerIndex(0);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveBannerIndex((current) => (current + 1) % bannerSlides.length);
    }, 5400);

    return () => window.clearInterval(interval);
  }, [bannerSlides.length]);

  function handleToggleWishlist(listingId) {
    void toggleWishlist(listingId);
  }

  function openListing(listingId) {
    navigate(`/listing/${listingId}`);
  }

  function openPreset(type, fallbackPath) {
    const opened = openCreateListing({ type });
    if (!opened) {
      navigate("/auth", { state: { from: fallbackPath } });
    }
  }

  if (loading && !safeListings.length) {
    return <PageSkeleton cards={4} titleWidth="w-80" />;
  }

    return (
    <div className="stagger-stack space-y-10 lg:space-y-14">
      <section className="drop-in-item console-shell overflow-hidden px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mb-6">
          {bannerSlides.length ? (
            <div className="relative min-h-[34rem] overflow-hidden rounded-[36px] sm:min-h-[38rem] lg:min-h-[30rem]">
              {bannerSlides.map((slide, index) => (
                <BannerCard
                  key={slide.id}
                  active={activeBannerIndex === index}
                  formatCadPrice={formatCadPrice}
                  onOpenEvent={() => navigate("/events")}
                  onOpenListing={openListing}
                  onOpenSeller={(sellerId) => navigate(`/seller/${sellerId}`)}
                  slide={slide}
                />
              ))}

              {bannerSlides.length > 1 ? (
                <div className="absolute bottom-5 left-5 z-10 flex gap-2">
                  {bannerSlides.map((slide, index) => (
                    <button
                      key={slide.id}
                      aria-label={`Show banner ${index + 1}`}
                      className={`h-2.5 rounded-full transition-all ${
                        activeBannerIndex === index
                          ? "w-10 bg-white shadow-sm"
                          : "w-2.5 bg-white/45"
                      }`}
                      type="button"
                      onClick={() => setActiveBannerIndex(index)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[30px] border border-dashed border-[rgba(203,220,231,0.92)] bg-white/70 px-6 py-12 text-sm leading-7 text-steel">
              Banner content will appear as soon as there are active listings and upcoming events.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-navy/62">
              Winnipeg TCG marketplace
            </p>
            <h1 className="mt-3 font-display text-[2.2rem] font-semibold leading-[0.96] tracking-[-0.06em] text-ink sm:text-[3.2rem] lg:text-[4rem]">
              A cleaner local market for cards, meetups, and store nights.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-steel sm:text-base">
              Real listings, live local events, and in-app offers for Pokemon, Magic, and One Piece
              in Winnipeg.
            </p>
          </div>

          <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <QuickActionButton
              tone="primary"
              onClick={() => {
                setGlobalSearch("");
                navigate("/market");
              }}
            >
              Browse market
            </QuickActionButton>
            <QuickActionButton onClick={() => openPreset("WTS", "/dashboard")}>
              List a card
            </QuickActionButton>
            <QuickActionButton tone="orange" onClick={() => openPreset("WTB", "/wtb")}>
              Post a WTB
            </QuickActionButton>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {marketPulse.map((item) => (
            <PulseTile key={item.label} detail={item.detail} label={item.label} value={item.value} />
          ))}
        </div>
      </section>

      <section className="drop-in-cluster grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="drop-in-item console-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Fresh from the feed</p>
              <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.05em] text-ink">
                New local listings
              </h2>
            </div>
            <Store className="text-navy" size={20} />
          </div>

          <div className="mt-5 grid gap-3">
            {freshListings.length ? (
              freshListings.map((listing) => (
                <FeedRow
                  key={listing.id}
                  formatCadPrice={formatCadPrice}
                  listing={listing}
                  onOpen={openListing}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[rgba(203,220,231,0.92)] bg-white/70 px-5 py-10 text-sm leading-7 text-steel">
                New listings will appear here as soon as cards are posted.
              </div>
            )}
          </div>
        </article>

        <aside className="drop-in-item console-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Browse by game</p>
              <h2 className="mt-2 font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-ink">
                Quick channels
              </h2>
            </div>
            <Users className="text-orange" size={20} />
          </div>

          <div className="mt-5 grid gap-3">
            {categorySummaries.map((game) => (
              <button
                key={game.slug}
                className="console-well px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-navy/25"
                type="button"
                onClick={() => {
                  setGlobalSearch("");
                  navigate(`/market/${game.slug}`);
                }}
              >
                <p className="font-display text-[1.2rem] font-semibold tracking-[-0.03em] text-ink">
                  {game.name}
                </p>
                <p className="mt-1 text-sm text-steel">{game.count} active listings</p>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="drop-in-item console-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Game shelves</p>
            <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.05em] text-ink">
              Browse the active market
            </h2>
          </div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-navy" to="/market">
            Open full market
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {gameShelves.map((game) => (
            <article
              key={game.slug}
              className="overflow-hidden rounded-[26px] border border-[rgba(203,220,231,0.92)] bg-white/78"
            >
              <div className="border-b border-[rgba(203,220,231,0.82)] bg-[linear-gradient(180deg,#edf4f9_0%,#deebf3_100%)] px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/60">
                      {game.shortName}
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
                      {game.name}
                    </h3>
                  </div>
                  <button
                    className="inline-flex items-center gap-1 text-sm font-semibold text-navy"
                    type="button"
                    onClick={() => {
                      setGlobalSearch("");
                      navigate(`/market/${game.slug}`);
                    }}
                  >
                    Browse
                    <ArrowRight size={14} />
                  </button>
                </div>
                <p className="mt-3 text-sm leading-7 text-steel">{game.description}</p>
              </div>

              <div className="space-y-3 p-4">
                {game.listings.length ? (
                  game.listings.map((listing) => (
                    <ShelfCard
                      key={listing.id}
                      formatCadPrice={formatCadPrice}
                      listing={listing}
                      onOpen={openListing}
                    />
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-[rgba(203,220,231,0.92)] bg-white/68 px-4 py-6 text-sm text-steel">
                    No active {game.shortName} listings yet.
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="drop-in-cluster grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="drop-in-item console-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Upcoming events</p>
              <h2 className="mt-2 font-display text-[1.95rem] font-semibold tracking-[-0.05em] text-ink">
                Local calendar
              </h2>
            </div>
            <CalendarRange className="text-orange" size={20} />
          </div>
          <div className="mt-5 space-y-3">
            {upcomingEvents.length ? (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-4 rounded-[20px] border border-[rgba(203,220,231,0.92)] bg-white/78 px-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-ink">{event.title}</p>
                    <p className="mt-1 text-sm text-steel">
                      {event.store} | {event.dateStr} | {event.time}
                    </p>
                  </div>
                  <Link className="whitespace-nowrap text-sm font-semibold text-navy" to="/events">
                    Details
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-[rgba(203,220,231,0.92)] bg-white/70 px-4 py-6 text-sm text-steel">
                Event listings are still being refreshed.
              </div>
            )}
          </div>
        </article>

        <article className="drop-in-item console-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Trusted sellers</p>
              <h2 className="mt-2 font-display text-[1.95rem] font-semibold tracking-[-0.05em] text-ink">
                Accounts worth browsing
              </h2>
            </div>
            <Shield className="text-navy" size={20} />
          </div>

          <div className="mt-5 space-y-3">
            {topSellers.map((seller) => (
              <button
                key={seller.id}
                className="flex w-full items-center justify-between gap-4 rounded-[20px] border border-[rgba(203,220,231,0.92)] bg-white/78 px-4 py-4 text-left transition hover:border-navy/20"
                type="button"
                onClick={() => navigate(`/seller/${seller.id}`)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar className="h-11 w-11 text-sm font-bold" user={seller} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">
                      {seller.publicName || seller.firstName || seller.name}
                    </p>
                    <p className="mt-1 text-sm text-steel">
                      {seller.completedDeals || 0} deals
                      {seller.overallRating ? ` | ${seller.overallRating.toFixed(1)} rating` : ""}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
                  View
                  <ArrowRight size={14} />
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="console-well p-4">
              <MessageCircleMore className="text-orange" size={18} />
              <p className="mt-3 font-semibold text-ink">In-app offers</p>
              <p className="mt-1 text-sm leading-7 text-steel">
                Keep cash, trade, and meetup details attached to the listing thread.
              </p>
            </div>
            <div className="console-well p-4">
              <MapPin className="text-navy" size={18} />
              <p className="mt-3 font-semibold text-ink">Neighborhood filters</p>
              <p className="mt-1 text-sm leading-7 text-steel">
                Browse by where you actually want to meet instead of the whole city at once.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
