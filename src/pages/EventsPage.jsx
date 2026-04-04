import { BellRing, CalendarDays, ExternalLink, MapPin, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import UserAvatar from "../components/shared/UserAvatar";
import SeoHead from "../components/seo/SeoHead";
import { getStoreSlugByName } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import {
  BottomSheet,
  ChoicePill,
  EmptyBlock,
  ListingRow,
  MobileScreen,
  ScreenHeader,
  ScreenSection,
} from "../mobile/primitives";
import { fetchLocalEvents } from "../services/cardDatabase";

function normalizeStoreName(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesEventListing(event, listing, sellers, storeSlug) {
  if (String(listing?.game || "").toLowerCase() !== String(event?.game || "").toLowerCase()) {
    return false;
  }
  const seller = sellers.find((user) => String(user.id) === String(listing.sellerId));
  if (!seller) {
    return false;
  }
  const trustedSpotMatch = Array.isArray(seller.trustedMeetupSpots)
    ? seller.trustedMeetupSpots.includes(storeSlug)
    : false;
  const neighborhoodMatch =
    normalizeStoreName(seller.neighborhood) === normalizeStoreName(event.neighborhood);

  return trustedSpotMatch || neighborhoodMatch;
}

function AttendeeRow({ person }) {
  return (
    <Link
      className="flex items-center gap-3 rounded-[16px] px-3 py-2"
      style={{ background: m.surfaceStrong, border: `1px solid ${m.border}` }}
      to={`/seller/${person.user.id}`}
    >
      <UserAvatar className="h-10 w-10 text-[12px]" user={person.user} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] text-white" style={{ fontWeight: 700 }}>
          {person.user.publicName || person.user.name}
        </p>
        <p className="mt-0.5 text-[10px]" style={{ color: m.textSecondary }}>
          {person.user.neighborhood || "Winnipeg"}
        </p>
      </div>
      <span className="rounded-full px-2 py-[4px] text-[9px]" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", fontWeight: 700 }}>
        {person.intent === "trading-there" ? "Trading there" : person.intent === "going" ? "Going" : "Maybe"}
      </span>
    </Link>
  );
}

function EventCard({
  attendees,
  attendanceIntent,
  event,
  relatedListings,
  reminderEnabled,
  setAttendanceIntent,
  toggleReminder,
  onViewAttendees,
}) {
  const storeSlug = getStoreSlugByName(event.store);
  const eventDate = new Date(`${event.dateStr}T12:00:00`);

  return (
    <article
      className="rounded-[20px] px-4 py-4"
      style={{ background: m.surface, border: `1px solid ${m.border}`, boxShadow: m.shadowPanel }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[14px]"
          style={{ background: "rgba(239,68,68,0.12)" }}
        >
          <span className="text-[8px] uppercase" style={{ color: "#fca5a5", fontWeight: 700 }}>
            {eventDate.toLocaleDateString("en-CA", { weekday: "short" })}
          </span>
          <span className="text-[16px] leading-none text-white" style={{ fontWeight: 700 }}>
            {eventDate.getDate()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5">
                <span
                  className="rounded-full px-2 py-[4px] text-[9px]"
                  style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", fontWeight: 700 }}
                >
                  {event.game}
                </span>
                <span
                  className="rounded-full px-2 py-[4px] text-[9px]"
                  style={{ background: m.surfaceStrong, color: m.textSecondary, fontWeight: 600 }}
                >
                  {event.store}
                </span>
              </div>
              <p className="mt-2 text-[14px] text-white" style={{ fontWeight: 700 }}>
                {event.title}
              </p>
              <div className="mt-2 grid gap-1 text-[10px]" style={{ color: m.textSecondary }}>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={11} />
                  {eventDate.toLocaleDateString("en-CA", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  · {event.time}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} />
                  {event.neighborhood}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Store size={11} />
                  {event.source || "Local event"}
                </span>
              </div>
            </div>
            <button
              className="inline-flex h-8 items-center justify-center gap-1 rounded-[12px] px-3 text-[10px]"
              style={{
                background: reminderEnabled ? "rgba(239,68,68,0.14)" : m.surfaceStrong,
                color: reminderEnabled ? "#fca5a5" : m.textSecondary,
                fontWeight: 700,
              }}
              type="button"
              onClick={toggleReminder}
            >
              <BellRing size={12} />
              {reminderEnabled ? "Saved" : "Remind"}
            </button>
          </div>

          {event.note ? (
            <p className="mt-3 text-[11px] leading-5" style={{ color: m.textSecondary }}>
              {event.note}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { id: "going", label: "Going" },
              { id: "maybe", label: "Maybe" },
              { id: "trading-there", label: "Trading there" },
            ].map((option) => (
              <ChoicePill
                key={`${event.id}-${option.id}`}
                active={attendanceIntent === option.id}
                onClick={() => setAttendanceIntent(attendanceIntent === option.id ? "" : option.id)}
              >
                {option.label}
              </ChoicePill>
            ))}
            {event.sourceUrl ? (
              <a
                className="inline-flex h-[30px] items-center justify-center gap-1 rounded-full px-3 text-[10px]"
                href={event.sourceUrl}
                rel="noreferrer"
                style={{ background: m.surfaceStrong, color: m.textSecondary, fontWeight: 600 }}
                target="_blank"
              >
                Source
                <ExternalLink size={11} />
              </a>
            ) : null}
            {storeSlug ? (
              <Link
                className="inline-flex h-[30px] items-center justify-center rounded-full px-3 text-[10px]"
                style={{ background: m.surfaceStrong, color: m.textSecondary, fontWeight: 600 }}
                to={`/stores/${storeSlug}`}
              >
                Store
              </Link>
            ) : null}
            <button
              className="inline-flex h-[30px] items-center justify-center rounded-full px-3 text-[10px]"
              style={{ background: m.surfaceStrong, color: m.textSecondary, fontWeight: 600 }}
              type="button"
              onClick={onViewAttendees}
            >
              {attendees.length ? `${attendees.length} responses` : "Responses"}
            </button>
          </div>

          {relatedListings.length ? (
            <div className="mt-4 flex flex-col gap-2">
              {relatedListings.slice(0, 2).map((listing) => (
                <ListingRow key={listing.id} listing={listing} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function EventsPage() {
  const {
    activeListings,
    eventAttendance,
    eventAttendanceFeed,
    eventReminderIds,
    manualEvents,
    sellers,
    setEventAttendanceIntent,
    toggleEventReminder,
  } = useMarketplace();
  const [remoteEvents, setRemoteEvents] = useState([]);
  const [activeGame, setActiveGame] = useState("All");
  const [selectedEvent, setSelectedEvent] = useState(null);

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

  const mergedEvents = useMemo(() => {
    const rows = [...remoteEvents, ...manualEvents].filter(Boolean);
    return rows
      .filter(
        (event, index, items) =>
          items.findIndex(
            (candidate) =>
              String(candidate.id || "") === String(event.id || "") ||
              (String(candidate.title || "") === String(event.title || "") &&
                String(candidate.store || "") === String(event.store || "") &&
                String(candidate.dateStr || "") === String(event.dateStr || "")),
          ) === index,
      )
      .filter((event) => event.published !== false)
      .sort((left, right) => new Date(left.dateStr || left.date || 0) - new Date(right.dateStr || right.date || 0));
  }, [manualEvents, remoteEvents]);

  const gameOptions = useMemo(
    () => ["All", ...new Set(mergedEvents.map((event) => event.game).filter(Boolean))],
    [mergedEvents],
  );

  const filteredEvents = useMemo(
    () =>
      mergedEvents.filter((event) => activeGame === "All" || String(event.game) === activeGame),
    [activeGame, mergedEvents],
  );

  return (
    <MobileScreen className="pb-[92px]">
      <SeoHead canonicalPath="/events" description="Browse local Winnipeg tournaments, league nights, meetups, and event-linked listings." title="Events" />

      <ScreenHeader subtitle={`${filteredEvents.length} upcoming events`} title="Events" />

      <ScreenSection className="pb-3">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {gameOptions.map((option) => (
            <ChoicePill key={option} active={activeGame === option} onClick={() => setActiveGame(option)}>
              {option}
            </ChoicePill>
          ))}
        </div>
      </ScreenSection>

      <ScreenSection className="pb-3">
        <div
          className="rounded-[18px] px-4 py-4"
          style={{
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
            border: `1px solid ${m.borderStrong}`,
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: "#fca5a5", fontWeight: 700 }}>
            Local calendar
          </p>
          <p className="mt-2 text-[18px] text-white" style={{ fontWeight: 700 }}>
            Track events and nearby inventory
          </p>
          <p className="mt-2 text-[11px] leading-5" style={{ color: m.textSecondary }}>
            Save reminders, mark attendance intent, and jump straight into event-matching listings.
          </p>
        </div>
      </ScreenSection>

      <ScreenSection className="flex-1 pb-2">
        {filteredEvents.length ? (
          <div className="flex flex-col gap-2">
            {filteredEvents.map((event) => {
              const storeSlug = getStoreSlugByName(event.store);
              const relatedListings = activeListings.filter((listing) =>
                matchesEventListing(event, listing, sellers, storeSlug),
              );
              return (
                <EventCard
                  key={String(event.id || `${event.title}-${event.dateStr}`)}
                  attendees={eventAttendanceFeed[event.id] || []}
                  attendanceIntent={eventAttendance[event.id] || ""}
                  event={event}
                  relatedListings={relatedListings}
                  reminderEnabled={eventReminderIds.includes(event.id)}
                  setAttendanceIntent={(intent) => setEventAttendanceIntent(event.id, intent)}
                  toggleReminder={() => toggleEventReminder(event.id)}
                  onViewAttendees={() => setSelectedEvent(event)}
                />
              );
            })}
          </div>
        ) : (
          <EmptyBlock
            description="Try another game lane or wait for the next local calendar refresh."
            title="No events in this view"
          />
        )}
      </ScreenSection>

      <BottomSheet open={Boolean(selectedEvent)} onClose={() => setSelectedEvent(null)}>
        <div className="px-4 pb-6 pt-4">
          <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>
            {selectedEvent?.title || "Responses"}
          </p>
          <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
            See who is going, maybe attending, or trading there.
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
                      {people.map((person) => (
                        <AttendeeRow key={`${selectedEvent?.id}-${intent}-${person.id}`} person={person} />
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
