import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Store,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/ui/EmptyState";
import PageSkeleton from "../components/ui/PageSkeleton";
import { useMarketplace } from "../hooks/useMarketplace";
import { fetchLocalEvents } from "../services/cardDatabase";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

export default function EventsPage() {
  const { manualEvents } = useMarketplace();
  const [remoteEvents, setRemoteEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
        if (cancelled) {
          return;
        }

        setRemoteEvents(data.events || []);
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

  const allEvents = useMemo(() => {
    return [...remoteEvents, ...publishedManualEvents].sort((left, right) => {
      const leftStamp = new Date(`${left.dateStr}T12:00:00`).getTime();
      const rightStamp = new Date(`${right.dateStr}T12:00:00`).getTime();
      return leftStamp - rightStamp;
    });
  }, [publishedManualEvents, remoteEvents]);

  const monthKeys = useMemo(() => {
    const keys = [...new Set(allEvents.map((event) => getMonthKey(event.dateStr)).filter(Boolean))];
    return keys.sort();
  }, [allEvents]);

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

  const eventsForMonth = useMemo(
    () => allEvents.filter((event) => getMonthKey(event.dateStr) === visibleMonth),
    [allEvents, visibleMonth],
  );

  const calendarDays = useMemo(() => {
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
        events: eventsForMonth.filter((event) => event.dateStr === dateStr),
      });
    }

    return grid;
  }, [eventsForMonth, visibleMonth]);

  const selectedMonthIndex = monthKeys.indexOf(visibleMonth);

  if (loading && !allEvents.length) {
    return <PageSkeleton cards={4} titleWidth="w-[30rem]" />;
  }

  return (
    <div className="space-y-7">
      <section className="surface-card p-7">
        <p className="section-kicker">Local Events</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-0.05em] text-ink">
          Winnipeg tournaments, leagues, and local nights
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-steel">
          Browse upcoming Magic, Pokemon, and One Piece events across Winnipeg and jump
          out to the store page when a direct event link is available.
        </p>
      </section>

      <section className="grid gap-7 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="surface-card hidden p-6 md:block">
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
                  className="min-h-[8.5rem] rounded-[20px] border border-slate-200 bg-[#fbf8f1] p-3"
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
                <div key={`empty-${index}`} className="min-h-[8.5rem] rounded-[20px] bg-transparent" />
              ),
            )}
          </div>
        </article>

        <article className="surface-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Upcoming List</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-ink sm:text-3xl">
                {eventsForMonth.length} events in {formatMonthLabel(visibleMonth)}
              </h2>
            </div>
            <div className="flex items-center gap-2">
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
              {loading ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-steel">
                  <LoaderCircle className="animate-spin" size={15} />
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

          {eventsForMonth.length ? (
            <div className="header-chip-scroll mt-5 space-y-4 overflow-y-auto pr-1 md:max-h-[46.25rem]">
              {eventsForMonth.map((event) => (
                <article
                  key={event.id}
                  className="rounded-[24px] border border-slate-200 bg-[#fbf8f1] p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange">
                      {event.game}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {event.source}
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                    {event.title}
                  </h3>
                  <div className="mt-4 grid gap-3 text-sm text-steel">
                    <span className="inline-flex items-center gap-2">
                      <Store size={16} />
                      {event.store}
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
                  {event.sourceUrl ? (
                    <a
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:border-slate-300"
                      href={event.sourceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      View event page
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
                  {event.note ? (
                    <p className="mt-4 text-sm leading-7 text-steel">{event.note}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : loading ? null : (
            <EmptyState
              description="No Magic, Pokemon, or One Piece events were found for this month from the connected store sources."
              title="No events in this month"
            />
          )}
        </article>
      </section>
    </div>
  );
}
