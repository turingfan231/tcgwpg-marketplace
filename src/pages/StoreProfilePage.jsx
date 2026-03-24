import { BellRing, CalendarDays, ExternalLink, Heart, MapPin, ShieldCheck, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
import EmptyState from "../components/ui/EmptyState";
import PageSkeleton from "../components/ui/PageSkeleton";
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
    const groups = {
      Pokemon: [],
      Magic: [],
      "One Piece": [],
    };

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

  if (loading && !store) {
    return <PageSkeleton cards={4} titleWidth="w-80" />;
  }

  if (!store) {
    return <EmptyState title="Store Not Found" description="That store profile does not exist." />;
  }

  const isFollowingStore = followedStoreSlugs.includes(store.slug);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="console-panel binder-edge overflow-hidden p-0">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#4d0f13,#7a181d)] p-5 text-white sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_82%_20%,rgba(239,59,51,0.14),transparent_18%)]" />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_16rem] lg:items-end">
            <div>
              <p className="section-kicker text-white/62">Store profile</p>
              <h1 className="mt-3 font-display text-[2.2rem] font-semibold tracking-[-0.05em] text-white sm:text-[3.15rem]">
                {store.name}
              </h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  <ShieldCheck size={14} />
                  Approved meetup spot
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  {store.neighborhood}
                </span>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-white/82">
                <span className="inline-flex items-center gap-2">
                  <MapPin size={16} />
                  {store.address}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Store size={16} />
                  {sellerCount} seller{sellerCount === 1 ? "" : "s"} use this spot
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
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
                    className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/16"
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

            <div className="rounded-[20px] border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-3 backdrop-blur-sm sm:rounded-[28px] sm:p-4">
              <div className="flex h-full min-h-[7rem] items-center justify-center rounded-[18px] border border-[rgba(255,255,255,0.82)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,243,243,0.96))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.74),0_14px_34px_rgba(80,16,16,0.12)] sm:min-h-[9rem] sm:rounded-[22px] sm:px-5 sm:py-4">
              {store.logoUrl ? (
                <img alt={store.name} className="h-24 w-full object-contain" src={store.logoUrl} />
              ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="console-panel binder-edge p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Upcoming events</p>
              <h2 className="mt-2 font-display text-[1.95rem] font-semibold tracking-[-0.05em] text-ink">
                Store calendar
              </h2>
            </div>
            {store.eventsUrl ? (
              <a
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-navy"
                href={store.eventsUrl}
                rel="noreferrer"
                target="_blank"
              >
                Source
                <ExternalLink size={14} />
              </a>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            {matchingEvents.length ? (
              matchingEvents.map((event) => {
                const eventKey = `${event.id || "event"}:${event.dateStr || ""}:${event.time || ""}`;
                const reminderEnabled = eventReminderIds.includes(eventKey);
                const selectedIntent = eventAttendance[eventKey] || "";
                return (
                <div key={event.id} className="rounded-[22px] border border-slate-200 bg-[#f7f7f8] p-4">
                  <p className="font-semibold text-ink">{event.title}</p>
                  <p className="mt-2 text-sm text-steel">
                    {event.dateStr} | {event.time} | {event.game}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
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
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
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
              <p className="rounded-[22px] border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-sm text-steel">
                No upcoming events are available for this store right now.
              </p>
            )}
          </div>
        </article>

        <article className="console-panel binder-edge p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Featured listings</p>
              <h2 className="mt-2 font-display text-[1.95rem] font-semibold tracking-[-0.05em] text-ink">
                Meet here
              </h2>
            </div>
            <Link className="inline-flex items-center gap-2 text-sm font-semibold text-navy" to="/market">
              Open market
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {featuredListings.length ? (
              featuredListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)
            ) : (
              <p className="rounded-[22px] border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-sm text-steel sm:col-span-2">
                No live listings are currently tied to this meetup spot.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="console-panel binder-edge p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Featured lanes</p>
            <h2 className="mt-2 font-display text-[1.95rem] font-semibold tracking-[-0.05em] text-ink">
              Browse by game at this store
            </h2>
          </div>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          {Object.entries(listingsByGame).map(([game, listings]) => (
            <article key={game} className="console-well p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    {game}
                  </p>
                  <p className="mt-1 text-sm text-steel">
                    {listings.length} listing{listings.length === 1 ? "" : "s"} tied to this spot
                  </p>
                </div>
                <Link className="text-sm font-semibold text-navy hover:underline" to={`/market/${game === "One Piece" ? "one-piece" : game.toLowerCase()}`}>
                  Open lane
                </Link>
              </div>
              <div className="mt-4 grid gap-3">
                {listings.length ? (
                  listings.slice(0, 2).map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-slate-200 bg-white/72 px-4 py-5 text-sm text-steel">
                    Nothing active in {game} here yet.
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="console-panel binder-edge p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Quick links</p>
            <h2 className="mt-2 font-display text-[1.95rem] font-semibold tracking-[-0.05em] text-ink">
              Store actions
            </h2>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white"
            href={store.siteUrl}
            rel="noreferrer"
            target="_blank"
          >
            Visit store site
            <ExternalLink size={14} />
          </a>
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-steel"
            to="/events"
          >
            <CalendarDays size={15} />
            View all events
          </Link>
        </div>
      </section>
    </div>
  );
}

