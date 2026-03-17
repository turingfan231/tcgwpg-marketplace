import {
  Activity,
  CalendarCog,
  ExternalLink,
  Flag,
  ShieldCheck,
  Star,
  Store,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { neighborhoods } from "../data/mockData";
import { useMarketplace } from "../hooks/useMarketplace";

const badgeIds = ["fast", "trusted", "verified", "community", "power", "judge"];
const storeOptions = ["Fusion Gaming", "Galaxy Comics", "A Muse N Games", "Arctic Rift Cards", "Other"];
const gameOptions = ["Magic", "Pokemon", "One Piece"];

function formatEventDate(dateStr) {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function AdminPage() {
  const navigate = useNavigate();
  const {
    adminOverview,
    deleteUserAccount,
    enrichedListings,
    formatCadPrice,
    manualEvents,
    openReportResolutionThread,
    openReports,
    reviewBadgeCatalog,
    toggleListingFeatured,
    toggleListingFlag,
    toggleListingRemoved,
    toggleManualEventPublished,
    toggleUserAdmin,
    toggleUserBadge,
    toggleUserSuspended,
    toggleUserVerified,
    updateListingAdminNote,
    updateReportStatus,
    users,
    addManualEvent,
    removeManualEvent,
  } = useMarketplace();
  const [eventForm, setEventForm] = useState({
    title: "",
    store: "Galaxy Comics",
    sourceUrl: "",
    dateStr: "",
    time: "6:00 PM",
    game: "One Piece",
    fee: "TBD",
    neighborhood: "North Kildonan",
    note: "",
  });
  const [noteDrafts, setNoteDrafts] = useState({});

  const sortedUsers = useMemo(
    () =>
      [...users].sort((left, right) => {
        if (left.role !== right.role) {
          return left.role === "admin" ? -1 : 1;
        }

        return right.activeListingCount - left.activeListingCount;
      }),
    [users],
  );

  const sortedListings = useMemo(
    () => [...enrichedListings].sort((left, right) => right.sortTimestamp - left.sortTimestamp),
    [enrichedListings],
  );

  function handleAddEvent(event) {
    event.preventDefault();
    addManualEvent(eventForm);
    setEventForm({
      title: "",
      store: "Galaxy Comics",
      sourceUrl: "",
      dateStr: "",
      time: "6:00 PM",
      game: "One Piece",
      fee: "TBD",
      neighborhood: "North Kildonan",
      note: "",
    });
  }

  return (
    <div className="space-y-8">
      <section className="surface-card p-7">
        <p className="section-kicker">Admin Console</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-0.05em] text-ink">
          Moderation, analytics, and merchandising controls
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-8 text-steel">
          Manage listings, trust signals, user roles, reports, featured homepage slots,
          and event overrides from one place.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-6">
          <div className="surface-muted p-5">
            <Flag className="text-orange" size={18} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-steel">
              Flagged
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
              {adminOverview.flaggedListings}
            </p>
          </div>
          <div className="surface-muted p-5">
            <Trash2 className="text-rose-600" size={18} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-steel">
              Removed
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
              {adminOverview.removedListings}
            </p>
          </div>
          <div className="surface-muted p-5">
            <Star className="text-amber-500" size={18} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-steel">
              Featured
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
              {adminOverview.featuredListings}
            </p>
          </div>
          <div className="surface-muted p-5">
            <Users className="text-navy" size={18} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-steel">
              Active users
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
              {adminOverview.activeUsers}
            </p>
          </div>
          <div className="surface-muted p-5">
            <Activity className="text-navy" size={18} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-steel">
              Message to sold
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
              {adminOverview.conversionRate}%
            </p>
          </div>
          <div className="surface-muted p-5">
            <CalendarCog className="text-navy" size={18} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-steel">
              Open reports
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
              {adminOverview.openReports}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <section className="surface-card p-6">
            <div className="flex items-center gap-3">
              <Flag className="text-orange" size={20} />
              <div>
                <p className="section-kicker">Reports</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  Moderation queue
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {openReports.length ? (
                openReports.map((report) => (
                  <article
                    key={report.id}
                    className="rounded-[26px] border border-slate-200 bg-[#fbf8f1] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-ink">{report.reason}</p>
                        <p className="mt-2 text-sm text-steel">
                          Reporter: {report.reporter?.name || "Unknown"} | Reported:{" "}
                          {report.reportedUser?.name || "Unknown"}
                        </p>
                        <p className="mt-1 text-sm text-steel">
                          Listing: {report.listing?.title || "Removed listing"}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-steel">{report.details}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                          type="button"
                          onClick={async () => {
                            const result = await openReportResolutionThread(report.id);
                            if (result.ok) {
                              navigate(`/messages/${result.thread.id}`);
                            }
                          }}
                        >
                          Open resolution chat
                        </button>
                        <button
                          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                          type="button"
                          onClick={() => updateReportStatus(report.id, "resolved")}
                        >
                          Mark resolved
                        </button>
                        <button
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                          type="button"
                          onClick={() => updateReportStatus(report.id, "dismissed")}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm leading-7 text-steel">No open reports right now.</p>
              )}
            </div>
          </section>

          <section className="surface-card p-6">
            <div className="flex items-center gap-3">
              <Store className="text-navy" size={20} />
              <div>
                <p className="section-kicker">Listings</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  Moderation and merchandising
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {sortedListings.map((listing) => (
                <article
                  key={listing.id}
                  className="rounded-[26px] border border-slate-200 bg-[#fbf8f1] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                          {listing.title}
                        </h3>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                          {listing.status}
                        </span>
                        {listing.flagged ? (
                          <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                            Flagged
                          </span>
                        ) : null}
                        {listing.featured ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                            Featured
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-steel">
                        {listing.game} | {listing.neighborhood}
                        {listing.postalCode ? ` | ${listing.postalCode}` : ""} | {listing.seller?.name}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                        type="button"
                        onClick={() => toggleListingFlag(listing.id)}
                      >
                        {listing.flagged ? "Unflag" : "Flag"}
                      </button>
                      <button
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                        type="button"
                        onClick={() => toggleListingFeatured(listing.id)}
                      >
                        {listing.featured ? "Unfeature" : "Feature"}
                      </button>
                      <button
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                        type="button"
                        onClick={() => toggleListingRemoved(listing.id)}
                      >
                        {listing.status === "removed" ? "Restore" : "Remove"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <textarea
                      className="min-h-24 rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy"
                      placeholder="Admin notes for this listing"
                      value={noteDrafts[listing.id] ?? listing.adminNotes ?? ""}
                      onChange={(event) =>
                        setNoteDrafts((current) => ({
                          ...current,
                          [listing.id]: event.target.value,
                        }))
                      }
                    />
                    <button
                      className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white"
                      type="button"
                      onClick={() =>
                        updateListingAdminNote(
                          listing.id,
                          noteDrafts[listing.id] ?? listing.adminNotes ?? "",
                        )
                      }
                    >
                      Save note
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="surface-card p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-navy" size={20} />
              <div>
                <p className="section-kicker">Users</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  Roles, badges, and access
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {sortedUsers.map((user) => (
                <article
                  key={user.id}
                  className="rounded-[24px] border border-slate-200 bg-[#fbf8f1] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                          {user.name}
                        </h3>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                          {user.role}
                        </span>
                        {user.accountStatus === "suspended" ? (
                          <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                            Suspended
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-steel">
                        {user.email} | {user.neighborhood}
                        {user.postalCode ? ` | ${user.postalCode}` : ""}
                      </p>
                      <p className="mt-2 text-sm text-steel">
                        {user.activeListingCount} active listings | {user.reviewCount} reviews |{" "}
                        {user.overallRating.toFixed(1)} rating
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                        type="button"
                        onClick={() => toggleUserVerified(user.id)}
                      >
                        {user.verified ? "Remove verification" : "Verify seller"}
                      </button>
                      <button
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                        type="button"
                        onClick={() => toggleUserAdmin(user.id)}
                      >
                        {user.role === "admin" ? "Set seller" : "Set admin"}
                      </button>
                      <button
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                        type="button"
                        onClick={() => toggleUserSuspended(user.id)}
                      >
                        {user.accountStatus === "suspended" ? "Unsuspend" : "Suspend"}
                      </button>
                      <button
                        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                        type="button"
                        onClick={() => void deleteUserAccount(user.id)}
                      >
                        Delete account
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {badgeIds.map((badgeId) => {
                      const active = user.badges.includes(badgeId);
                      return (
                        <button
                          key={`${user.id}-${badgeId}`}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                            active
                              ? "bg-navy text-white"
                              : "border border-slate-200 bg-white text-slate-600"
                          }`}
                          type="button"
                          onClick={() => toggleUserBadge(user.id, badgeId)}
                        >
                          {reviewBadgeCatalog[badgeId]?.label || badgeId}
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="surface-card p-6">
            <div className="flex items-center gap-3">
              <Activity className="text-orange" size={20} />
              <div>
                <p className="section-kicker">Analytics</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  Search and neighborhood trends
                </h2>
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              <div className="rounded-[24px] bg-[#f8f5ee] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                  Flagged listing rate
                </p>
                <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                  {adminOverview.flaggedRate}%
                </p>
              </div>
              <div className="rounded-[24px] bg-[#f8f5ee] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                  Top neighborhoods
                </p>
                <div className="mt-3 space-y-2">
                  {adminOverview.topNeighborhoods.map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="text-steel">{item.label}</span>
                      <span className="font-semibold text-ink">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] bg-[#f8f5ee] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                  Top searches
                </p>
                <div className="mt-3 space-y-2">
                  {adminOverview.topSearches.length ? (
                    adminOverview.topSearches.map((item) => (
                      <div key={item.query} className="flex items-center justify-between text-sm">
                        <span className="text-steel">{item.query}</span>
                        <span className="font-semibold text-ink">{item.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-steel">No search telemetry yet.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="surface-card p-6">
            <div className="flex items-center gap-3">
              <CalendarCog className="text-orange" size={20} />
              <div>
                <p className="section-kicker">Manual events</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  Store overrides and calendar fixes
                </h2>
              </div>
            </div>

            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleAddEvent}>
              <input
                required
                className="rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy"
                placeholder="Event title"
                value={eventForm.title}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, title: event.target.value }))
                }
              />
              <select
                className="rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy"
                value={eventForm.store}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, store: event.target.value }))
                }
              >
                {storeOptions.map((store) => (
                  <option key={store}>{store}</option>
                ))}
              </select>
              <input
                required
                className="rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy"
                type="date"
                value={eventForm.dateStr}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, dateStr: event.target.value }))
                }
              />
              <input
                required
                className="rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy"
                placeholder="6:30 PM"
                value={eventForm.time}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, time: event.target.value }))
                }
              />
              <select
                className="rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy"
                value={eventForm.game}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, game: event.target.value }))
                }
              >
                {gameOptions.map((game) => (
                  <option key={game}>{game}</option>
                ))}
              </select>
              <input
                className="rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy"
                placeholder="Entry fee"
                value={eventForm.fee}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, fee: event.target.value }))
                }
              />
              <select
                className="rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy"
                value={eventForm.neighborhood}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, neighborhood: event.target.value }))
                }
              >
                {neighborhoods.slice(1).map((neighborhood) => (
                  <option key={neighborhood}>{neighborhood}</option>
                ))}
              </select>
              <input
                className="rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy"
                placeholder="Source URL"
                value={eventForm.sourceUrl}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, sourceUrl: event.target.value }))
                }
              />
              <textarea
                className="min-h-24 rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy md:col-span-2"
                placeholder="Why this override exists"
                value={eventForm.note}
                onChange={(event) =>
                  setEventForm((current) => ({ ...current, note: event.target.value }))
                }
              />
              <div className="md:col-span-2">
                <button
                  className="rounded-full bg-orange px-5 py-3 text-sm font-semibold text-white"
                  type="submit"
                >
                  Add manual event
                </button>
              </div>
            </form>

            <div className="mt-6 space-y-3">
              {manualEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      {event.title} | {event.store}
                    </p>
                    <p className="mt-1 text-sm text-steel">
                      {formatEventDate(event.dateStr)} | {event.time} | {event.game} | {event.fee}
                    </p>
                    {event.sourceUrl ? (
                      <a
                        className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:underline"
                        href={event.sourceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Event link
                        <ExternalLink size={14} />
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                      type="button"
                      onClick={() => toggleManualEventPublished(event.id)}
                    >
                      {event.published ? "Hide" : "Publish"}
                    </button>
                    <button
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                      type="button"
                      onClick={() => removeManualEvent(event.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
