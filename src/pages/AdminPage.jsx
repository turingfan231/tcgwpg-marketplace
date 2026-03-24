import {
  Activity,
  Bug,
  CalendarCog,
  ExternalLink,
  Flag,
  Home,
  ShieldCheck,
  SwatchBook,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { neighborhoods } from "../data/mockData";
import { themePresets } from "../data/themePresets";
import { useMarketplace } from "../hooks/useMarketplace";
import { fetchLocalEvents } from "../services/cardDatabase";

const badgeIds = ["fast", "trusted", "verified", "community", "power", "judge", "beta"];
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

function SectionButton({ active, count, label, onClick }) {
  return (
    <button
      className={`flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition ${
        active
          ? "border-navy bg-navy text-white shadow-soft"
          : "border-slate-200 bg-white text-steel hover:border-slate-300 hover:text-ink"
      }`}
      type="button"
      onClick={onClick}
    >
      <span className="text-sm font-semibold uppercase tracking-[0.18em]">{label}</span>
      {count !== undefined ? (
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function EmptyAdminState({ children }) {
  return <p className="text-sm leading-7 text-steel">{children}</p>;
}

function ThemePreviewCard({ active, onApply, preset }) {
  return (
    <button
      className={`rounded-[26px] border p-4 text-left transition ${
        active
          ? "border-navy bg-white shadow-soft"
          : "border-slate-200 bg-white/90 hover:border-slate-300 hover:shadow-soft"
      }`}
      style={{
        "--theme-primary": preset.primary,
        "--theme-primary-rgb": preset.primaryRgb,
        "--theme-accent": preset.accent,
        "--theme-accent-rgb": preset.accentRgb,
      }}
      type="button"
      onClick={onApply}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-semibold tracking-[-0.03em] text-ink">
            {preset.name}
          </p>
          <p className="mt-2 text-sm leading-6 text-steel">{preset.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full bg-navy" />
          <span className="h-4 w-4 rounded-full bg-orange" />
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-slate-200 bg-[#f7f7f8] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="brand-pill">
            <span className="brand-pill-mark">TCG</span>
            <span className="brand-pill-tag">WPG</span>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-steel">
              Search
            </span>
            <span className="rounded-full bg-orange px-3 py-1 text-[11px] font-semibold text-white">
              Sell
            </span>
          </div>
        </div>
        <div className="mt-4 rounded-[18px] bg-navy/10 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy/65">
            Hero preview
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
            Local TCG hub
          </p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-navy px-3 py-1 text-[11px] font-semibold text-white">
              Primary
            </span>
            <span className="rounded-full bg-orange/15 px-3 py-1 text-[11px] font-semibold text-orange">
              Accent
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
          {active ? "Active theme" : "Apply theme"}
        </p>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
            active ? "bg-navy text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {active ? "Live" : "Preview"}
        </span>
      </div>
    </button>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const {
    adminOverview,
    adminBugReports,
    deleteUserAccount,
    enrichedListings,
    formatCadPrice,
    manualEvents,
    openReportResolutionThread,
    openReports,
    reviewBadgeCatalog,
    siteSettings,
    toggleListingFeatured,
    toggleListingFlag,
    toggleListingRemoved,
    toggleManualEventPublished,
    toggleUserAdmin,
    toggleUserBadge,
    toggleUserSuspended,
    toggleUserVerified,
    updateHomeHeroSettings,
    updateStorefrontSettings,
    updateBugReport,
    updateListingAdminNote,
    updateReportStatus,
    users,
    addManualEvent,
    removeManualEvent,
  } = useMarketplace();
  const [activeSection, setActiveSection] = useState("overview");
  const [userSearch, setUserSearch] = useState("");
  const [listingSearch, setListingSearch] = useState("");
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
  const [bugNoteDrafts, setBugNoteDrafts] = useState({});
  const [listingFilter, setListingFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [remoteHeroEvents, setRemoteHeroEvents] = useState([]);
  const [heroSettingsDraft, setHeroSettingsDraft] = useState(
    siteSettings?.homeHero || {
      featuredListingId: null,
      pinnedEventId: null,
      spotlightGameSlug: null,
    },
  );
  const [sectionSettingsDraft, setSectionSettingsDraft] = useState(
    siteSettings?.homeSections || {},
  );

  useEffect(() => {
    let cancelled = false;

    async function loadHeroEvents() {
      try {
        const data = await fetchLocalEvents();
        if (!cancelled) {
          setRemoteHeroEvents(Array.isArray(data?.events) ? data.events.filter(Boolean) : []);
        }
      } catch {
        if (!cancelled) {
          setRemoteHeroEvents([]);
        }
      }
    }

    void loadHeroEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setHeroSettingsDraft(
      siteSettings?.homeHero || {
        featuredListingId: null,
        pinnedEventId: null,
        spotlightGameSlug: null,
      },
    );
  }, [siteSettings]);

  useEffect(() => {
    setSectionSettingsDraft(siteSettings?.homeSections || {});
  }, [siteSettings]);

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
  const heroEventChoices = useMemo(
    () =>
      [...remoteHeroEvents, ...manualEvents]
        .filter(Boolean)
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
        .sort((left, right) => new Date(left.dateStr).getTime() - new Date(right.dateStr).getTime()),
    [manualEvents, remoteHeroEvents],
  );

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return sortedUsers.filter((user) => {
      if (
        userFilter === "admins" &&
        String(user.role || "").toLowerCase() !== "admin"
      ) {
        return false;
      }

      if (userFilter === "suspended" && user.accountStatus !== "suspended") {
        return false;
      }

      if (userFilter === "verified" && !user.verified) {
        return false;
      }

      if (userFilter === "beta" && !user.badges.includes("beta")) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [user.name, user.username, user.email, user.neighborhood, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [sortedUsers, userFilter, userSearch]);

  const filteredListings = useMemo(() => {
    const query = listingSearch.trim().toLowerCase();
    return sortedListings.filter((listing) => {
      if (listingFilter === "flagged" && !listing.flagged) {
        return false;
      }

      if (listingFilter === "featured" && !listing.featured) {
        return false;
      }

      if (listingFilter === "removed" && listing.status !== "removed") {
        return false;
      }

      if (listingFilter === "active" && listing.status !== "active") {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        listing.title,
        listing.game,
        listing.neighborhood,
        listing.seller?.name,
        listing.seller?.publicName,
        listing.type,
        listing.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [listingFilter, listingSearch, sortedListings]);

  const sectionButtons = [
    { id: "overview", label: "Overview" },
    { id: "moderation", label: "Moderation", count: openReports.length + adminBugReports.length },
    { id: "listings", label: "Listings", count: sortedListings.length },
    { id: "users", label: "Users", count: sortedUsers.length },
    { id: "events", label: "Events", count: manualEvents.length },
    { id: "theme", label: "Theme Lab", count: themePresets.length },
    { id: "storefront", label: "Storefront" },
  ];

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
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="section-kicker">Admin Console</p>
            <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-0.05em] text-ink">
              Admin controls
            </h1>
            <p className="mt-4 max-w-4xl text-base leading-8 text-steel">
              Moderate listings, handle reports, manage user trust, and keep the local calendar
              clean without digging through one long page.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px] xl:max-w-[520px]">
            {sectionButtons.map((section) => (
              <SectionButton
                key={section.id}
                active={activeSection === section.id}
                count={section.count}
                label={section.label}
                onClick={() => setActiveSection(section.id)}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="surface-muted p-5">
            <Flag className="text-orange" size={18} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-steel">
              Flagged listings
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
              {adminOverview.flaggedListings}
            </p>
          </div>
          <div className="surface-muted p-5">
            <Trash2 className="text-rose-600" size={18} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-steel">
              Removed listings
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
              {adminOverview.removedListings}
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
        </div>
      </section>

      {activeSection === "overview" ? (
        <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <section className="surface-card p-6">
              <div className="flex items-center gap-3">
                <Flag className="text-orange" size={20} />
                <div>
                  <p className="section-kicker">Queue snapshot</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                    What needs attention now
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] bg-[#f2f3f5] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Open reports
                  </p>
                  <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                    {adminOverview.openReports}
                  </p>
                  <p className="mt-3 text-sm text-steel">
                    Buyer, seller, and listing disputes waiting for review.
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#f2f3f5] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Open beta bugs
                  </p>
                  <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                    {adminOverview.openBugReports}
                  </p>
                  <p className="mt-3 text-sm text-steel">
                    Tester issues reported from the live beta build.
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#f2f3f5] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Featured listings
                  </p>
                  <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                    {adminOverview.featuredListings}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#f2f3f5] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Manual events
                  </p>
                  <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                    {manualEvents.length}
                  </p>
                </div>
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
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[24px] bg-[#f2f3f5] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Flagged listing rate
                  </p>
                  <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                    {adminOverview.flaggedRate}%
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#f2f3f5] p-5">
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
                <div className="rounded-[24px] bg-[#f2f3f5] p-5">
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
          </div>

          <section className="surface-card p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-navy" size={20} />
              <div>
                <p className="section-kicker">Quick actions</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  Fast admin jumps
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <button className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300" type="button" onClick={() => setActiveSection("moderation")}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">Moderation</p>
                <p className="mt-2 font-semibold text-ink">Open reports and bug triage</p>
              </button>
              <button className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300" type="button" onClick={() => setActiveSection("listings")}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">Listings</p>
                <p className="mt-2 font-semibold text-ink">Merchandising and removals</p>
              </button>
              <button className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300" type="button" onClick={() => setActiveSection("users")}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">Users</p>
                <p className="mt-2 font-semibold text-ink">Badges, roles, and access</p>
              </button>
              <button className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300" type="button" onClick={() => setActiveSection("events")}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">Events</p>
                <p className="mt-2 font-semibold text-ink">Calendar overrides</p>
              </button>
              <button className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300" type="button" onClick={() => setActiveSection("storefront")}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">Storefront</p>
                <p className="mt-2 font-semibold text-ink">Hero controls and homepage curation</p>
              </button>
            </div>
          </section>
        </section>
      ) : null}

      {activeSection === "moderation" ? (
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
                    className="rounded-[26px] border border-slate-200 bg-[#f7f7f8] p-5"
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
                <EmptyAdminState>No open reports right now.</EmptyAdminState>
              )}
            </div>
          </section>

          <section className="surface-card p-6">
            <div className="flex items-center gap-3">
              <Bug className="text-orange" size={20} />
              <div>
                <p className="section-kicker">Beta bugs</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  Bug tracker triage
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {adminBugReports.length ? (
                adminBugReports.map((report) => (
                  <article
                    key={report.id}
                    className="rounded-[26px] border border-slate-200 bg-[#f7f7f8] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                            {report.title}
                          </h3>
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                            {report.status}
                          </span>
                          <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                            {report.severity}
                          </span>
                          <span className="rounded-full bg-navy/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-navy">
                            {report.area}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-steel">
                          Reporter: {report.reporter?.name || "Unknown"}
                          {report.pagePath ? ` | Page: ${report.pagePath}` : ""}
                          {report.environmentLabel ? ` | Env: ${report.environmentLabel}` : ""}
                        </p>
                        <div className="mt-3 grid gap-3 text-sm leading-7 text-steel lg:grid-cols-2">
                          <div>
                            <p className="font-semibold text-ink">Actual behavior</p>
                            <p>{report.actualBehavior}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-ink">Expected behavior</p>
                            <p>{report.expectedBehavior || "Not provided."}</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-ink">Reproduction steps</p>
                          <p className="mt-1 text-sm leading-7 text-steel">
                            {report.reproductionSteps}
                          </p>
                        </div>
                        {report.screenshotUrl ? (
                          <a
                            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-navy"
                            href={report.screenshotUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Screenshot
                            <ExternalLink size={14} />
                          </a>
                        ) : null}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        <select
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                          value={report.status}
                          onChange={(event) =>
                            updateBugReport(report.id, { status: event.target.value })
                          }
                        >
                          <option value="open">Open</option>
                          <option value="triaged">Triaged</option>
                          <option value="in-progress">In progress</option>
                          <option value="fixed">Fixed</option>
                          <option value="closed">Closed</option>
                        </select>
                        <select
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                          value={report.severity}
                          onChange={(event) =>
                            updateBugReport(report.id, { severity: event.target.value })
                          }
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                      <textarea
                        className="min-h-24 rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy"
                        placeholder="Admin notes, reproduction findings, workaround, or release note"
                        value={bugNoteDrafts[report.id] ?? report.adminNotes ?? ""}
                        onChange={(event) =>
                          setBugNoteDrafts((current) => ({
                            ...current,
                            [report.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white"
                        type="button"
                        onClick={() =>
                          updateBugReport(report.id, {
                            adminNotes: bugNoteDrafts[report.id] ?? report.adminNotes ?? "",
                          })
                        }
                      >
                        Save bug note
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyAdminState>No beta bug reports yet.</EmptyAdminState>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {activeSection === "listings" ? (
        <section className="surface-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Trash2 className="text-navy" size={20} />
                <div>
                  <p className="section-kicker">Listings</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                    Moderation and merchandising
                  </h2>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-steel">
                Search the live listing pool, then flag, feature, remove, restore, or leave internal
                notes without jumping around the app.
              </p>
            </div>

            <input
              className="w-full rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 text-sm outline-none transition focus:border-navy lg:max-w-sm"
              placeholder="Search listings, sellers, neighborhoods..."
              value={listingSearch}
              onChange={(event) => setListingSearch(event.target.value)}
            />
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All" },
                { id: "flagged", label: "Flagged" },
                { id: "featured", label: "Featured" },
                { id: "removed", label: "Removed" },
                { id: "active", label: "Active" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    listingFilter === filter.id
                      ? "bg-navy text-white"
                      : "border border-slate-200 bg-white text-steel hover:border-slate-300 hover:text-ink"
                  }`}
                  type="button"
                  onClick={() => setListingFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
            {filteredListings.length ? (
              filteredListings.map((listing) => (
                <article
                  key={listing.id}
                  className="rounded-[26px] border border-slate-200 bg-[#f7f7f8] p-5"
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
                        {listing.postalCode ? ` | ${listing.postalCode}` : ""} |{" "}
                        {listing.seller?.name}
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
              ))
            ) : (
              <EmptyAdminState>No listings match this search.</EmptyAdminState>
            )}
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === "users" ? (
        <section className="surface-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-navy" size={20} />
                <div>
                  <p className="section-kicker">Users</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                    Roles, badges, and access
                  </h2>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-steel">
                Search accounts, promote admins, verify sellers, grant beta access, or suspend bad
                actors from one queue.
              </p>
            </div>

            <input
              className="w-full rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 text-sm outline-none transition focus:border-navy lg:max-w-sm"
              placeholder="Search users, email, role, neighborhood..."
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
            />
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All" },
                { id: "admins", label: "Admins" },
                { id: "suspended", label: "Suspended" },
                { id: "verified", label: "Verified" },
                { id: "beta", label: "Beta testers" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    userFilter === filter.id
                      ? "bg-navy text-white"
                      : "border border-slate-200 bg-white text-steel hover:border-slate-300 hover:text-ink"
                  }`}
                  type="button"
                  onClick={() => setUserFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
            {filteredUsers.length ? (
              filteredUsers.map((user) => (
                <article
                  key={user.id}
                  className="rounded-[24px] border border-slate-200 bg-[#f7f7f8] p-5"
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
              ))
            ) : (
              <EmptyAdminState>No users match this search.</EmptyAdminState>
            )}
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === "events" ? (
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
              className="rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy"
              placeholder="Event title"
              value={eventForm.title}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, title: event.target.value }))
              }
            />
            <select
              className="rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy"
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
              className="rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy"
              type="date"
              value={eventForm.dateStr}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, dateStr: event.target.value }))
              }
            />
            <input
              required
              className="rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy"
              placeholder="6:30 PM"
              value={eventForm.time}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, time: event.target.value }))
              }
            />
            <select
              className="rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy"
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
              className="rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy"
              placeholder="Entry fee"
              value={eventForm.fee}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, fee: event.target.value }))
              }
            />
            <select
              className="rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy"
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
              className="rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy"
              placeholder="Source URL"
              value={eventForm.sourceUrl}
              onChange={(event) =>
                setEventForm((current) => ({ ...current, sourceUrl: event.target.value }))
              }
            />
            <textarea
              className="min-h-24 rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy md:col-span-2"
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
            {manualEvents.length ? (
              manualEvents.map((event) => (
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
              ))
            ) : (
              <EmptyAdminState>No manual event overrides yet.</EmptyAdminState>
            )}
          </div>
        </section>
      ) : null}

      {activeSection === "theme" ? (
        <section className="surface-card p-6">
          <div className="flex items-center gap-3">
            <SwatchBook className="text-orange" size={20} />
            <div>
              <p className="section-kicker">Theme Lab</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                Site-wide color schemes
              </h2>
            </div>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-steel">
            Compare live-ready presets for the full app. Clicking a card applies that palette
            immediately through the shared storefront settings, so the header, buttons, cards,
            and hero surfaces all update together.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {themePresets.map((preset) => (
              <ThemePreviewCard
                key={preset.id}
                active={siteSettings?.themePreset === preset.id}
                preset={preset}
                onApply={() => void updateStorefrontSettings({ themePreset: preset.id })}
              />
            ))}
          </div>
        </section>
      ) : null}

      {activeSection === "storefront" ? (
        <section className="surface-card p-6">
          <div className="flex items-center gap-3">
            <Home className="text-orange" size={20} />
            <div>
              <p className="section-kicker">Storefront CMS</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                Homepage controls
              </h2>
            </div>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-steel">
            Pick the featured listing, pin a specific event, choose the spotlight game, and toggle homepage lanes on or off without touching code.
          </p>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-steel">Featured listing</span>
              <select
                className="w-full rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy"
                value={heroSettingsDraft.featuredListingId || ""}
                onChange={(event) =>
                  setHeroSettingsDraft((current) => ({
                    ...current,
                    featuredListingId: event.target.value || null,
                  }))
                }
              >
                <option value="">Auto-pick featured listing</option>
                {sortedListings
                  .filter((listing) => listing.status === "active")
                  .map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.title} | {listing.game}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-steel">Pinned event</span>
              <select
                className="w-full rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy"
                value={heroSettingsDraft.pinnedEventId || ""}
                onChange={(event) =>
                  setHeroSettingsDraft((current) => ({
                    ...current,
                    pinnedEventId: event.target.value || null,
                  }))
                }
              >
                <option value="">Auto-pick next event</option>
                {heroEventChoices.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} | {event.store} | {formatEventDate(event.dateStr)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-steel">Spotlight game</span>
              <select
                className="w-full rounded-[20px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy"
                value={heroSettingsDraft.spotlightGameSlug || ""}
                onChange={(event) =>
                  setHeroSettingsDraft((current) => ({
                    ...current,
                    spotlightGameSlug: event.target.value || null,
                  }))
                }
              >
                <option value="">Auto-pick busiest channel</option>
                <option value="pokemon">Pokemon</option>
                <option value="magic">Magic</option>
                <option value="one-piece">One Piece</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white"
              type="button"
              onClick={() => void updateHomeHeroSettings(heroSettingsDraft)}
            >
              Save storefront hero
            </button>
            <button
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-steel"
              type="button"
              onClick={() => {
                const nextSettings = {
                  featuredListingId: null,
                  pinnedEventId: null,
                  spotlightGameSlug: null,
                };
                setHeroSettingsDraft(nextSettings);
                void updateHomeHeroSettings(nextSettings);
              }}
            >
              Reset to automatic
            </button>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-8">
            <div className="flex items-center gap-3">
              <Home className="text-navy" size={18} />
              <div>
                <p className="section-kicker">Section visibility</p>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
                  Homepage lanes
                </h3>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                ["showHero", "Hero banner"],
                ["showPromo", "Secondary promo"],
                ["showBestSellers", "Best sellers"],
                ["showFreshFeed", "Fresh feed"],
                ["showFollowedFeed", "Followed sellers"],
                ["showGameShelves", "Game shelves"],
                ["showEvents", "Events lane"],
                ["showTrustedSellers", "Trusted sellers"],
                ["showStores", "Store profiles"],
              ].map(([key, label]) => {
                const active = sectionSettingsDraft[key] !== false;
                return (
                  <button
                    key={key}
                    className={`rounded-[22px] border px-4 py-4 text-left transition ${
                      active
                        ? "border-navy bg-navy text-white shadow-soft"
                        : "border-slate-200 bg-white text-steel hover:border-slate-300 hover:text-ink"
                    }`}
                    type="button"
                    onClick={() =>
                      setSectionSettingsDraft((current) => ({
                        ...current,
                        [key]: !active,
                      }))
                    }
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                      {active ? "Visible" : "Hidden"}
                    </p>
                    <p className="mt-2 font-semibold">{label}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white"
                type="button"
                onClick={() => void updateStorefrontSettings({ homeSections: sectionSettingsDraft })}
              >
                Save section visibility
              </button>
              <button
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-steel"
                type="button"
                onClick={() =>
                  setSectionSettingsDraft({
                    showHero: true,
                    showPromo: true,
                    showBestSellers: true,
                    showFreshFeed: true,
                    showFollowedFeed: true,
                    showGameShelves: true,
                    showEvents: true,
                    showTrustedSellers: true,
                    showStores: true,
                  })
                }
              >
                Reset sections
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}


