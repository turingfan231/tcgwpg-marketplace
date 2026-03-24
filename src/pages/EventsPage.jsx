import {
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Filter,
  MapPin,
  Store,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";
import InlineSpinner from "../components/ui/InlineSpinner";
import PageSkeleton from "../components/ui/PageSkeleton";
import { getStoreSlugByName } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";
import { fetchLocalEvents } from "../services/cardDatabase";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const rangeOptions = [
  { id: "month", label: "This month" },
  { id: "week", label: "Next 14 days" },
];
const attendanceOptions = [
  { id: "going", label: "Going" },
  { id: "maybe", label: "Maybe" },
  { id: "trading-there", label: "Trading there" },
];

function getMonthKey(dateStr) {
  return String(dateStr || "").slice(0, 7);
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  });
}

function formatLongDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeManualEvent(event) {
  return {
    ...event,
    source: event.source || "Admin override",
  };
}

function normalizeStoreName(value) {
  return String(value || "").trim().toLowerCase();
}

function buildEventKey(event) {
  return `${event.id || "event"}:${event.dateStr || ""}:${event.time || ""}`;
}

function matchesEventListing(event, listing, sellers, storeSlug) {
  const gameMatch =
    String(listing?.game || "").toLowerCase() === String(event?.game || "").toLowerCase();
  if (!gameMatch) {
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

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDate = new Date(`${dateStr}T12:00:00`);
  return Math.round((nextDate.getTime() - today.getTime()) / 86400000);
}

function buildEventIcs(event) {
  const start = new Date(`${event.dateStr}T12:00:00`);
  const timeMatch = String(event.time || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (timeMatch) {
    let hours = Number(timeMatch[1]) % 12;
    const minutes = Number(timeMatch[2]);
    if (String(timeMatch[3]).toUpperCase() === "PM") {
      hours += 12;
    }
    start.setHours(hours, minutes, 0, 0);
  } else {
    start.setHours(18, 0, 0, 0);
  }

  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const toUtcStamp = (value) =>
    value
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  const location = [event.store, event.neighborhood].filter(Boolean).join(" | ");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TCGWPG//Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@tcgwpg`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${String(event.title || "").replace(/\n/g, " ")}`,
    `LOCATION:${location.replace(/\n/g, " ")}`,
    `DESCRIPTION:${String(event.note || event.source || "Local TCG event").replace(/\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadEventCalendar(event) {
  const blob = new Blob([buildEventIcs(event)], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `${String(event.title || "event").replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "event"}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(href);
}

export default function EventsPage() {
  const {
    activeListings,
    eventAttendance,
    eventReminderIds,
    formatCadPrice,
    manualEvents,
    sellers,
    setEventAttendanceIntent,
    toggleEventReminder,
  } = useMarketplace();
  const [remoteEvents, setRemoteEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStore, setSelectedStore] = useState("All stores");
  const [selectedGame, setSelectedGame] = useState("All games");
  const [rangeMode, setRangeMode] = useState("month");
  const publishedManualEvents = useMemo(
    () => manualEvents.filter((event) => event.published).map(normalizeManualEvent),
    [manualEvents],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError("");

      try {
        const data = await fetchLocalEvents();
        if (!cancelled) {
          setRemoteEvents(data.events || []);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message);
          setRemoteEvents([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  const allEvents = useMemo(
    () =>
      [...remoteEvents, ...publishedManualEvents]
        .filter(Boolean)
        .sort(
          (left, right) =>
            new Date(`${left.dateStr}T12:00:00`).getTime() -
            new Date(`${right.dateStr}T12:00:00`).getTime(),
        )
        .filter(
          (event, index, items) =>
            items.findIndex(
              (candidate) =>
                String(candidate.title) === String(event.title) &&
                String(candidate.store) === String(event.store) &&
                String(candidate.dateStr) === String(event.dateStr) &&
                String(candidate.time) === String(event.time),
            ) === index,
        ),
    [publishedManualEvents, remoteEvents],
  );

  const storeOptions = useMemo(
    () => ["All stores", ...new Set(allEvents.map((event) => event.store).filter(Boolean))],
    [allEvents],
  );
  const gameOptions = useMemo(
    () => ["All games", ...new Set(allEvents.map((event) => event.game).filter(Boolean))],
    [allEvents],
  );

  const prefilteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      if (selectedStore !== "All stores" && event.store !== selectedStore) {
        return false;
      }
      if (selectedGame !== "All games" && event.game !== selectedGame) {
        return false;
      }
      return true;
    });
  }, [allEvents, selectedGame, selectedStore]);

  const monthKeys = useMemo(() => {
    const keys = [...new Set(prefilteredEvents.map((event) => getMonthKey(event.dateStr)).filter(Boolean))];
    return keys.sort();
  }, [prefilteredEvents]);

  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    if (!selectedMonth && monthKeys.length) {
      setSelectedMonth(monthKeys[0]);
    }

    if (selectedMonth && monthKeys.length && !monthKeys.includes(selectedMonth)) {
      setSelectedMonth(monthKeys[0]);
    }
  }, [monthKeys, selectedMonth]);

  const visibleMonth = selectedMonth || monthKeys[0] || getMonthKey(new Date().toISOString());

  const eventsForList = useMemo(() => {
    if (rangeMode === "week") {
      return prefilteredEvents.filter((event) => {
        const diff = daysUntil(event.dateStr);
        return diff >= 0 && diff <= 13;
      });
    }

    return prefilteredEvents.filter((event) => getMonthKey(event.dateStr) === visibleMonth);
  }, [prefilteredEvents, rangeMode, visibleMonth]);

  const calendarDays = useMemo(() => {
    if (rangeMode !== "month") {
      return [];
    }

    const [year, month] = visibleMonth.split("-").map(Number);
    const firstOfMonth = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startOffset = firstOfMonth.getDay();
    const grid = [];

    for (let index = 0; index < startOffset; index += 1) {
      grid.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${visibleMonth}-${String(day).padStart(2, "0")}`;
      grid.push({
        dateStr,
        day,
        events: eventsForList.filter((event) => event.dateStr === dateStr),
      });
    }

    return grid;
  }, [eventsForList, rangeMode, visibleMonth]);

  const groupedUpcomingEvents = useMemo(() => {
    if (rangeMode !== "week") {
      return [];
    }

    return eventsForList.reduce((groups, event) => {
      const existing = groups.find((group) => group.dateStr === event.dateStr);
      if (existing) {
        existing.events.push(event);
      } else {
        groups.push({
          dateStr: event.dateStr,
          events: [event],
        });
      }
      return groups;
    }, []);
  }, [eventsForList, rangeMode]);

  const relatedListingsByEvent = useMemo(() => {
    return eventsForList.reduce((accumulator, event) => {
      const storeSlug = getStoreSlugByName(event.store);
      accumulator[buildEventKey(event)] = activeListings
        .filter((listing) => matchesEventListing(event, listing, sellers, storeSlug))
        .sort(
          (left, right) =>
            Number(right.featured) - Number(left.featured) ||
            (right.sortTimestamp || 0) - (left.sortTimestamp || 0),
        )
        .slice(0, 3);
      return accumulator;
    }, {});
  }, [activeListings, eventsForList, sellers]);

  const selectedMonthIndex = monthKeys.indexOf(visibleMonth);

  if (loading && !allEvents.length) {
    return <PageSkeleton cards={4} titleWidth="w-[30rem]" />;
  }

  return (
    <div className="space-y-5 sm:space-y-7">
      <section className="console-shell binder-edge p-4 sm:p-7">
        <p className="section-kicker">Local Events</p>
        <h1 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.05em] text-ink sm:text-[3.25rem]">
          Winnipeg tournaments, leagues, and local nights
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-steel sm:mt-4 sm:text-base sm:leading-8">
          Filter by game, store, and date range, then jump straight to the event page when a direct link is available.
        </p>
      </section>

      <section className="console-panel binder-edge space-y-4 p-4 sm:space-y-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-xs sm:tracking-[0.18em]">
          <Filter size={14} />
          Filters
        </div>

        <div className="header-chip-scroll -mx-1 flex gap-2 overflow-x-auto px-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {storeOptions.map((store) => (
            <button
              key={store}
              className={`shrink-0 rounded-full px-3 py-2 text-[0.82rem] font-semibold transition sm:px-4 sm:text-sm ${
                selectedStore === store
                  ? "bg-navy text-white shadow-soft"
                  : "border border-[rgba(203,220,231,0.92)] bg-white/82 text-steel hover:border-slate-300 hover:text-ink"
              }`}
              type="button"
              onClick={() => setSelectedStore(store)}
            >
              {store}
            </button>
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_auto] sm:gap-4">
          <label className="block">
            <span className="mb-2 block text-[0.82rem] font-semibold text-steel sm:text-sm">Game</span>
            <select
              className="w-full rounded-[18px] border border-[rgba(203,220,231,0.92)] bg-[rgba(249,252,255,0.84)] px-3.5 py-3 text-[0.92rem] outline-none transition focus:border-navy focus:bg-white sm:rounded-[20px] sm:px-4"
              value={selectedGame}
              onChange={(event) => setSelectedGame(event.target.value)}
            >
              {gameOptions.map((game) => (
                <option key={game}>{game}</option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <div className="inline-flex w-full rounded-full bg-[rgba(255,255,255,0.56)] p-1 sm:w-auto">
              {rangeOptions.map((option) => (
                <button
                  key={option.id}
                  className={`flex-1 rounded-full px-3 py-2 text-[0.82rem] font-semibold transition sm:flex-none sm:px-4 sm:text-sm ${
                    rangeMode === option.id ? "bg-white text-ink shadow-sm" : "text-steel"
                  }`}
                  type="button"
                  onClick={() => setRangeMode(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr] sm:gap-7">
        <article className="console-panel hidden p-6 md:block">
          {rangeMode === "month" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="section-kicker">Calendar</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                    {formatMonthLabel(visibleMonth)}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-slate-200 bg-white p-3 text-steel disabled:opacity-40"
                    disabled={selectedMonthIndex <= 0}
                    type="button"
                    onClick={() => setSelectedMonth(monthKeys[selectedMonthIndex - 1] || visibleMonth)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="rounded-full border border-slate-200 bg-white p-3 text-steel disabled:opacity-40"
                    disabled={selectedMonthIndex < 0 || selectedMonthIndex >= monthKeys.length - 1}
                    type="button"
                    onClick={() => setSelectedMonth(monthKeys[selectedMonthIndex + 1] || visibleMonth)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                {weekdayLabels.map((label) => (
                  <div key={label} className="py-2">
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) =>
                  day ? (
                    <div
                      key={day.dateStr}
                      className="min-h-[8.25rem] rounded-[20px] border border-slate-200 bg-[#f7f7f8] p-3"
                    >
                      <div className="text-sm font-semibold text-ink">{day.day}</div>
                      <div className="mt-3 space-y-2">
                        {day.events.slice(0, 3).map((event) =>
                          event.sourceUrl ? (
                            <a
                              key={event.id}
                              className="block rounded-[14px] bg-white px-2 py-2 text-left text-[11px] leading-5 text-steel transition hover:bg-slate-50"
                              href={event.sourceUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <p className="flex items-center gap-1 font-semibold text-ink">
                                {event.game}
                                <ExternalLink size={11} className="text-navy" />
                              </p>
                              <p className="line-clamp-2">{event.title}</p>
                            </a>
                          ) : (
                            <div
                              key={event.id}
                              className="rounded-[14px] bg-white px-2 py-2 text-left text-[11px] leading-5 text-steel"
                            >
                              <p className="font-semibold text-ink">{event.game}</p>
                              <p className="line-clamp-2">{event.title}</p>
                            </div>
                          ),
                        )}
                        {day.events.length > 3 ? (
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy">
                            +{day.events.length - 3} more
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div key={`empty-${index}`} className="min-h-[8.25rem] rounded-[20px] bg-transparent" />
                  ),
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="section-kicker">Next 14 days</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  Upcoming local schedule
                </h2>
              </div>
              <div className="mt-5 space-y-4">
                {groupedUpcomingEvents.length ? (
                  groupedUpcomingEvents.map((group) => (
                    <div
                      key={group.dateStr}
                      className="rounded-[22px] border border-slate-200 bg-[#f7f7f8] p-4"
                    >
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-steel">
                        {formatLongDate(group.dateStr)}
                      </p>
                      <div className="mt-3 space-y-2">
                        {group.events.map((event) => (
                          <div
                            key={event.id}
                            className="rounded-[16px] border border-slate-200 bg-white px-4 py-3"
                          >
                            <p className="font-semibold text-ink">{event.title}</p>
                            <p className="mt-1 text-sm text-steel">
                              {event.store} | {event.time}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-[#faf7f1] px-4 py-6 text-sm text-steel">
                    No matching events in the next 14 days.
                  </div>
                )}
              </div>
            </>
          )}
        </article>

        <article className="console-panel binder-edge p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Upcoming list</p>
              <h2 className="mt-2 font-display text-[1.55rem] font-semibold tracking-[-0.04em] text-ink sm:text-3xl">
                {eventsForList.length} matching event{eventsForList.length === 1 ? "" : "s"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {rangeMode === "month" ? (
                <>
                  <button
                    className="rounded-full border border-slate-200 bg-white p-3 text-steel disabled:opacity-40 md:hidden"
                    disabled={selectedMonthIndex <= 0}
                    type="button"
                    onClick={() => setSelectedMonth(monthKeys[selectedMonthIndex - 1] || visibleMonth)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="rounded-full border border-slate-200 bg-white p-3 text-steel disabled:opacity-40 md:hidden"
                    disabled={selectedMonthIndex < 0 || selectedMonthIndex >= monthKeys.length - 1}
                    type="button"
                    onClick={() => setSelectedMonth(monthKeys[selectedMonthIndex + 1] || visibleMonth)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              ) : null}
              {loading ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-steel">
                  <InlineSpinner size={15} />
                  Loading
                </span>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {eventsForList.length ? (
            <div className="header-chip-scroll mt-4 space-y-3 overflow-y-auto pr-1 md:mt-5 md:space-y-4 md:max-h-[46.25rem]">
              {eventsForList.map((event) => (
                <article
                  key={event.id}
                  className="rounded-[18px] border border-slate-200 bg-[#f7f7f8] p-3 sm:rounded-[24px] sm:p-5"
                >
                  {(() => {
                    const eventKey = buildEventKey(event);
                    const storeSlug = getStoreSlugByName(event.store);
                    const selectedIntent = eventAttendance[eventKey] || "";
                    const reminderEnabled = eventReminderIds.includes(eventKey);
                    const relatedListings = relatedListingsByEvent[eventKey] || [];
                    return (
                      <>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="rounded-full bg-orange/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange sm:px-3 sm:text-xs sm:tracking-[0.18em]">
                      {event.game}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 sm:px-3 sm:text-xs sm:tracking-[0.18em]">
                      {event.store}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 sm:px-3 sm:text-xs sm:tracking-[0.18em]">
                      {event.source}
                    </span>
                  </div>

                  <h3 className="mt-2.5 font-display text-[1.18rem] font-semibold tracking-[-0.03em] text-ink sm:mt-4 sm:text-2xl">
                    {event.title}
                  </h3>
                  <div className="mt-2.5 grid gap-1.5 text-[0.78rem] text-steel sm:mt-4 sm:gap-3 sm:text-sm">
                    <span className="inline-flex items-center gap-2">
                      <Store size={16} />
                      {getStoreSlugByName(event.store) ? (
                        <Link className="font-semibold text-navy hover:underline" to={`/stores/${getStoreSlugByName(event.store)}`}>
                          {event.store}
                        </Link>
                      ) : (
                        event.store
                      )}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={16} />
                      {formatLongDate(event.dateStr)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock3 size={16} />
                      {event.time} | Entry {event.fee}
                    </span>
                    {event.neighborhood ? (
                      <span className="inline-flex items-center gap-2">
                        <MapPin size={16} />
                        {event.neighborhood}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
                    {event.sourceUrl ? (
                      <a
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy transition hover:border-slate-300 sm:px-4 sm:py-2 sm:text-sm sm:tracking-[0]"
                        href={event.sourceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="sm:hidden">Source</span>
                        <span className="hidden sm:inline">View event page</span>
                        <ExternalLink size={14} />
                      </a>
                    ) : null}
                    <button
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-steel transition hover:border-slate-300 hover:text-ink sm:px-4 sm:py-2 sm:text-sm sm:tracking-[0]"
                      type="button"
                      onClick={() => downloadEventCalendar(event)}
                    >
                      <span className="sm:hidden">Calendar</span>
                      <span className="hidden sm:inline">Add to calendar</span>
                      <CalendarDays size={14} />
                    </button>
                  </div>
                  {event.note ? (
                    <p className="mt-2.5 text-[0.78rem] leading-5 text-steel sm:mt-4 sm:text-sm sm:leading-7">{event.note}</p>
                  ) : null}
                  <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
                    <button
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition sm:px-4 sm:py-2 sm:text-sm sm:tracking-[0] ${
                        reminderEnabled
                          ? "border-[rgba(177,29,35,0.24)] bg-[rgba(240,55,55,0.08)] text-navy"
                          : "border-slate-200 bg-white text-steel hover:border-slate-300 hover:text-ink"
                      }`}
                      type="button"
                      onClick={() => void toggleEventReminder(eventKey)}
                    >
                      {reminderEnabled ? "Reminder saved" : "Remind me"}
                      <BellRing size={14} />
                    </button>
                    {attendanceOptions.map((option) => (
                      <button
                        key={option.id}
                        className={`rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition sm:px-4 sm:py-2 sm:text-sm sm:tracking-[0] ${
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
                  <div className="mt-3 rounded-[16px] border border-[rgba(177,29,35,0.12)] bg-white/82 p-3 sm:mt-5 sm:rounded-[20px] sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-xs sm:tracking-[0.18em]">
                        Related listings for this event
                      </p>
                      {storeSlug ? (
                        <Link className="text-[0.82rem] font-semibold text-navy hover:underline sm:text-sm" to={`/stores/${storeSlug}`}>
                          Store page
                        </Link>
                      ) : null}
                    </div>
                    <div className="mt-2.5 grid gap-2 sm:mt-3 sm:gap-3">
                      {relatedListings.length ? (
                        relatedListings.map((listing) => (
                          <Link
                            key={listing.id}
                            className="flex items-center justify-between gap-2.5 rounded-[14px] border border-slate-200 bg-[#f9f7f7] px-3 py-2.5 transition hover:border-[rgba(177,29,35,0.18)] sm:rounded-[18px] sm:px-4 sm:py-3"
                            to={`/listing/${listing.id}`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[0.84rem] font-semibold text-ink sm:text-base">{listing.title}</p>
                              <p className="mt-0.5 text-[0.72rem] text-steel sm:mt-1 sm:text-sm">
                                {listing.neighborhood} | {listing.seller?.publicName || listing.seller?.name}
                              </p>
                            </div>
                            <span className="shrink-0 text-[0.76rem] font-semibold text-navy sm:text-sm">
                              {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
                            </span>
                          </Link>
                        ))
                      ) : (
                        <div className="rounded-[14px] border border-dashed border-slate-200 bg-white/72 px-3 py-3 text-[0.78rem] text-steel sm:px-4 sm:py-4 sm:text-sm">
                          No active listings are tied to this store and game yet.
                        </div>
                      )}
                    </div>
                  </div>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          ) : loading ? null : (
            <EmptyState
              description="No Magic, Pokemon, or One Piece events were found for the current filter combination."
              title="No matching events"
            />
          )}
        </article>
      </section>
    </div>
  );
}

