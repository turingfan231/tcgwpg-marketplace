import {
  ArrowRight,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircleMore,
  Shield,
  Store,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
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
  } = useMarketplace();
  const [remoteEvents, setRemoteEvents] = useState([]);
  const spotlightRailRef = useRef(null);

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

  const freshListings = safeHotListings.slice(0, 6);
  const spotlightListings = safeHotListings.slice(0, 5);
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
  const marketPulse = [
    { label: "Live listings", value: formatNumber(safeListings.length) },
    { label: "Verified sellers", value: formatNumber(verifiedSellerCount) },
    { label: "Games supported", value: "3" },
    {
      label: "Next meetup",
      value: upcomingEvents[0]?.store || "See events",
    },
  ];

  function scrollSpotlights(direction) {
    if (!spotlightRailRef.current) {
      return;
    }

    spotlightRailRef.current.scrollBy({
      left: direction * Math.max(320, spotlightRailRef.current.clientWidth - 120),
      behavior: "smooth",
    });
  }

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

    loadHomeEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !safeListings.length) {
    return <PageSkeleton cards={4} titleWidth="w-80" />;
  }

  return (
    <div className="space-y-12 lg:space-y-16">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <article className="surface-card px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <p className="section-kicker">Market spotlight</p>
              <h1 className="mt-3 font-display text-[2.15rem] font-semibold tracking-[-0.05em] text-ink sm:text-[2.7rem]">
                Start with the cards local buyers are actually clicking on.
              </h1>
              <p className="mt-4 text-base leading-7 text-steel">
                Scroll through featured local listings, jump straight into the market,
                and keep everything in CAD with neighborhood-first browsing.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white shadow-soft"
                type="button"
                onClick={() => {
                  setGlobalSearch("");
                  navigate("/market");
                }}
              >
                Browse listings
              </button>
              <button
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                type="button"
                onClick={() => {
                  const opened = openCreateListing({ type: "WTS" });
                  if (!opened) {
                    navigate("/auth", { state: { from: "/" } });
                  }
                }}
              >
                List a card
              </button>
              <button
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                type="button"
                onClick={() => {
                  const opened = openCreateListing({ type: "WTB" });
                  if (!opened) {
                    navigate("/auth", { state: { from: "/wtb" } });
                  }
                }}
              >
                Post a WTB
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {marketPulse.map((item) => (
              <div
                key={item.label}
                className="rounded-full border border-slate-200 bg-[#faf7f1] px-4 py-2 text-sm"
              >
                <span className="font-semibold text-ink">{item.value}</span>
                <span className="ml-2 text-steel">{item.label}</span>
              </div>
            ))}
            <div className="ml-auto hidden items-center gap-2 sm:flex">
              <button
                aria-label="Scroll left through spotlight listings"
                className="rounded-full border border-slate-200 bg-white p-2.5 text-steel transition hover:border-slate-300 hover:text-ink"
                type="button"
                onClick={() => scrollSpotlights(-1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                aria-label="Scroll right through spotlight listings"
                className="rounded-full border border-slate-200 bg-white p-2.5 text-steel transition hover:border-slate-300 hover:text-ink"
                type="button"
                onClick={() => scrollSpotlights(1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {spotlightListings.length ? (
            <div
              ref={spotlightRailRef}
              className="header-chip-scroll mt-5 flex snap-x gap-4 overflow-x-auto pb-2"
            >
              {spotlightListings.map((listing) => (
                <button
                  key={listing.id}
                  className="group min-w-[18.5rem] snap-start rounded-[30px] border border-slate-200 bg-[#fbf8f1] p-4 text-left transition hover:border-slate-300 hover:bg-white sm:min-w-[22rem] xl:min-w-[23.5rem]"
                  type="button"
                  onClick={() => navigate(`/listing/${listing.id}`)}
                >
                  <div className="flex gap-4">
                    <div className="w-[6.25rem] shrink-0 sm:w-[7rem]">
                      <CardArtwork
                        className="aspect-[63/88] w-full rounded-[20px] object-cover shadow-soft"
                        game={listing.game}
                        src={listing.imageUrl}
                        title={listing.title}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                          {listing.game}
                        </span>
                        <span className="rounded-full bg-navy/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-navy">
                          {listing.type}
                        </span>
                      </div>

                      <h3 className="mt-3 line-clamp-2 font-display text-[1.55rem] font-semibold leading-tight tracking-[-0.04em] text-ink">
                        {listing.title}
                      </h3>

                      <div className="mt-3 flex items-center gap-3">
                        <UserAvatar className="h-9 w-9 text-sm font-bold" user={listing.seller} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {listing.seller?.publicName || listing.seller?.name}
                          </p>
                          <p className="truncate text-xs text-steel">
                            {listing.neighborhood} | {listing.timeAgo}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                            {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-steel">
                            {listing.views} views | {listing.offers} offers
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
                          Open
                          <ArrowRight size={15} />
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[26px] border border-dashed border-slate-200 bg-[#faf7f1] px-5 py-8 text-sm leading-7 text-steel">
              Fresh spotlight listings will land here as soon as more local cards go live.
            </div>
          )}
        </article>

        <aside className="surface-card px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Right now</p>
              <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.04em] text-ink">
                Fresh from the feed
              </h2>
            </div>
            <Store className="text-navy" size={20} />
          </div>

          <div className="mt-6 space-y-3">
            {freshListings.slice(0, 3).map((listing) => (
              <button
                key={listing.id}
                className="flex w-full items-start justify-between gap-4 rounded-[22px] border border-slate-200 bg-[#faf7f1] px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white"
                type="button"
                onClick={() => navigate(`/listing/${listing.id}`)}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{listing.title}</p>
                  <p className="mt-1 text-sm text-steel">
                    {listing.game} | {listing.neighborhood}
                  </p>
                </div>
                <span className="whitespace-nowrap font-semibold text-ink">
                  {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-[#17394a] px-5 py-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                  Next event
                </p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em]">
                  {upcomingEvents[0]?.title || "More local events coming in"}
                </p>
              </div>
              <CalendarRange className="text-orange" size={20} />
            </div>
            {upcomingEvents[0] ? (
              <div className="mt-4 space-y-2 text-sm text-white/82">
                <p>
                  {upcomingEvents[0].store} | {upcomingEvents[0].dateStr}
                </p>
                <p>{upcomingEvents[0].time}</p>
                <Link
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white"
                  to="/events"
                >
                  View events
                  <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/82">
                Check the events page for upcoming tournaments, league nights, and store
                meetups.
              </p>
            )}
          </div>
        </aside>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Browse by game</p>
            <h2 className="section-title mt-2">Jump into the active shelves</h2>
          </div>
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-navy"
            to="/market"
          >
            Open full market
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {categorySummaries.map((game) => (
            <button
              key={game.slug}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-slate-300 hover:bg-[#faf7f1]"
              type="button"
              onClick={() => {
                setGlobalSearch("");
                navigate(`/market/${game.slug}`);
              }}
            >
              {game.name}
              <span className="ml-2 text-steel">{game.count}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {gameShelves.map((game) => (
            <article key={game.slug} className="surface-card overflow-hidden">
              <div className="border-b border-slate-200 bg-[#fbf7ef] px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-navy/65">
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
                    <ChevronRight size={15} />
                  </button>
                </div>
                <p className="mt-3 text-sm leading-7 text-steel">{game.description}</p>
              </div>

              <div className="space-y-3 p-5">
                {game.listings.length ? (
                  game.listings.map((listing) => (
                    <button
                      key={listing.id}
                      className="flex w-full items-center gap-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300 hover:bg-[#fcfaf4]"
                      type="button"
                      onClick={() => navigate(`/listing/${listing.id}`)}
                    >
                      <CardArtwork
                        className="aspect-[63/88] w-[4.75rem] rounded-[16px] object-cover"
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
                      <div className="text-right">
                        <p className="font-semibold text-ink">
                          {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-steel">
                          {listing.timeAgo}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-[#faf7f1] px-4 py-6 text-sm leading-7 text-steel">
                    No active {game.shortName} listings yet.
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Newest listings</p>
            <h2 className="section-title mt-2">Fresh cards from local sellers</h2>
          </div>
          <button
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
            type="button"
            onClick={() => {
              setGlobalSearch("");
              navigate("/market");
            }}
          >
            See all listings
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {freshListings.slice(0, 4).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="surface-card px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Upcoming events</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                Where local players are meeting
              </h2>
            </div>
            <CalendarRange className="text-orange" size={20} />
          </div>

          <div className="mt-6 space-y-3">
            {upcomingEvents.length ? (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-4 rounded-[22px] border border-slate-200 bg-[#faf7f1] px-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-ink">{event.title}</p>
                    <p className="mt-1 text-sm text-steel">
                      {event.store} | {event.dateStr} | {event.time}
                    </p>
                  </div>
                  <Link
                    className="whitespace-nowrap text-sm font-semibold text-navy"
                    to="/events"
                  >
                    Details
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-[#faf7f1] px-4 py-6 text-sm text-steel">
                Event listings are being refreshed. Check back on the events page for the
                latest store calendar.
              </div>
            )}
          </div>
        </article>

        <article className="surface-card px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Local sellers</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                Trusted accounts to browse
              </h2>
            </div>
            <Shield className="text-navy" size={20} />
          </div>

          <div className="mt-6 space-y-3">
            {topSellers.map((seller) => (
              <button
                key={seller.id}
                className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-[#faf7f1] px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white"
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
                      {seller.completedDeals || 0} completed deals
                      {seller.overallRating ? ` | ${seller.overallRating.toFixed(1)} rating` : ""}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
                  View
                  <ChevronRight size={15} />
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] bg-[#faf7f1] p-4">
              <MessageCircleMore className="text-orange" size={18} />
              <p className="mt-3 font-semibold text-ink">In-app messaging</p>
              <p className="mt-1 text-sm leading-7 text-steel">
                Keep offers, questions, and meetup details attached to the listing.
              </p>
            </div>
            <div className="rounded-[22px] bg-[#faf7f1] p-4">
              <MapPin className="text-navy" size={18} />
              <p className="mt-3 font-semibold text-ink">Neighborhood filters</p>
              <p className="mt-1 text-sm leading-7 text-steel">
                Narrow listings by where you are actually willing to meet up.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
