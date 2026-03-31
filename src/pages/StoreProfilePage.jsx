import { BellRing, CalendarDays, ExternalLink, Heart, MapPin, ShieldCheck, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
import SeoHead from "../components/seo/SeoHead";
import EmptyState from "../components/ui/EmptyState";
import PageSkeleton from "../components/ui/PageSkeleton";
import { gameCatalog } from "../data/mockData";
import { getStoreBySlug } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";
import { fetchLocalEvents } from "../services/cardDatabase";

function normalizeStoreName(value) {
  return String(value || "").trim().toLowerCase();
}

export default function StoreProfilePage() {
  const { storeSlug } = useParams();
  const {
    activeListings,
    eventReminderIds,
    eventAttendance,
    followedStoreSlugs,
    loading,
    sellers,
    setEventAttendanceIntent,
    toggleEventReminder,
    toggleStoreFollow,
  } = useMarketplace();
  const [remoteEvents, setRemoteEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const store = getStoreBySlug(storeSlug);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const data = await fetchLocalEvents();
        if (!cancelled) {
          setRemoteEvents(Array.isArray(data?.events) ? data.events.filter(Boolean) : []);
        }
      } finally {
        if (!cancelled) {
          setEventsLoading(false);
        }
      }
    }

    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  const matchingEvents = useMemo(() => {
    if (!store) {
      return [];
    }

    const storeName = normalizeStoreName(store.name);
    return remoteEvents
      .filter((event) => normalizeStoreName(event.store) === storeName)
      .sort((left, right) => new Date(left.dateStr).getTime() - new Date(right.dateStr).getTime())
      .slice(0, 8);
  }, [remoteEvents, store]);

  const featuredListings = useMemo(() => {
    if (!store) {
      return [];
    }

    return activeListings
      .filter((listing) => {
        const seller = sellers.find((user) => user.id === listing.sellerId);
        if (!seller) {
          return false;
        }

        const trustedSpotMatch = Array.isArray(seller.trustedMeetupSpots)
          ? seller.trustedMeetupSpots.includes(store.slug)
          : false;
        const neighborhoodMatch =
          normalizeStoreName(seller.neighborhood) === normalizeStoreName(store.neighborhood);

        return trustedSpotMatch || neighborhoodMatch;
      })
      .sort(
        (left, right) =>
          Number(right.featured) - Number(left.featured) ||
          (right.sortTimestamp || 0) - (left.sortTimestamp || 0),
      )
      .slice(0, 8);
  }, [activeListings, sellers, store]);

  const listingsByGame = useMemo(() => {
    const groups = Object.fromEntries(
      gameCatalog
        .filter((game) => game.slug !== "all")
        .map((game) => [game.name, []]),
    );

    featuredListings.forEach((listing) => {
      if (groups[listing.game]) {
        groups[listing.game].push(listing);
      }
    });

    return groups;
  }, [featuredListings]);

  const sellerCount = useMemo(() => {
    if (!store) {
      return 0;
    }

    return sellers.filter((seller) =>
      Array.isArray(seller.trustedMeetupSpots) ? seller.trustedMeetupSpots.includes(store.slug) : false,
    ).length;
  }, [sellers, store]);

  const storeFollowerCount = useMemo(() => {
    if (!store) {
      return 0;
    }

    return sellers.filter((seller) =>
      Array.isArray(seller.followedStoreSlugs)
        ? seller.followedStoreSlugs.includes(store.slug)
        : false,
    ).length;
  }, [sellers, store]);

  if (loading && !store) {
    return (
      <>
        <SeoHead title="Store Profile" canonicalPath={`/stores/${storeSlug || ""}`} />
        <PageSkeleton cards={4} titleWidth="w-80" />
      </>
    );
  }

  if (!store) {
    return (
      <>
        <SeoHead title="Store Not Found" canonicalPath={`/stores/${storeSlug || ""}`} />
        <EmptyState title="Store Not Found" description="That store profile does not exist." />
      </>
    );
  }

  const isFollowingStore = followedStoreSlugs.includes(store.slug);
  const storeStructuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: store.name,
    image: store.logoUrl || undefined,
    url: store.siteUrl || `https://tcgwpg.com/stores/${store.slug}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: store.address,
      addressLocality: "Winnipeg",
      addressRegion: "MB",
      addressCountry: "CA",
    },
    areaServed: {
      "@type": "City",
      name: "Winnipeg",
    },
    event: matchingEvents.slice(0, 6).map((event) => ({
      "@type": "Event",
      name: event.title,
      startDate: `${event.dateStr}T12:00:00`,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "Place",
        name: store.name,
        address: {
          "@type": "PostalAddress",
          streetAddress: store.address,
          addressLocality: "Winnipeg",
          addressRegion: "MB",
          addressCountry: "CA",
        },
      },
      url: event.sourceUrl || store.eventsUrl || store.siteUrl,
    })),
  };

  return (
    <main className="space-y-5 sm:space-y-8">
      <SeoHead
        canonicalPath={`/stores/${store.slug}`}
        description={`${store.name} is an approved Winnipeg meetup spot with upcoming events and featured listings on TCG WPG Marketplace.`}
        title={store.name}
        type="website"
        jsonLd={storeStructuredData}
      />
      <section className="console-panel binder-edge overflow-hidden p-0">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#4d0f13,#7a181d)] p-3.5 text-white sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_82%_20%,rgba(239,59,51,0.14),transparent_18%)]" />
          <div className="relative z-10 grid gap-3 sm:gap-6 lg:grid-cols-[1fr_16rem] lg:items-end">
            <div>
              <p className="section-kicker text-white/62">Store profile</p>
              <h1 className="mt-2.5 font-display text-[1.6rem] font-semibold tracking-[-0.05em] text-white sm:mt-3 sm:text-[3.15rem]">
                {store.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white sm:px-3 sm:text-xs sm:tracking-[0.18em]">
                  <ShieldCheck size={14} />
                  Approved meetup spot
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white sm:px-3 sm:text-xs sm:tracking-[0.18em]">
                  {store.neighborhood}
                </span>
              </div>
              <div className="mt-3 grid gap-1.5 text-[0.78rem] text-white/82 sm:mt-5 sm:gap-3 sm:text-sm">
                <span className="inline-flex items-center gap-2">
                  <MapPin size={16} />
                  {store.address}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Store size={16} />
                  {sellerCount} seller{sellerCount === 1 ? "" : "s"} use this spot
                </span>
                <span className="inline-flex items-center gap-2">
                  <Heart size={16} />
                  {storeFollowerCount} follower{storeFollowerCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 sm:mt-5 sm:gap-3">
                <button
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.76rem] font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${
                    isFollowingStore
                      ? "bg-white text-navy"
                      : "border border-white/16 bg-white/10 text-white hover:bg-white/16"
                  }`}
                  type="button"
                  onClick={() => void toggleStoreFollow(store.slug)}
                >
                  <Heart fill={isFollowingStore ? "currentColor" : "none"} size={15} />
                  {isFollowingStore ? "Following store" : "Follow store"}
                </button>
                {store.eventsUrl ? (
                  <a
                    className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-[0.76rem] font-semibold text-white hover:bg-white/16 sm:px-4 sm:py-2 sm:text-sm"
                    href={store.eventsUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Source calendar
                    <ExternalLink size={14} />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-[16px] border border-white/14 bg-[rgba(255,255,255,0.08)] p-2 sm:rounded-[28px] sm:p-4">
              <div className="flex h-full min-h-[4.75rem] items-center justify-center rounded-[14px] bg-[#f6f7f8] px-3 py-2 sm:min-h-[9rem] sm:rounded-[22px] sm:px-5 sm:py-4">
                {store.logoUrl ? (
                <img alt={store.name} className="h-12 w-full object-contain sm:h-24" src={store.logoUrl} />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr] sm:gap-6">
        <article className="console-panel binder-edge p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Upcoming events</p>
              <h2 className="mt-2 font-display text-[1.55rem] font-semibold tracking-[-0.05em] text-ink sm:text-[1.95rem]">
                Store calendar
              </h2>
            </div>
            {store.eventsUrl ? (
              <a
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[0.82rem] font-semibold text-navy sm:px-4 sm:text-sm"
                href={store.eventsUrl}
                rel="noreferrer"
                target="_blank"
              >
                Source
                <ExternalLink size={14} />
              </a>
            ) : null}
          </div>

          <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
            {matchingEvents.length ? (
              matchingEvents.map((event) => {
                const eventKey = `${event.id || "event"}:${event.dateStr || ""}:${event.time || ""}`;
                const reminderEnabled = eventReminderIds.includes(eventKey);
                const selectedIntent = eventAttendance[eventKey] || "";
                return (
                <div key={event.id} className="rounded-[18px] border border-slate-200 bg-[#f7f7f8] p-3.5 sm:rounded-[22px] sm:p-4">
                  <p className="text-[0.95rem] font-semibold text-ink sm:text-base">{event.title}</p>
                  <p className="mt-1.5 text-[0.8rem] text-steel sm:mt-2 sm:text-sm">
                    {event.dateStr} | {event.time} | {event.game}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition sm:text-xs sm:tracking-[0.18em] ${
                        reminderEnabled
                          ? "border-[rgba(177,29,35,0.22)] bg-[rgba(240,55,55,0.08)] text-navy"
                          : "border-slate-200 bg-white text-steel hover:border-slate-300 hover:text-ink"
                      }`}
                      type="button"
                      onClick={() => void toggleEventReminder(eventKey)}
                    >
                      {reminderEnabled ? "Reminder on" : "Remind me"}
                      <BellRing size={13} />
                    </button>
                    {[
                      { id: "going", label: "Going" },
                      { id: "maybe", label: "Maybe" },
                      { id: "trading-there", label: "Trading there" },
                    ].map((option) => (
                      <button
                        key={option.id}
                        className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition sm:text-xs sm:tracking-[0.18em] ${
                          selectedIntent === option.id
                            ? "border-[rgba(177,29,35,0.24)] bg-navy text-white"
                            : "border-slate-200 bg-white text-steel hover:border-slate-300 hover:text-ink"
                        }`}
                        type="button"
                        onClick={() => void setEventAttendanceIntent(eventKey, option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
            ) : eventsLoading ? (
              <p className="text-sm leading-7 text-steel">Loading store events...</p>
            ) : (
              <p className="rounded-[18px] border border-dashed border-slate-200 bg-white/70 px-3 py-5 text-sm text-steel sm:rounded-[22px] sm:px-4 sm:py-6">
                No upcoming events are available for this store right now.
              </p>
            )}
          </div>
        </article>

        <article className="console-panel binder-edge p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Featured listings</p>
              <h2 className="mt-2 font-display text-[1.55rem] font-semibold tracking-[-0.05em] text-ink sm:text-[1.95rem]">
                Meet here
              </h2>
            </div>
            <Link className="inline-flex items-center gap-2 text-sm font-semibold text-navy" to="/market">
              Open market
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:mt-5 sm:gap-4 sm:grid-cols-2">
            {featuredListings.length ? (
              featuredListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)
            ) : (
              <p className="rounded-[18px] border border-dashed border-slate-200 bg-white/70 px-3 py-5 text-sm text-steel sm:col-span-2 sm:rounded-[22px] sm:px-4 sm:py-6">
                No live listings are currently tied to this meetup spot.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="console-panel binder-edge p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Featured lanes</p>
            <h2 className="mt-2 font-display text-[1.55rem] font-semibold tracking-[-0.05em] text-ink sm:text-[1.95rem]">
              Browse by game at this store
            </h2>
          </div>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-3 sm:mt-5 sm:gap-5">
          {Object.entries(listingsByGame).map(([game, listings]) => (
            <article key={game} className="console-well p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-xs sm:tracking-[0.18em]">
                    {game}
                  </p>
                  <p className="mt-1 text-[0.82rem] text-steel sm:text-sm">
                    {listings.length} listing{listings.length === 1 ? "" : "s"} tied to this spot
                  </p>
                </div>
                <Link className="text-[0.82rem] font-semibold text-navy hover:underline sm:text-sm" to={`/market/${game === "One Piece" ? "one-piece" : game.toLowerCase()}`}>
                  Open lane
                </Link>
              </div>
              <div className="mt-3 grid gap-2.5 sm:mt-4 sm:gap-3">
                {listings.length ? (
                  listings.slice(0, 2).map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))
                ) : (
                  <div className="rounded-[16px] border border-dashed border-slate-200 bg-white/72 px-3 py-4 text-[0.82rem] text-steel sm:rounded-[18px] sm:px-4 sm:py-5 sm:text-sm">
                    Nothing active in {game} here yet.
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="console-panel binder-edge p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Quick links</p>
            <h2 className="mt-2 font-display text-[1.55rem] font-semibold tracking-[-0.05em] text-ink sm:text-[1.95rem]">
              Store actions
            </h2>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5 sm:mt-5 sm:gap-3">
          <a
            className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2.5 text-[0.82rem] font-semibold text-white sm:px-5 sm:py-3 sm:text-sm"
            href={store.siteUrl}
            rel="noreferrer"
            target="_blank"
          >
            Visit store site
            <ExternalLink size={14} />
          </a>
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[0.82rem] font-semibold text-steel sm:px-5 sm:py-3 sm:text-sm"
            to="/events"
          >
            <CalendarDays size={15} />
            View all events
          </Link>
        </div>
      </section>
    </main>
  );
}

