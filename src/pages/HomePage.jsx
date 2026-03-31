import {
  ArrowRight,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Heart,
  Shield,
} from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import CardArtwork from "../components/shared/CardArtwork";
import UserAvatar from "../components/shared/UserAvatar";
import { storeProfiles } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";
import { fetchLocalEvents } from "../services/cardDatabase";

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
  if (normalized.includes("dragon ball") || normalized.includes("fusion world")) {
    return "dragon-ball-fusion-world";
  }
  if (normalized.includes("union arena")) {
    return "union-arena";
  }
  return normalized || null;
}

const CURATED_HERO_ART = {
  pokemon: "/hero/pokemon-hero.png",
  "one-piece": "/hero/one-piece-hero.jpg",
  magic: "/hero/magic-hero.jpg",
  "dragon-ball-fusion-world": "/hero/fusion-world-hero.jpg",
  "union-arena": "/hero/union-arena-hero.jpg",
};

function ShelfCard({ listing, formatCadPrice, onOpen }) {
  return (
    <button
      className="flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--surface-solid)] px-2.5 py-2.5 text-left transition duration-300 hover:-translate-y-0.5 hover:border-navy/20 hover:shadow-soft sm:gap-2.5 sm:px-3 sm:py-3"
      type="button"
      onClick={() => onOpen(listing.id)}
    >
      <CardArtwork
        className="aspect-[63/88] w-[3rem] rounded-[8px] object-cover sm:w-[3.4rem]"
        game={listing.game}
        src={listing.imageUrl}
        title={listing.title}
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[0.84rem] font-semibold leading-5 text-ink sm:text-[0.9rem]">{listing.title}</p>
        <p className="mt-0.5 text-[0.72rem] text-slate-700 sm:text-[0.76rem]">
          {listing.neighborhood} | {listing.seller?.publicName || listing.seller?.name}
        </p>
      </div>
      <p className="text-[0.88rem] font-semibold text-ink sm:text-[0.94rem]">
        {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
      </p>
    </button>
  );
}

function BannerCard({
  slide,
  active,
  shouldLoad = false,
  onOpenListing,
  onOpenEvent,
  onOpenSeller,
  onOpenGame,
}) {
  const listingGallery = slide.kind === "listing" ? slide.payload.gallery || [] : [];
  const heroGameKey =
    slide.kind === "event"
      ? normalizeGameKey(slide.payload.game)
      : slide.kind === "game"
        ? normalizeGameKey(slide.payload.slug)
        : normalizeGameKey(slide.payload.game);
  const heroBackdrop =
    slide.payload.heroBackdrop ||
    CURATED_HERO_ART[heroGameKey] ||
    null;
  const overlayHeroClass =
    heroGameKey === "pokemon"
      ? "object-[56%_center] sm:object-center"
      : heroGameKey === "one-piece"
        ? "object-[60%_center] sm:object-center"
        : heroGameKey === "magic"
          ? "object-[62%_center] sm:object-center"
          : heroGameKey === "dragon-ball-fusion-world"
            ? "object-[54%_center] sm:object-center"
            : heroGameKey === "union-arena"
              ? "object-[56%_center] sm:object-center"
          : "object-center";
  const compactMeta = slide.meta.slice(0, 2);

  function handlePrimaryAction() {
    if (slide.kind === "listing") {
      onOpenListing(slide.payload.id);
    } else if (slide.kind === "event") {
      onOpenEvent();
    } else if (slide.kind === "game") {
      onOpenGame(slide.payload.slug);
    } else {
      onOpenSeller(slide.payload.id);
    }
  }

  function renderMeta(extraClassName = "") {
    return (
      <div className={`flex flex-wrap gap-1.5 sm:gap-2 ${extraClassName}`}>
        {compactMeta.map((item, index) => (
          <span
            key={item}
            className={`rounded-[9px] border border-white/12 bg-white/10 px-2 py-1 text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-white/78 sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.18em] ${index > 0 ? "max-[389px]:hidden" : ""}`}
          >
            {item}
          </span>
        ))}
        {slide.meta.slice(2).map((item) => (
          <span
            key={item}
            className="hidden rounded-[9px] border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/78 sm:inline-flex"
          >
            {item}
          </span>
        ))}
      </div>
    );
  }

  return (
      <article
        className={`absolute inset-0 transition-all duration-700 ease-out ${
          active
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
          <div className="relative h-full overflow-hidden rounded-[26px] border border-white/10 bg-[#23090b] text-white shadow-[0_32px_90px_-48px_rgba(80,16,16,0.42)] sm:rounded-[32px]">
          <div className="relative h-full p-3 pb-24 sm:p-8 lg:p-10">
              {heroBackdrop && shouldLoad ? (
                <img
                  alt=""
                  aria-hidden="true"
                  className={`absolute inset-0 h-full w-full scale-[1.04] object-cover ${overlayHeroClass}`}
                  fetchpriority={active ? "high" : "auto"}
                  loading={active ? "eager" : "lazy"}
                  src={heroBackdrop}
                />
              ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,20,25,0.18)_0%,rgba(17,20,25,0.34)_48%,rgba(17,20,25,0.7)_100%),linear-gradient(90deg,rgba(17,20,25,0.84)_0%,rgba(17,20,25,0.72)_38%,rgba(17,20,25,0.22)_74%,rgba(17,20,25,0)_100%)] sm:bg-[linear-gradient(90deg,rgba(17,20,25,0.82)_0%,rgba(17,20,25,0.64)_28%,rgba(17,20,25,0.28)_54%,rgba(17,20,25,0.06)_78%,rgba(17,20,25,0)_100%)]" />
            <div className="relative z-10 flex h-full items-start sm:items-center">
              <div className="max-w-[13rem] sm:max-w-[31rem]">
                <span className="inline-flex rounded-[10px] border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/86 sm:px-3 sm:text-[11px] sm:tracking-[0.18em]">
                  {slide.kicker}
                </span>
                <h1 className="mt-2 max-w-[12.25rem] font-display text-[0.9rem] font-semibold leading-[0.97] tracking-[-0.055em] sm:mt-3 sm:max-w-2xl sm:text-[2.65rem] lg:text-[3rem]">
                  {slide.title}
                </h1>
                <p className="mt-1.5 max-w-[12.75rem] text-[0.64rem] leading-[1.45] text-white/76 sm:mt-3 sm:max-w-2xl sm:text-sm sm:leading-7 lg:text-[0.98rem]">
                  {slide.description}
                </p>
                <div className="mt-2 sm:mt-4">{renderMeta()}</div>
                <div className="mt-2.5 sm:mt-5">
                  <button
                    className={`rounded-[10px] px-3 py-1.5 text-[0.7rem] font-semibold shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:rounded-[11px] sm:px-5 sm:py-2.5 sm:text-sm ${
                      slide.kind === "event" ? "bg-orange text-white" : "bg-white text-navy"
                    }`}
                    type="button"
                    onClick={handlePrimaryAction}
                  >
                    {slide.cta}
                  </button>
                </div>
              </div>
            </div>
        </div>
      </div>
    </article>
  );
}

function BestSellerCard({ listing, formatCadPrice, onOpen, onToggleWishlist }) {
  return (
    <article className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--surface-solid)] shadow-[0_18px_40px_-34px_rgba(35,41,51,0.2)]">
      <div className="flex min-h-[7rem]">
        <button
          className="block w-[4.95rem] shrink-0 text-left lg:w-[5.35rem]"
          type="button"
          onClick={() => onOpen(listing.id)}
        >
          <div className="flex h-full items-center justify-center bg-[var(--surface-hover)] p-2">
            <CardArtwork
              className="aspect-[63/88] h-full max-h-[88px] rounded-[7px] object-cover shadow-[0_12px_26px_-18px_rgba(35,41,51,0.3)] lg:max-h-[94px]"
              game={listing.game}
              src={listing.imageUrl}
              title={listing.title}
            />
          </div>
        </button>
        <div className="flex min-w-0 flex-1 flex-col justify-between p-2.5 lg:p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="line-clamp-2 text-[0.86rem] font-semibold leading-5 text-ink">{listing.title}</p>
              <p className="mt-0.5 text-[0.72rem] leading-4 text-slate-700">
                {listing.game} | {listing.neighborhood}
              </p>
            </div>
            <button
              aria-label={listing.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border ${
                listing.wishlisted
                  ? "border-rose-200 bg-rose-100 text-rose-800"
                  : "border-[var(--line)] bg-[var(--surface-hover)] text-steel"
              }`}
              type="button"
              onClick={() => onToggleWishlist(listing.id)}
            >
              <Heart fill={listing.wishlisted ? "currentColor" : "none"} size={13} />
            </button>
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <p className="font-display text-[1.02rem] font-semibold tracking-[-0.05em] text-ink lg:text-[1.08rem]">
              {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
            </p>
            <button
              className="inline-flex items-center rounded-[8px] border border-[rgba(205,220,231,0.9)] px-2 py-1 text-[0.72rem] font-semibold text-navy"
              type="button"
              onClick={() => onOpen(listing.id)}
            >
              View
            </button>
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
    manualEvents,
    sellers,
    setGlobalSearch,
    siteSettings,
    toggleWishlist,
  } = useMarketplace();
  const [remoteEvents, setRemoteEvents] = useState([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const homeSections = siteSettings?.homeSections || {};

  const safeListings = Array.isArray(activeListings) ? activeListings.filter(Boolean) : [];
  const safeHotListings = Array.isArray(hotListings) ? hotListings.filter(Boolean) : [];
  const safeManualEvents = Array.isArray(manualEvents) ? manualEvents.filter(Boolean) : [];
  const safeSellers = Array.isArray(sellers) ? sellers.filter(Boolean) : [];
  const sellerFollowerCounts = useMemo(
    () =>
      safeSellers.reduce((accumulator, seller) => {
        (seller.followedSellerIds || []).forEach((followedId) => {
          accumulator[followedId] = (accumulator[followedId] || 0) + 1;
        });
        return accumulator;
      }, {}),
    [safeSellers],
  );
  const storeFollowerCounts = useMemo(
    () =>
      safeSellers.reduce((accumulator, seller) => {
        (seller.followedStoreSlugs || []).forEach((slug) => {
          accumulator[slug] = (accumulator[slug] || 0) + 1;
        });
        return accumulator;
      }, {}),
    [safeSellers],
  );
  const categorySummaries = useMemo(
    () =>
      (Array.isArray(gameCatalog) ? gameCatalog : [])
        .filter((game) => game?.slug && game.slug !== "all")
        .map((game) => ({
        ...game,
        count: safeListings.filter((listing) => listing?.gameSlug === game.slug).length,
      })),
    [gameCatalog, safeListings],
  );

  const topSellers = [...safeSellers]
    .sort((left, right) => {
      const dealsDiff = Number(right.completedDeals || 0) - Number(left.completedDeals || 0);
      if (dealsDiff !== 0) {
        return dealsDiff;
      }
      return Number(right.overallRating || 0) - Number(left.overallRating || 0);
    })
    .slice(0, 4);
  const storeSpotlights = useMemo(
    () =>
      storeProfiles.map((store) => {
        const relatedListings = safeListings.filter((listing) => {
          const seller = listing.seller;
          if (!seller) {
            return false;
          }

          const trustedSpotMatch = Array.isArray(seller.trustedMeetupSpots)
            ? seller.trustedMeetupSpots.includes(store.slug)
            : false;
          const neighborhoodMatch =
            String(seller.neighborhood || "").toLowerCase() === store.neighborhood.toLowerCase();

          return trustedSpotMatch || neighborhoodMatch;
        });

        return {
          ...store,
          activeCount: relatedListings.length,
          featuredListing: relatedListings[0] || null,
        };
      }),
    [safeListings],
  );
  const featuredGame = useMemo(() => {
    const pinnedSlug = siteSettings?.homeHero?.spotlightGameSlug || null;
    if (pinnedSlug) {
      const pinnedGame = categorySummaries.find((game) => game.slug === pinnedSlug);
      if (pinnedGame) {
        const listings = safeListings.filter((listing) => listing?.gameSlug === pinnedGame.slug).slice(0, 3);
        const neighborhoods = new Set(
          safeListings
            .filter((listing) => listing?.gameSlug === pinnedGame.slug && listing?.neighborhood)
            .map((listing) => listing.neighborhood),
        );
        return {
          ...pinnedGame,
          count: safeListings.filter((listing) => listing?.gameSlug === pinnedGame.slug).length,
          neighborhoodCount: neighborhoods.size,
          gallery: listings.map((listing) => listing.imageUrl).filter(Boolean),
        };
      }
    }

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
  }, [categorySummaries, safeListings, siteSettings]);

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
  const nextEvent =
    mergedEvents.find((event) => event.id === siteSettings?.homeHero?.pinnedEventId) ||
    upcomingEvents[0] ||
    null;
  const featuredListing =
    safeListings.find((listing) => listing.id === siteSettings?.homeHero?.featuredListingId) ||
    safeHotListings[0] ||
    safeListings[0] ||
    null;
  const newThisWeekListings = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return safeListings
      .filter((listing) => {
        const createdTime = new Date(listing.createdAt || listing.updatedAt || 0).getTime();
        return Number.isFinite(createdTime) && createdTime >= weekAgo;
      })
      .sort((left, right) => (right.sortTimestamp || 0) - (left.sortTimestamp || 0))
      .slice(0, 4);
  }, [safeListings]);

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
        description: "Featured locally with offers, seller context, and meetup planning built in.",
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
        description: "Line up local nights, prereleases, and store events with what is moving in the market.",
        meta: [nextEvent.store, nextEvent.game, nextEvent.time],
        cta: "View events",
        payload: {
          ...nextEvent,
          heroBackdrop: CURATED_HERO_ART[eventGameKey] || null,
        },
      });
    }

    if (featuredGame) {
      slides.push({
        id: `game-${featuredGame.slug}`,
        kind: "game",
        kicker: "Market channel",
        title: `${featuredGame.name} is moving fastest in the market`,
        description: "Jump into the busiest game channel and see what is actually getting posted locally.",
        meta: [
          `${featuredGame.count} listings`,
          `${featuredGame.neighborhoodCount || 1} neighborhoods`,
          featuredGame.shortName,
        ],
        cta: "Browse game",
        payload: {
          ...featuredGame,
          heroBackdrop: CURATED_HERO_ART[normalizeGameKey(featuredGame.slug)] || null,
        },
      });
    }

    return slides;
  }, [featuredGame, featuredListing, nextEvent]);
  const homeSeoImage =
    bannerSlides[0]?.payload?.heroBackdrop ||
    CURATED_HERO_ART[normalizeGameKey(featuredGame?.slug)] ||
    featuredListing?.imageUrl ||
    null;

  useEffect(() => {
    if (homeSections.showEvents === false) {
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;
    let idleId = null;

    async function loadHomeEvents() {
      try {
        const data = await fetchLocalEvents();
        if (!cancelled) {
          startTransition(() => {
            setRemoteEvents(Array.isArray(data?.events) ? data.events.filter(Boolean) : []);
          });
        }
      } catch {
        if (!cancelled) {
          startTransition(() => {
            setRemoteEvents([]);
          });
        }
      }
    }

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(
        () => {
          void loadHomeEvents();
        },
        { timeout: 1200 },
      );
    } else if (typeof window !== "undefined") {
      timeoutId = window.setTimeout(() => {
        void loadHomeEvents();
      }, 450);
    } else {
      void loadHomeEvents();
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined" && idleId && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (typeof window !== "undefined" && timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [homeSections.showEvents]);

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

  function showPreviousBanner() {
    setActiveBannerIndex((current) =>
      bannerSlides.length ? (current - 1 + bannerSlides.length) % bannerSlides.length : 0,
    );
  }

  function showNextBanner() {
    setActiveBannerIndex((current) =>
      bannerSlides.length ? (current + 1) % bannerSlides.length : 0,
    );
  }

  return (
    <div className="stagger-stack space-y-4 sm:space-y-5 lg:space-y-8">
      <SeoHead
        canonicalPath="/"
        description="Local Winnipeg TCG marketplace for buying, selling, trading, events, and meetup planning."
        image={homeSeoImage || undefined}
        preloadImage={homeSeoImage || undefined}
        title="Home"
      />
      {homeSections.showHero !== false ? (
      <section className="drop-in-item space-y-3 sm:space-y-4">
        <div>
          {bannerSlides.length ? (
            <div className="relative min-h-[13.5rem] overflow-hidden rounded-[26px] sm:min-h-[33rem] sm:rounded-[36px] lg:min-h-[31rem]">
              {bannerSlides.map((slide, index) => (
                <BannerCard
                  key={slide.id}
                  active={activeBannerIndex === index}
                  onOpenEvent={() => navigate("/events")}
                  onOpenGame={(slug) => {
                    setGlobalSearch("");
                    navigate(`/market/${slug}`);
                  }}
                  onOpenListing={openListing}
                  onOpenSeller={(sellerId) => navigate(`/seller/${sellerId}`)}
                  shouldLoad={activeBannerIndex === index}
                  slide={slide}
                />
              ))}

              {bannerSlides.length > 1 ? (
                <div className="absolute bottom-2 left-1/2 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-1 rounded-full border border-white/12 bg-[rgba(17,20,25,0.52)] px-1.5 py-1 backdrop-blur sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-none sm:translate-x-0 sm:gap-3 sm:border-transparent sm:bg-transparent sm:px-0 sm:py-0">
                  <button
                    aria-label="Show previous banner"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white backdrop-blur transition hover:bg-white/18 sm:h-10 sm:w-10"
                    type="button"
                    onClick={showPreviousBanner}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {bannerSlides.map((slide, index) => (
                    <button
                      key={slide.id}
                      aria-label={`Show banner ${index + 1}`}
                      className={`h-2.5 rounded-full transition-all ${
                        activeBannerIndex === index
                          ? "w-7 bg-white shadow-sm sm:w-10"
                          : "w-2 bg-white/45 sm:w-2.5"
                      }`}
                      type="button"
                      onClick={() => setActiveBannerIndex(index)}
                    />
                  ))}
                  <button
                    aria-label="Show next banner"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white backdrop-blur transition hover:bg-white/18 sm:h-10 sm:w-10"
                    type="button"
                    onClick={showNextBanner}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-[var(--surface-solid)] px-5 py-10 text-sm leading-7 text-steel sm:rounded-[30px] sm:px-6 sm:py-12">
              Banner content will appear as soon as there are active listings and upcoming events.
            </div>
          )}
        </div>

      </section>
      ) : null}

      {homeSections.showBestSellers !== false ? (
      <section className="drop-in-item space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-kicker">Best sellers</p>
            <h2 className="mt-1.5 font-display text-[1.35rem] font-semibold tracking-[-0.05em] text-ink sm:text-[1.7rem]">
              Hot listings right now
            </h2>
            <p className="mt-1.5 text-[0.82rem] text-steel sm:text-sm">A cleaner top shelf of live cards from the local market.</p>
          </div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-navy" to="/market">
            Open full market
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-2.5 lg:grid-cols-2 2xl:grid-cols-4">
          {safeHotListings.slice(0, 4).map((listing) => (
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
      ) : null}

      <section className="drop-in-item space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-kicker">New this week</p>
            <h2 className="mt-1.5 font-display text-[1.35rem] font-semibold tracking-[-0.05em] text-ink sm:text-[1.7rem]">
              Fresh cards that just hit the market
            </h2>
            <p className="mt-1.5 text-[0.82rem] text-steel sm:text-sm">
              A quick shelf for the newest local posts before they get buried in the main feed.
            </p>
          </div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-navy" to="/market">
            Browse all new listings
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          {newThisWeekListings.length ? (
            newThisWeekListings.map((listing) => (
              <ShelfCard
                key={listing.id}
                formatCadPrice={formatCadPrice}
                listing={listing}
                onOpen={openListing}
              />
            ))
          ) : (
            <div className="rounded-[20px] border border-dashed border-[var(--line)] bg-[var(--surface-solid)] px-4 py-8 text-sm leading-6 text-steel md:col-span-2 xl:col-span-4 sm:rounded-[24px] sm:px-5 sm:py-10 sm:leading-7">
              New listings from the last seven days will appear here automatically.
            </div>
          )}
        </div>
      </section>
      {(homeSections.showEvents !== false || homeSections.showTrustedSellers !== false) ? (
      <section className="drop-in-cluster deferred-home-section grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {homeSections.showEvents !== false ? (
        <article className="drop-in-item console-panel binder-edge p-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Upcoming events</p>
              <h2 className="mt-1.5 font-display text-[1.35rem] font-semibold tracking-[-0.05em] text-ink sm:text-[1.65rem]">
                Local calendar
              </h2>
            </div>
            <CalendarRange className="text-orange" size={20} />
          </div>
          <div className="mt-2.5 space-y-1.5 sm:mt-3 sm:space-y-2">
            {upcomingEvents.length ? (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--surface-solid)] px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5"
                >
                  <div>
                    <p className="text-[0.84rem] font-semibold leading-5 text-ink sm:text-[0.9rem]">{event.title}</p>
                    <p className="mt-0.5 text-[0.7rem] text-slate-700 sm:text-[0.76rem]">
                      {event.store} | {event.dateStr} | {event.time}
                    </p>
                  </div>
                  <Link className="whitespace-nowrap text-[0.76rem] font-semibold text-navy sm:text-[0.82rem]" to="/events">
                    Details
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-[var(--line)] bg-[var(--surface-solid)] px-3 py-5 text-sm text-steel sm:rounded-[20px] sm:px-4 sm:py-6">
                Event listings are still being refreshed.
              </div>
            )}
          </div>
        </article>
        ) : null}

        {homeSections.showTrustedSellers !== false ? (
        <article className="drop-in-item console-panel binder-edge p-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Trusted sellers</p>
              <h2 className="mt-1.5 font-display text-[1.35rem] font-semibold tracking-[-0.05em] text-ink sm:text-[1.65rem]">
                Accounts worth browsing
              </h2>
            </div>
            <Shield className="text-navy" size={20} />
          </div>

          <div className="mt-2.5 space-y-1.5 sm:mt-3 sm:space-y-2">
            {topSellers.map((seller) => (
              <button
                key={seller.id}
                className="flex w-full items-center justify-between gap-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--surface-solid)] px-2.5 py-2 text-left transition hover:border-navy/20 sm:gap-3 sm:px-3 sm:py-2.5"
                type="button"
                onClick={() => navigate(`/seller/${seller.id}`)}
              >
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <UserAvatar className="h-7 w-7 text-[0.68rem] font-bold sm:h-8 sm:w-8 sm:text-[0.72rem]" user={seller} />
                  <div className="min-w-0">
                    <p className="truncate text-[0.84rem] font-semibold text-ink sm:text-[0.9rem]">
                      {seller.publicName || seller.firstName || seller.name}
                    </p>
                    <p className="mt-0.5 text-[0.68rem] text-slate-700 sm:text-[0.74rem]">
                      {seller.completedDeals || 0} deals
                      {seller.overallRating ? ` | ${seller.overallRating.toFixed(1)} rating` : ""}
                      {` | ${sellerFollowerCounts[seller.id] || 0} followers`}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[0.76rem] font-semibold text-navy sm:text-[0.82rem]">
                  View
                  <ArrowRight size={14} />
                </span>
              </button>
            ))}
          </div>
        </article>
        ) : null}
      </section>
      ) : null}

      {homeSections.showStores !== false ? (
      <section className="drop-in-item deferred-home-section console-panel binder-edge p-3 sm:p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-kicker">Verified meetup spots</p>
            <h2 className="mt-1.5 font-display text-[1.35rem] font-semibold tracking-[-0.05em] text-ink sm:text-[1.7rem]">
              Local store profiles
            </h2>
            <p className="mt-1.5 text-[0.82rem] text-steel sm:text-sm">
              Approved public meetup locations with their own event calendars and local listing lanes.
            </p>
          </div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-navy" to="/stores">
            View all stores
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-2.5 grid gap-2.5 xl:grid-cols-4 sm:mt-3 sm:gap-3">
          {storeSpotlights.map((store) => (
            <Link
              key={store.slug}
              className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--surface-solid)] transition duration-300 hover:-translate-y-0.5 hover:shadow-soft"
              to={`/stores/${store.slug}`}
            >
              <div className="flex h-[4.8rem] items-center justify-center overflow-hidden border-b border-[var(--line)] bg-[var(--surface-hover)] px-3 py-2.5 sm:h-[5.2rem] sm:px-4 sm:py-3">
                <div className="flex h-full w-full items-center justify-center bg-[var(--surface-hover)] px-2 py-1.5">
                  {store.logoUrl ? (
                    <img
                      alt={store.name}
                      className="max-h-full w-full object-contain"
                      decoding="async"
                      loading="lazy"
                      src={store.logoUrl}
                    />
                  ) : null}
                </div>
              </div>
              <div className="space-y-2 p-3 sm:space-y-2.5 sm:p-3.5">
                <div>
                  <p className="font-display text-[0.96rem] font-semibold tracking-[-0.03em] text-ink sm:text-[1.02rem]">
                    {store.name}
                  </p>
                  <p className="mt-0.5 text-[0.72rem] text-slate-700 sm:text-[0.76rem]">{store.neighborhood}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <span className="rounded-[8px] bg-navy/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy">
                    {store.activeCount} listings
                  </span>
                  <span className="rounded-[8px] bg-[var(--surface-hover)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                    {storeFollowerCounts[store.slug] || 0} followers
                  </span>
                  <span className="rounded-[8px] bg-[var(--surface-hover)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                    Approved
                  </span>
                </div>
                <p className="line-clamp-2 text-[0.76rem] leading-5 text-slate-700">
                  {store.featuredListing
                    ? `${store.featuredListing.title} is live and tied to this meetup area.`
                    : "Browse upcoming events and sellers who prefer meeting here."}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      ) : null}
    </div>
  );
}

