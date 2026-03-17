import {
  ArrowRight,
  CalendarRange,
  ChevronRight,
  MapPin,
  MessageCircleMore,
  Shield,
  Store,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
import { useMarketplace } from "../hooks/useMarketplace";
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
    manualEvents,
    openCreateListing,
    sellers,
    setGlobalSearch,
  } = useMarketplace();

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

  const freshListings = safeHotListings.slice(0, 6);
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
  const upcomingEvents = sortByUpcomingDate(
    safeManualEvents.filter((event) => event?.published !== false && event?.title),
  ).slice(0, 4);

  return (
    <div className="space-y-12 lg:space-y-16">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_24rem]">
        <article className="surface-card px-6 py-8 sm:px-8 sm:py-10">
          <p className="section-kicker">Winnipeg trading card marketplace</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl lg:text-6xl">
            Buy, sell, and trade locally without digging through the usual marketplace clutter.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-steel sm:text-lg">
            Search exact printings for Pokemon, Magic, and One Piece, price everything in
            CAD, message inside the app, and sort listings by the neighborhoods you
            actually want to meet in.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-navy px-6 py-3.5 text-sm font-semibold text-white shadow-soft"
              type="button"
              onClick={() => {
                setGlobalSearch("");
                navigate("/market");
              }}
            >
              Browse listings
            </button>
            <button
              className="rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-ink transition hover:border-slate-300"
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
              className="rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-ink transition hover:border-slate-300"
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

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-[#faf7f1] p-5">
              <p className="text-sm text-steel">Live listings</p>
              <p className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
                {formatNumber(safeListings.length)}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-[#faf7f1] p-5">
              <p className="text-sm text-steel">Verified sellers</p>
              <p className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
                {formatNumber(verifiedSellerCount)}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-[#faf7f1] p-5">
              <p className="text-sm text-steel">Games supported</p>
              <p className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
                3
              </p>
            </div>
          </div>
        </article>

        <aside className="surface-card px-6 py-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Right now</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
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
            <h2 className="section-title mt-2">Pick a lane and start browsing</h2>
          </div>
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-navy"
            to="/market"
          >
            Open full market
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {categorySummaries.map((game) => (
            <button
              key={game.slug}
              className="surface-card p-6 text-left transition hover:-translate-y-1 hover:border-slate-300"
              type="button"
              onClick={() => {
                setGlobalSearch("");
                navigate(`/market/${game.slug}`);
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-navy/65">
                {game.shortName}
              </p>
              <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                {game.name}
              </h3>
              <p className="mt-3 text-sm leading-7 text-steel">{game.description}</p>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{game.count} live listings</span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-navy">
                  Browse
                  <ChevronRight size={15} />
                </span>
              </div>
            </button>
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
        <article className="surface-card px-6 py-7">
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

        <article className="surface-card px-6 py-7">
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
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {seller.publicName || seller.firstName || seller.name}
                  </p>
                  <p className="mt-1 text-sm text-steel">
                    {seller.completedDeals || 0} completed deals
                    {seller.overallRating ? ` | ${seller.overallRating.toFixed(1)} rating` : ""}
                  </p>
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
