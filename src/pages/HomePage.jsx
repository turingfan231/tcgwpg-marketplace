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

const CURATED_HERO_ART = {
  pokemon:
    "https://bouncycastlenetwork-res.cloudinary.com/image/upload/f_auto,q_auto,c_limit,w_1000/ff36cb86b0aefad50ddd401ff138fde5",
  "one-piece":
    "https://www.toei-animation.com/wp-content/uploads/2019/02/collage-1920x595.png",
  magic:
    "https://shikdartrading.com/cdn/shop/files/MTG_Banner_2.jpg?v=1730184513&width=3840",
};

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
  onOpenGame,
}) {
  const listingGallery = slide.kind === "listing" ? slide.payload.gallery || [] : [];
  const heroBackdrop =
    slide.payload.heroBackdrop ||
    CURATED_HERO_ART[
      slide.kind === "event"
        ? normalizeGameKey(slide.payload.game)
        : slide.kind === "game"
          ? normalizeGameKey(slide.payload.slug)
          : normalizeGameKey(slide.payload.game)
    ] ||
    null;
  const backgroundImage =
    slide.payload.backgroundImage || listingGallery[0] || slide.payload.imageUrl || null;

  return (
    <article
      className={`absolute inset-0 transition-all duration-700 ease-out ${
        active
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="relative h-full overflow-hidden rounded-[36px] border border-white/10 bg-[#09131d] p-8 text-white shadow-[0_32px_90px_-48px_rgba(6,18,27,0.62)] sm:p-10 lg:p-12">
        {heroBackdrop ? (
          <img
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            src={heroBackdrop}
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,13,20,0.94)_0%,rgba(7,18,27,0.92)_32%,rgba(10,24,35,0.66)_58%,rgba(10,24,35,0.34)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.06),transparent_18%),radial-gradient(circle_at_82%_20%,rgba(255,153,0,0.12),transparent_16%)]" />

        <div className="relative z-10 flex h-full flex-col gap-8">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              {slide.kicker}
            </span>
            <h1 className="mt-5 max-w-3xl font-display text-[2.65rem] font-semibold leading-[0.92] tracking-[-0.07em] sm:text-[4rem]">
              {slide.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/76 sm:text-base">
              {slide.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {slide.meta.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/74"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className={`rounded-full px-5 py-3 text-sm font-semibold shadow-soft ${
                  slide.kind === "event" ? "bg-orange text-white" : "bg-white text-navy"
                }`}
                type="button"
                onClick={() => {
                  if (slide.kind === "listing") {
                    onOpenListing(slide.payload.id);
                  } else if (slide.kind === "event") {
                    onOpenEvent();
                  } else if (slide.kind === "game") {
                    onOpenGame(slide.payload.slug);
                  } else {
                    onOpenSeller(slide.payload.id);
                  }
                }}
              >
                {slide.cta}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function BestSellerCard({ listing, formatCadPrice, onOpen, onToggleWishlist }) {
  return (
    <article className="overflow-hidden rounded-[26px] border border-[rgba(205,220,231,0.88)] bg-white shadow-soft">
      <button className="block w-full text-left" type="button" onClick={() => onOpen(listing.id)}>
        <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(180deg,#edf4f8_0%,#dce7ef_100%)] p-4">
          <CardArtwork
            className="aspect-[63/88] h-full max-h-[220px] rounded-[18px] object-cover shadow-soft"
            game={listing.game}
            src={listing.imageUrl}
            title={listing.title}
          />
        </div>
      </button>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 font-semibold text-ink">{listing.title}</p>
            <p className="mt-1 text-sm text-steel">
              {listing.game} | {listing.neighborhood}
            </p>
          </div>
          <button
            aria-label={listing.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={`inline-flex items-center justify-center rounded-full p-2 ${
              listing.wishlisted ? "bg-orange/15 text-orange" : "bg-[#edf3f7] text-steel"
            }`}
            type="button"
            onClick={() => onToggleWishlist(listing.id)}
          >
            <Heart fill={listing.wishlisted ? "currentColor" : "none"} size={15} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <p className="font-display text-[1.6rem] font-semibold tracking-[-0.05em] text-ink">
            {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
          </p>
          <button className="text-sm font-semibold text-navy" type="button" onClick={() => onOpen(listing.id)}>
            View
          </button>
        </div>
      </div>
    </article>
  );
}

function SecondaryPromo({ feature, formatCadPrice, onOpenListing, onOpenEvent, onOpenGame }) {
  if (!feature) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-[rgba(201,216,228,0.9)] bg-[linear-gradient(120deg,#123246_0%,#16384c_56%,#0b2231_100%)] text-white shadow-[0_28px_80px_-48px_rgba(6,18,27,0.58)]">
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)_14rem] lg:items-center">
        <div className="flex justify-center px-6 pt-6 lg:pt-0">
          <div className="flex items-end gap-3">
            {(feature.gallery || []).slice(0, 2).map((src, index) => (
              <div
                key={`${feature.id || feature.slug}-${index}`}
                className={`rounded-[22px] border border-white/18 bg-white/10 p-2 backdrop-blur ${
                  index === 1 ? "translate-y-6" : ""
                }`}
              >
                <CardArtwork
                  className="aspect-[63/88] w-[7.6rem] rounded-[16px] object-cover"
                  game={feature.game || feature.name}
                  src={src}
                  title={`${feature.title || feature.name} ${index + 1}`}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 pb-6 pt-2 lg:px-0 lg:py-8">
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
            {feature.kicker}
          </span>
          <h2 className="mt-4 max-w-3xl font-display text-[2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.45rem]">
            {feature.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/76 sm:text-base">
            {feature.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {feature.meta.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/78"
              >
                {item}
              </span>
            ))}
          </div>
          <button
            className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-navy"
            type="button"
            onClick={() => {
              if (feature.kind === "listing") {
                onOpenListing(feature.id);
              } else if (feature.kind === "event") {
                onOpenEvent();
              } else {
                onOpenGame(feature.slug);
              }
            }}
          >
            {feature.cta}
          </button>
        </div>
        <div className="hidden h-full border-l border-white/10 px-6 py-8 lg:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">
            {feature.kind === "listing" ? "Market price" : feature.kind === "event" ? "Calendar" : "Channel"}
          </p>
          <p className="mt-4 font-display text-[1.85rem] font-semibold tracking-[-0.05em] text-white">
            {feature.kind === "listing"
              ? formatCadPrice(feature.price, feature.priceCurrency || "CAD")
              : feature.kind === "event"
                ? feature.time
                : `${feature.count} live`}
          </p>
          <p className="mt-2 text-sm text-white/72">
            {feature.kind === "listing"
              ? `${feature.game} | ${feature.neighborhood}`
              : feature.kind === "event"
                ? feature.store
                : `${feature.neighborhoodCount} meetup areas`}
          </p>
        </div>
      </div>
    </section>
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
  const featuredGame = useMemo(() => {
    const rankedGames = categorySummaries
      .map((game) => {
        const listings = safeListings.filter((listing) => listing?.gameSlug === game.slug).slice(0, 3);
        const neighborhoods = new Set(
          safeListings
            .filter((listing) => listing?.gameSlug === game.slug && listing?.neighborhood)
            .map((listing) => listing.neighborhood),
        );
        return {
          ...game,
          count: listings.length ? safeListings.filter((listing) => listing?.gameSlug === game.slug).length : 0,
          neighborhoodCount: neighborhoods.size,
          gallery: listings.map((listing) => listing.imageUrl).filter(Boolean),
        };
      })
      .sort((left, right) => right.count - left.count);

    return rankedGames[0] || null;
  }, [categorySummaries, safeListings]);

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
          heroBackdrop: CURATED_HERO_ART[eventGameKey] || null,
          heroArt: CURATED_HERO_ART[eventGameKey] || artworkByGame[eventGameKey] || null,
        },
      });
    }

    if (featuredGame) {
      slides.push({
        id: `game-${featuredGame.slug}`,
        kind: "game",
        kicker: "Market channel",
        title: `${featuredGame.name} is moving fastest in the market`,
        description:
          "Jump straight into the busiest game channel to see what is actually getting posted locally right now.",
        meta: [
          `${featuredGame.count} listings`,
          `${featuredGame.neighborhoodCount || 1} neighborhoods`,
          featuredGame.shortName,
        ],
        cta: "Browse game",
        payload: {
          ...featuredGame,
          heroBackdrop: CURATED_HERO_ART[normalizeGameKey(featuredGame.slug)] || null,
          heroArt: CURATED_HERO_ART[normalizeGameKey(featuredGame.slug)] || artworkByGame[normalizeGameKey(featuredGame.slug)] || null,
        },
      });
    }

    return slides;
  }, [artworkByGame, featuredGame, featuredListing, nextEvent]);

  const marketPulse = [
    { label: "Live listings", value: formatNumber(safeListings.length) },
    { label: "Verified sellers", value: formatNumber(verifiedSellerCount) },
    { label: "Games", value: "3", detail: "Pokemon, Magic, One Piece" },
    { label: "Next meetup", value: nextEvent?.store || "Events", detail: nextEvent?.dateStr || "Calendar ready" },
  ];
  const promoFeature = useMemo(() => {
    if (featuredGame) {
      return {
        kind: "game",
        ...featuredGame,
        kicker: "Featured channel",
        title: `Browse ${featuredGame.name} like a live storefront`,
        description:
          "See the busiest game channel first, then jump into the rest of the market when you want more depth.",
        meta: [
          `${featuredGame.count} listings`,
          `${featuredGame.neighborhoodCount || 1} neighborhoods`,
          featuredGame.shortName,
        ],
        cta: "Browse game",
      };
    }

    if (nextEvent) {
      const eventGameKey = normalizeGameKey(nextEvent.game);
      return {
        kind: "event",
        ...nextEvent,
        kicker: "Upcoming event",
        title: nextEvent.title,
        description:
          "Use the event calendar to line up store nights, prereleases, and tournament weekends with what is moving in the market.",
        meta: [nextEvent.store, nextEvent.game, nextEvent.time],
        gallery: [artworkByGame[eventGameKey], featuredListing?.imageUrl].filter(Boolean),
        cta: "View events",
      };
    }

    if (featuredListing) {
      return {
        kind: "listing",
        ...featuredListing,
        kicker: "Featured listing",
        description:
          "A highlighted local listing with pricing, in-app offers, and meetup planning built into the page.",
        meta: [featuredListing.game, featuredListing.neighborhood, `${featuredListing.views || 0} views`],
        gallery: [featuredListing.imageUrl, ...(featuredListing.conditionImages || [])].filter(Boolean),
        cta: "Open listing",
      };
    }

    return null;
  }, [artworkByGame, featuredGame, featuredListing, nextEvent]);

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
      <section className="drop-in-item space-y-6">
        <div>
          {bannerSlides.length ? (
            <div className="relative min-h-[29rem] overflow-hidden rounded-[36px] sm:min-h-[33rem] lg:min-h-[31rem]">
              {bannerSlides.map((slide, index) => (
                <BannerCard
                  key={slide.id}
                  active={activeBannerIndex === index}
                  formatCadPrice={formatCadPrice}
                  onOpenEvent={() => navigate("/events")}
                  onOpenGame={(slug) => {
                    setGlobalSearch("");
                    navigate(`/market/${slug}`);
                  }}
                  onOpenListing={openListing}
                  onOpenSeller={(sellerId) => navigate(`/seller/${sellerId}`)}
                  slide={slide}
                />
              ))}

              {bannerSlides.length > 1 ? (
                <div className="absolute bottom-6 right-6 z-10 flex gap-2">
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

        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-navy/62">
              Winnipeg TCG marketplace
            </p>
            <h1 className="mt-3 font-display text-[2.15rem] font-semibold leading-[0.96] tracking-[-0.06em] text-ink sm:text-[3rem] lg:text-[3.55rem]">
              A local card market that feels more like a storefront than a classifieds page.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-steel sm:text-base">
              Browse by game, catch store events, and keep offers attached to the listing without the site feeling cluttered.
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {marketPulse.map((item) => (
            <PulseTile key={item.label} detail={item.detail} label={item.label} value={item.value} />
          ))}
        </div>
      </section>

      <SecondaryPromo
        feature={promoFeature}
        formatCadPrice={formatCadPrice}
        onOpenEvent={() => navigate("/events")}
        onOpenGame={(slug) => {
          setGlobalSearch("");
          navigate(`/market/${slug}`);
        }}
        onOpenListing={openListing}
      />

      <section className="drop-in-item space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Best sellers</p>
            <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.05em] text-ink">
              Hot listings right now
            </h2>
            <p className="mt-2 text-sm text-steel">A cleaner top shelf of live cards from the local market.</p>
          </div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-navy" to="/market">
            Open full market
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {safeHotListings.slice(0, 5).map((listing) => (
            <BestSellerCard
              key={listing.id}
              formatCadPrice={formatCadPrice}
              listing={listing}
              onOpen={openListing}
              onToggleWishlist={handleToggleWishlist}
            />
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
