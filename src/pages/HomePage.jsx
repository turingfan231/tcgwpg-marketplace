import {
  ArrowRight,
  CalendarRange,
  Heart,
  MapPin,
  MessageCircleMore,
  Shield,
  Store,
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

function QuickActionButton({ children, tone = "light", ...props }) {
  return (
    <button
      className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${
        tone === "primary"
          ? "bg-navy text-white shadow-soft"
          : tone === "orange"
            ? "bg-orange text-white shadow-soft"
            : "border border-slate-200 bg-white/80 text-ink hover:border-slate-300"
      }`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

function PulseTile({ label, value }) {
  return (
    <div className="rounded-[20px] border border-white/40 bg-white/60 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy/65">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-ink">{value}</p>
    </div>
  );
}

function FeedRow({ listing, formatCadPrice, onOpen, onToggleWishlist }) {
  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-[#d7e4ed] bg-white/78 px-4 py-4 shadow-[0_14px_32px_-28px_rgba(26,91,120,0.55)]">
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

function SpotlightCard({ listing, formatCadPrice, onOpen, onToggleWishlist }) {
  return (
    <article className="min-w-[16rem] max-w-[16rem] rounded-[26px] border border-[#d7e4ed] bg-white/85 p-4 shadow-[0_20px_44px_-34px_rgba(26,91,120,0.55)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#eef5f9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-navy">
            {listing.game}
          </span>
          <span className="rounded-full bg-orange/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange">
            {listing.type}
          </span>
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
          <Heart fill={listing.wishlisted ? "currentColor" : "none"} size={14} />
        </button>
      </div>

      <button className="mt-4 block w-full text-left" type="button" onClick={() => onOpen(listing.id)}>
        <div className="rounded-[22px] border border-[#d7e4ed] bg-[linear-gradient(180deg,#f6fbff_0%,#e8f1f7_100%)] p-3">
          <div className="mx-auto w-[8.8rem]">
            <CardArtwork
              className="aspect-[63/88] w-full rounded-[18px] object-cover shadow-soft"
              game={listing.game}
              src={listing.imageUrl}
              title={listing.title}
            />
          </div>
        </div>
        <h3 className="mt-4 line-clamp-2 font-display text-[1.2rem] font-semibold leading-tight tracking-[-0.04em] text-ink">
          {listing.title}
        </h3>
        <div className="mt-3 flex items-center gap-2">
          <UserAvatar className="h-8 w-8 text-[0.72rem] font-bold" user={listing.seller} />
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
            <p className="font-display text-[1.7rem] font-semibold tracking-[-0.04em] text-ink">
              {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-steel">
              {listing.views} views
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-navy">
            Open
            <ArrowRight size={14} />
          </span>
        </div>
      </button>
    </article>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const {
    activeListings,
    currentUser,
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

  const freshListings = safeHotListings.slice(0, 5);
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

  const onboardingItems = useMemo(
    () =>
      currentUser
        ? [
            { label: "Set username", done: Boolean(currentUser.username) },
            { label: "Pick default game", done: Boolean(currentUser.defaultListingGame) },
            { label: "Add neighborhood", done: Boolean(currentUser.neighborhood) },
            { label: "Upload photo", done: Boolean(currentUser.avatarUrl) },
          ]
        : [],
    [currentUser],
  );
  const incompleteOnboardingCount = onboardingItems.filter((item) => !item.done).length;

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
  const marketPulse = [
    { label: "Live listings", value: formatNumber(safeListings.length) },
    { label: "Verified sellers", value: formatNumber(verifiedSellerCount) },
    { label: "Games", value: "3" },
    { label: "Next meetup", value: nextEvent?.store || "Events" },
  ];

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

  if (loading && !safeListings.length) {
    return <PageSkeleton cards={4} titleWidth="w-80" />;
  }

  return (
    <div className="stagger-stack space-y-10 lg:space-y-14">
      <section className="drop-in-cluster grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_23rem]">
        <article className="drop-in-item handheld-shell overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-navy/62">
                Handheld home
              </p>
              <h1 className="mt-3 font-display text-[2.2rem] font-semibold leading-[0.96] tracking-[-0.06em] text-ink sm:text-[3.6rem]">
                Buy, sell, and trade locally like it is built into your console.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-steel sm:text-base">
                Real listings first, neighborhood-aware meetups, and soft app-style browsing for
                Pokemon, Magic, and One Piece in Winnipeg.
              </p>
            </div>

            <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <QuickActionButton tone="primary" onClick={() => {
                setGlobalSearch("");
                navigate("/market");
              }}>
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

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {marketPulse.map((item) => (
              <PulseTile key={item.label} label={item.label} value={item.value} />
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="rounded-[28px] border border-white/55 bg-white/68 p-4 shadow-[0_24px_60px_-40px_rgba(26,91,120,0.5)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Spotlight rail</p>
                  <p className="mt-2 font-display text-[1.7rem] font-semibold tracking-[-0.04em] text-ink">
                    Featured local picks
                  </p>
                </div>
                <span className="rounded-full bg-[#eef5f9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-navy">
                  Swipeable
                </span>
              </div>
              {spotlightListings.length ? (
                <div className="header-chip-scroll mt-5 flex gap-4 overflow-x-auto pb-2">
                  {spotlightListings.map((listing) => (
                    <SpotlightCard
                      key={listing.id}
                      formatCadPrice={formatCadPrice}
                      listing={listing}
                      onOpen={openListing}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[24px] border border-dashed border-[#d7e4ed] bg-white/70 px-5 py-8 text-sm leading-7 text-steel">
                  Spotlight listings will appear here as soon as more local cards go live.
                </div>
              )}
            </div>

            <aside className="handheld-module p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Fresh feed</p>
                  <p className="mt-2 font-display text-[1.7rem] font-semibold tracking-[-0.04em] text-ink">
                    Just posted
                  </p>
                </div>
                <Store className="text-navy" size={18} />
              </div>

              <div className="mt-4 space-y-3">
                {freshListings.slice(0, 3).map((listing) => (
                  <FeedRow
                    key={listing.id}
                    formatCadPrice={formatCadPrice}
                    listing={listing}
                    onOpen={openListing}
                    onToggleWishlist={handleToggleWishlist}
                  />
                ))}
              </div>

              <div className="mt-4 rounded-[22px] bg-[linear-gradient(180deg,#17394a_0%,#205871_100%)] px-4 py-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/58">
                      Next event
                    </p>
                    <p className="mt-2 font-display text-[1.35rem] font-semibold tracking-[-0.03em]">
                      {nextEvent?.title || "More local events coming in"}
                    </p>
                  </div>
                  <CalendarRange className="text-orange" size={18} />
                </div>
                {nextEvent ? (
                  <div className="mt-4 space-y-2 text-sm text-white/82">
                    <p>
                      {nextEvent.store} | {nextEvent.dateStr}
                    </p>
                    <p>{nextEvent.time}</p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-white/82">
                    Check the events page for the latest local calendar.
                  </p>
                )}
                <Link
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white"
                  to="/events"
                >
                  View events
                  <ArrowRight size={14} />
                </Link>
              </div>
            </aside>
          </div>
        </article>

        <aside className="drop-in-item space-y-4">
          <article className="handheld-module p-4 sm:p-5">
            <p className="section-kicker">Browse switchboard</p>
            <div className="mt-4 grid gap-3">
              {categorySummaries.map((game) => (
                <button
                  key={game.slug}
                  className="rounded-[20px] border border-[#d7e4ed] bg-white/75 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-navy/25"
                  type="button"
                  onClick={() => {
                    setGlobalSearch("");
                    navigate(`/market/${game.slug}`);
                  }}
                >
                  <p className="font-display text-[1.25rem] font-semibold tracking-[-0.03em] text-ink">
                    {game.name}
                  </p>
                  <p className="mt-1 text-sm text-steel">{game.count} active listings</p>
                </button>
              ))}
            </div>
          </article>

          {currentUser && incompleteOnboardingCount ? (
            <article className="handheld-module p-4 sm:p-5">
              <p className="section-kicker">Profile setup</p>
              <p className="mt-2 font-display text-[1.55rem] font-semibold tracking-[-0.04em] text-ink">
                Finish your account
              </p>
              <div className="mt-4 grid gap-2">
                {onboardingItems.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-[18px] px-3 py-3 text-sm ${
                      item.done
                        ? "bg-emerald-50 text-emerald-800"
                        : "border border-[#d7e4ed] bg-white/75 text-steel"
                    }`}
                  >
                    <span className="font-semibold text-ink">{item.label}</span>
                    <span className="ml-2 text-xs uppercase tracking-[0.16em]">
                      {item.done ? "Done" : "Needed"}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-navy"
                to="/account"
              >
                Open settings
                <ArrowRight size={14} />
              </Link>
            </article>
          ) : null}
        </aside>
      </section>

      <section className="drop-in-item handheld-module p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Game channels</p>
            <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.05em] text-ink">
              Jump into the active shelves
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
              className="overflow-hidden rounded-[24px] border border-[#d7e4ed] bg-white/76"
            >
              <div className="border-b border-[#d7e4ed] bg-[linear-gradient(180deg,#edf4f9_0%,#deebf3_100%)] px-5 py-5">
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
                    <button
                      key={listing.id}
                      className="flex w-full items-center gap-3 rounded-[20px] border border-[#d7e4ed] bg-white px-4 py-4 text-left transition hover:border-navy/20"
                      type="button"
                      onClick={() => openListing(listing.id)}
                    >
                      <CardArtwork
                        className="aspect-[63/88] w-[4.4rem] rounded-[15px] object-cover"
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
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-[#d7e4ed] bg-white/68 px-4 py-6 text-sm text-steel">
                    No active {game.shortName} listings yet.
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="drop-in-cluster grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="drop-in-item handheld-module p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Upcoming events</p>
              <h2 className="mt-2 font-display text-[1.95rem] font-semibold tracking-[-0.05em] text-ink">
                Calendar channel
              </h2>
            </div>
            <CalendarRange className="text-orange" size={20} />
          </div>
          <div className="mt-5 space-y-3">
            {upcomingEvents.length ? (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-4 rounded-[20px] border border-[#d7e4ed] bg-white/78 px-4 py-4"
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
              <div className="rounded-[20px] border border-dashed border-[#d7e4ed] bg-white/70 px-4 py-6 text-sm text-steel">
                Event listings are still being refreshed.
              </div>
            )}
          </div>
        </article>

        <article className="drop-in-item handheld-module p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Trusted sellers</p>
              <h2 className="mt-2 font-display text-[1.95rem] font-semibold tracking-[-0.05em] text-ink">
                Local accounts to browse
              </h2>
            </div>
            <Shield className="text-navy" size={20} />
          </div>
          <div className="mt-5 space-y-3">
            {topSellers.map((seller) => (
              <button
                key={seller.id}
                className="flex w-full items-center justify-between gap-4 rounded-[20px] border border-[#d7e4ed] bg-white/78 px-4 py-4 text-left transition hover:border-navy/20"
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
            <div className="rounded-[20px] border border-[#d7e4ed] bg-white/75 p-4">
              <MessageCircleMore className="text-orange" size={18} />
              <p className="mt-3 font-semibold text-ink">In-app offers</p>
              <p className="mt-1 text-sm leading-7 text-steel">
                Keep cash, trade, and meetup details attached to the listing thread.
              </p>
            </div>
            <div className="rounded-[20px] border border-[#d7e4ed] bg-white/75 p-4">
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
