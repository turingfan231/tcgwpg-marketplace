import { BellRing, CalendarDays, ExternalLink, Heart, MapPin, ShieldCheck, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import UserAvatar from "../components/shared/UserAvatar";
import SeoHead from "../components/seo/SeoHead";
import { getStoreBySlug } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import {
  BottomSheet,
  ChoicePill,
  EmptyBlock,
  MobileScreen,
  PrimaryButton,
  ScreenHeader,
  ScreenSection,
  SecondaryButton,
} from "../mobile/primitives";
import { fetchLocalEvents } from "../services/cardDatabase";

function normalizeStoreName(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesStoreListing(store, listing, sellers) {
  const seller = sellers.find((user) => String(user.id) === String(listing.sellerId));
  if (!seller) {
    return false;
  }
  const trustedSpotMatch = Array.isArray(seller.trustedMeetupSpots)
    ? seller.trustedMeetupSpots.includes(store.slug)
    : false;
  const neighborhoodMatch =
    normalizeStoreName(seller.neighborhood) === normalizeStoreName(store.neighborhood);
  return trustedSpotMatch || neighborhoodMatch;
}

function PersonRow({ person }) {
  return (
    <Link
      className="flex items-center gap-3 rounded-[16px] px-3 py-2"
      style={{ background: m.surfaceStrong, border: `1px solid ${m.border}` }}
      to={`/seller/${person.id}`}
    >
      <UserAvatar className="h-10 w-10 text-[12px]" user={person} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] text-white" style={{ fontWeight: 700 }}>
          {person.publicName || person.name}
        </p>
        <p className="mt-0.5 text-[10px]" style={{ color: m.textSecondary }}>
          {person.neighborhood || "Winnipeg"}
        </p>
      </div>
    </Link>
  );
}

export default function StoreProfilePage() {
  const { storeSlug } = useParams();
  const {
    activeListings,
    ensureEventAttendanceFeedLoaded,
    eventAttendance,
    eventAttendanceFeed,
    eventReminderIds,
    followedStoreSlugs,
    sellers,
    setEventAttendanceIntent,
    toggleEventReminder,
    toggleStoreFollow,
  } = useMarketplace();
  const [remoteEvents, setRemoteEvents] = useState([]);
  const [sheet, setSheet] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const store = getStoreBySlug(storeSlug);

  useEffect(() => {
    void ensureEventAttendanceFeedLoaded();
  }, [ensureEventAttendanceFeedLoaded]);

  useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
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
    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  const matchingEvents = useMemo(() => {
    if (!store) {
      return [];
    }
    return remoteEvents
      .filter((event) => normalizeStoreName(event.store) === normalizeStoreName(store.name))
      .sort((left, right) => new Date(left.dateStr || left.date || 0) - new Date(right.dateStr || right.date || 0));
  }, [remoteEvents, store]);

  const featuredListings = useMemo(() => {
    if (!store) {
      return [];
    }
    return activeListings
      .filter((listing) => matchesStoreListing(store, listing, sellers))
      .sort((left, right) => Number(right.sortTimestamp || 0) - Number(left.sortTimestamp || 0))
      .slice(0, 6);
  }, [activeListings, sellers, store]);

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
      Array.isArray(seller.followedStoreSlugs) ? seller.followedStoreSlugs.includes(store.slug) : false,
    ).length;
  }, [sellers, store]);

  if (!store) {
    return (
      <MobileScreen className="pb-[92px]">
        <SeoHead canonicalPath={`/stores/${storeSlug}`} description="Store profile" title="Store not found" />
        <ScreenHeader subtitle="Meetup spot" title="Store" />
        <ScreenSection className="pt-2">
          <EmptyBlock description="That store profile does not exist in the current directory." title="Store not found" />
        </ScreenSection>
      </MobileScreen>
    );
  }

  const isFollowingStore = followedStoreSlugs.includes(store.slug);

  return (
    <MobileScreen className="pb-[92px]">
      <SeoHead
        canonicalPath={`/stores/${store.slug}`}
        description={`${store.name} is an approved Winnipeg meetup spot with active listings and local events.`}
        title={store.name}
      />

      <ScreenHeader className="lg:hidden" subtitle={store.neighborhood} title={store.name} />

      <div className="hidden lg:block lg:px-8 lg:pt-8">
        <div className="mx-auto grid w-full max-w-[1480px] grid-cols-[minmax(0,1.08fr)_360px] gap-8">
          <div
            className="rounded-[28px] px-6 py-6"
            style={{
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
              border: `1px solid ${m.borderStrong}`,
            }}
          >
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[22px]"
                  style={{ background: "rgba(255,255,255,0.94)" }}
                >
                  {store.logoUrl ? (
                    <img alt={store.name} className="h-full w-full object-contain p-3" src={store.logoUrl} />
                  ) : (
                    <span className="text-2xl" style={{ color: "#111", fontWeight: 700 }}>
                      {String(store.shortName || store.name).charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[30px] text-white" style={{ fontWeight: 800, lineHeight: 1.05 }}>{store.name}</p>
                  <div className="mt-2 flex items-center gap-2 text-[12px]" style={{ color: "#7a7a82" }}>
                    <MapPin size={12} />
                    <span>{store.address}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {store.approvedMeetup ? (
                      <span className="rounded-full px-2 py-[5px] text-[10px]" style={{ background: "rgba(239,68,68,0.14)", color: "#fca5a5", fontWeight: 700 }}>
                        Approved meetup
                      </span>
                    ) : null}
                    <span className="rounded-full px-2 py-[5px] text-[10px]" style={{ background: m.surfaceStrong, color: m.textSecondary, fontWeight: 600 }}>
                      {storeFollowerCount} follows
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <PrimaryButton className="!rounded-[16px] !px-5" onClick={() => toggleStoreFollow(store.slug)}>
                  <Heart size={14} />
                  {isFollowingStore ? "Following" : "Follow"}
                </PrimaryButton>
                {store.siteUrl ? (
                  <SecondaryButton className="!rounded-[16px] !px-5" onClick={() => window.open(store.siteUrl, "_blank", "noopener,noreferrer")}>
                    <ExternalLink size={14} />
                    Website
                  </SecondaryButton>
                ) : null}
              </div>
            </div>
          </div>
          <div className="rounded-[28px] border p-5" style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[18px] border px-3 py-3" style={{ background: m.surface, borderColor: m.border }}>
                <p className="text-[10px]" style={{ color: m.textTertiary, fontWeight: 700 }}>Sellers</p>
                <p className="mt-2 text-[24px] text-white" style={{ fontWeight: 800 }}>{sellerCount}</p>
              </div>
              <div className="rounded-[18px] border px-3 py-3" style={{ background: m.surface, borderColor: m.border }}>
                <p className="text-[10px]" style={{ color: m.textTertiary, fontWeight: 700 }}>Events</p>
                <p className="mt-2 text-[24px] text-white" style={{ fontWeight: 800 }}>{matchingEvents.length}</p>
              </div>
              <button className="rounded-[18px] border px-3 py-3 text-left" style={{ background: m.surface, borderColor: m.border }} type="button" onClick={() => setSheet("followers")}>
                <p className="text-[10px]" style={{ color: m.textTertiary, fontWeight: 700 }}>Followers</p>
                <p className="mt-2 text-[24px] text-white" style={{ fontWeight: 800 }}>{storeFollowerCount}</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ScreenSection className="pb-3 lg:hidden">
        <div
          className="rounded-[22px] px-4 py-4"
          style={{
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
            border: `1px solid ${m.borderStrong}`,
          }}
        >
          <div className="flex gap-3">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px]"
              style={{ background: "rgba(255,255,255,0.94)" }}
            >
              {store.logoUrl ? (
                <img alt={store.name} className="h-full w-full object-contain p-3" src={store.logoUrl} />
              ) : (
                <span className="text-lg" style={{ color: "#111", fontWeight: 700 }}>
                  {String(store.shortName || store.name).charAt(0)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                {store.approvedMeetup ? (
                  <span className="rounded-full px-2 py-[4px] text-[9px]" style={{ background: "rgba(239,68,68,0.14)", color: "#fca5a5", fontWeight: 700 }}>
                    Approved meetup
                  </span>
                ) : null}
                <span className="rounded-full px-2 py-[4px] text-[9px]" style={{ background: m.surfaceStrong, color: m.textSecondary, fontWeight: 600 }}>
                  {storeFollowerCount} follows
                </span>
              </div>
              <div className="mt-2 grid gap-1 text-[10px]" style={{ color: m.textSecondary }}>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} />
                  {store.address}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Store size={11} />
                  {sellerCount} sellers use this spot
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <PrimaryButton className="w-full" onClick={() => toggleStoreFollow(store.slug)}>
              <Heart size={14} />
              {isFollowingStore ? "Following" : "Follow"}
            </PrimaryButton>
            {store.siteUrl ? (
              <SecondaryButton className="w-full" onClick={() => window.open(store.siteUrl, "_blank", "noopener,noreferrer")}>
                <ExternalLink size={14} />
                Website
              </SecondaryButton>
            ) : (
              <SecondaryButton className="w-full">
                <ShieldCheck size={14} />
                Trusted
              </SecondaryButton>
            )}
          </div>
        </div>
      </ScreenSection>

      <ScreenSection className="grid grid-cols-3 gap-2 pb-3 lg:hidden">
        <div className="rounded-[18px] px-4 py-3" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
          <p className="text-[9px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
            Sellers
          </p>
          <p className="mt-1 text-[18px] text-white" style={{ fontWeight: 700 }}>
            {sellerCount}
          </p>
        </div>
        <div className="rounded-[18px] px-4 py-3" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
          <p className="text-[9px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
            Events
          </p>
          <p className="mt-1 text-[18px] text-white" style={{ fontWeight: 700 }}>
            {matchingEvents.length}
          </p>
        </div>
        <button
          className="rounded-[18px] px-4 py-3 text-left"
          style={{ background: m.surface, border: `1px solid ${m.border}` }}
          type="button"
          onClick={() => setSheet("followers")}
        >
          <p className="text-[9px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
            Followers
          </p>
          <p className="mt-1 text-[18px] text-white" style={{ fontWeight: 700 }}>
            {storeFollowerCount}
          </p>
        </button>
      </ScreenSection>

      <ScreenSection className="pb-3 lg:px-8 lg:pt-8">
      <div className="mx-auto w-full lg:max-w-[1480px]">
        <p className="mb-2 text-[12px] text-white" style={{ fontWeight: 700 }}>
          Upcoming events
        </p>
        {matchingEvents.length ? (
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-4">
            {matchingEvents.slice(0, 4).map((event) => (
              <div key={event.id} className="rounded-[18px] px-4 py-4 lg:rounded-[24px] lg:p-5" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] text-white" style={{ fontWeight: 700 }}>
                      {event.title}
                    </p>
                    <div className="mt-2 grid gap-1 text-[10px]" style={{ color: m.textSecondary }}>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={11} />
                        {new Date(`${event.dateStr}T12:00:00`).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {event.time}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} />
                        {event.neighborhood}
                      </span>
                    </div>
                  </div>
                  <button
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-[12px] px-3 text-[10px]"
                    style={{
                      background: eventReminderIds.includes(event.id) ? "rgba(239,68,68,0.14)" : m.surfaceStrong,
                      color: eventReminderIds.includes(event.id) ? "#fca5a5" : m.textSecondary,
                      fontWeight: 700,
                    }}
                    type="button"
                    onClick={() => toggleEventReminder(event.id)}
                  >
                    <BellRing size={12} />
                    {eventReminderIds.includes(event.id) ? "Saved" : "Remind"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[ 
                    { id: "going", label: "Going" },
                    { id: "maybe", label: "Maybe" },
                    { id: "trading-there", label: "Trading" },
                  ].map((option) => (
                    <ChoicePill
                      key={`${event.id}-${option.id}`}
                      active={eventAttendance[event.id] === option.id}
                      onClick={() => setEventAttendanceIntent(event.id, eventAttendance[event.id] === option.id ? "" : option.id)}
                    >
                      {option.label}
                    </ChoicePill>
                  ))}
                  <button
                    className="inline-flex h-[30px] items-center justify-center rounded-full px-3 text-[10px]"
                    style={{ background: m.surfaceStrong, color: m.textSecondary, fontWeight: 600 }}
                    type="button"
                    onClick={() => {
                      setSelectedEvent(event);
                      setSheet("attendees");
                    }}
                  >
                    {(eventAttendanceFeed[event.id] || []).length || 0} responses
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyBlock description="No store events are showing right now." title="No upcoming events" />
        )}
        </div>
      </ScreenSection>

      <BottomSheet open={sheet === "followers"} onClose={() => setSheet("")}>
        <div className="px-4 pb-6 pt-4">
          <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>
            Store followers
          </p>
          <div className="mt-4 grid gap-2">
            {sellers.filter((seller) => Array.isArray(seller.followedStoreSlugs) && seller.followedStoreSlugs.includes(store.slug)).length ? (
              sellers
                .filter((seller) => Array.isArray(seller.followedStoreSlugs) && seller.followedStoreSlugs.includes(store.slug))
                .map((seller) => <PersonRow key={`${store.slug}-${seller.id}`} person={seller} />)
            ) : (
              <p className="text-[11px]" style={{ color: m.textSecondary }}>
                No followers yet.
              </p>
            )}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === "attendees"}
        onClose={() => {
          setSheet("");
          setSelectedEvent(null);
        }}
      >
        <div className="px-4 pb-6 pt-4">
          <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>
            {selectedEvent?.title || "Responses"}
          </p>
          <div className="mt-4 grid gap-4">
            {["going", "maybe", "trading-there"].map((intent) => {
              const people = (eventAttendanceFeed[selectedEvent?.id] || []).filter((entry) => entry.intent === intent);
              return (
                <div key={intent}>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
                    {intent === "trading-there" ? "Trading there" : intent}
                  </p>
                  {people.length ? (
                    <div className="grid gap-2">
                      {people.map((entry) => (
                        <PersonRow key={`${selectedEvent?.id}-${intent}-${entry.id}`} person={entry.user} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px]" style={{ color: m.textSecondary }}>
                      No one marked {intent === "trading-there" ? "trading there" : intent} yet.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </MobileScreen>
  );
}
