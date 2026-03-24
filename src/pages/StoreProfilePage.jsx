import { CalendarDays, ExternalLink, MapPin, ShieldCheck, Store } from "lucide-react";
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
  const { activeListings, loading, sellers } = useMarketplace();
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

  return (
    <div className="space-y-8">
      <section className="console-panel overflow-hidden p-0">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0f2536,#17384c)] p-7 text-white sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_82%_20%,rgba(105,180,176,0.14),transparent_18%)]" />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_16rem] lg:items-end">
            <div>
              <p className="section-kicker text-white/62">Store profile</p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-white sm:text-[3.15rem]">
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
            </div>

            <div className="rounded-[28px] border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-4 backdrop-blur-sm">
              <div className="flex h-full min-h-[9rem] items-center justify-center rounded-[22px] border border-[rgba(255,255,255,0.78)] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(233,241,247,0.94))] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(4,14,24,0.12)]">
              {store.logoUrl ? (
                <img alt={store.name} className="h-24 w-full object-contain" src={store.logoUrl} />
              ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="console-panel p-5 sm:p-6">
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
              matchingEvents.map((event) => (
                <div key={event.id} className="rounded-[22px] border border-slate-200 bg-[#f7f7f8] p-4">
                  <p className="font-semibold text-ink">{event.title}</p>
                  <p className="mt-2 text-sm text-steel">
                    {event.dateStr} | {event.time} | {event.game}
                  </p>
                </div>
              ))
            ) : eventsLoading ? (
              <p className="text-sm leading-7 text-steel">Loading store events...</p>
            ) : (
              <p className="rounded-[22px] border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-sm text-steel">
                No upcoming events are available for this store right now.
              </p>
            )}
          </div>
        </article>

        <article className="console-panel p-5 sm:p-6">
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

      <section className="console-panel p-5 sm:p-6">
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

