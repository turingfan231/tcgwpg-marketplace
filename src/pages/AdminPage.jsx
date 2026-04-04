import {
  AlertTriangle,
  BadgeCheck,
  CalendarPlus,
  Eye,
  Flag,
  Home,
  ShieldCheck,
  ShieldX,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import UserAvatar from "../components/shared/UserAvatar";
import { adminRoadmap } from "../data/adminRoadmap";
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
  TextArea,
  TextField,
} from "../mobile/primitives";

const ADMIN_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "reports", label: "Reports" },
  { id: "listings", label: "Listings" },
  { id: "users", label: "Users" },
  { id: "events", label: "Events" },
  { id: "storefront", label: "Storefront" },
  { id: "audit", label: "Audit" },
];

const BADGE_IDS = ["fast", "trusted", "verified", "community", "power", "judge", "beta"];
const STORE_OPTIONS = ["Fusion Gaming", "Galaxy Comics", "A Muse N Games", "Arctic Rift Cards", "Other"];
const GAME_OPTIONS = ["Magic", "Pokemon", "One Piece", "Dragon Ball Super Fusion World", "Union Arena"];

function AdminMetric({ label, value }) {
  return (
    <div className="rounded-[18px] px-4 py-3" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
      <p className="text-[9px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
        {label}
      </p>
      <p className="mt-1 text-[20px] text-white" style={{ fontWeight: 700 }}>
        {value}
      </p>
    </div>
  );
}

function SmallToggle({ active, children, onClick, tone = "default" }) {
  const activeStyle =
    tone === "danger"
      ? { background: "rgba(239,68,68,0.14)", color: "#fca5a5" }
      : tone === "success"
        ? { background: "rgba(52,211,153,0.14)", color: "#86efac" }
        : { background: "rgba(239,68,68,0.12)", color: "#fca5a5" };

  return (
    <button
      className="inline-flex h-8 items-center justify-center rounded-[12px] px-3 text-[10px]"
      style={
        active
          ? { ...activeStyle, fontWeight: 700 }
          : { background: m.surfaceStrong, color: m.textSecondary, fontWeight: 600 }
      }
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const {
    adminAuditLog,
    adminBugReports,
    adminOverview,
    addManualEvent,
    deleteUserAccount,
    enrichedListings,
    isViewingAs,
    manualEvents,
    removeManualEvent,
    openReportResolutionThread,
    openReports,
    reviewBadgeCatalog,
    sellerMap,
    siteSettings,
    startViewAs,
    stopViewAs,
    toggleListingFeatured,
    toggleListingFlag,
    toggleListingRemoved,
    toggleManualEventPublished,
    toggleUserAdmin,
    toggleUserBadge,
    toggleUserSuspended,
    toggleUserVerified,
    updateBugReport,
    updateHomeHeroSettings,
    updateListingAdminNote,
    updateReportStatus,
    updateStorefrontSettings,
    users,
  } = useMarketplace();

  const [activeSection, setActiveSection] = useState("overview");
  const [listingQuery, setListingQuery] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState(null);
  const [listingNote, setListingNote] = useState("");
  const [selectedBugReport, setSelectedBugReport] = useState(null);
  const [bugNotes, setBugNotes] = useState("");
  const [heroDraft, setHeroDraft] = useState(siteSettings?.homeHero || {});
  const [sectionDraft, setSectionDraft] = useState(siteSettings?.homeSections || {});
  const [eventForm, setEventForm] = useState({
    title: "",
    store: "Galaxy Comics",
    sourceUrl: "",
    dateStr: "",
    time: "6:30 PM",
    game: "Pokemon",
    fee: "TBD",
    neighborhood: "Winnipeg",
    note: "",
  });

  useEffect(() => {
    setHeroDraft(siteSettings?.homeHero || {});
    setSectionDraft(siteSettings?.homeSections || {});
  }, [siteSettings]);

  const filteredListings = useMemo(() => {
    const query = listingQuery.trim().toLowerCase();
    return [...enrichedListings]
      .sort((left, right) => Number(right.sortTimestamp || 0) - Number(left.sortTimestamp || 0))
      .filter((listing) =>
        !query
          ? true
          : [listing.title, listing.game, listing.neighborhood, listing.seller?.publicName]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(query),
      );
  }, [enrichedListings, listingQuery]);

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    return [...users]
      .sort((left, right) => Number(right.completedDeals || 0) - Number(left.completedDeals || 0))
      .filter((user) =>
        !query
          ? true
          : [user.publicName, user.name, user.username, user.email, user.neighborhood]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(query),
      );
  }, [userQuery, users]);

  const listingChoices = useMemo(
    () => enrichedListings.filter((listing) => listing.status === "active").slice(0, 25),
    [enrichedListings],
  );

  async function handleOpenResolutionThread(report) {
    const result = await openReportResolutionThread(report.id);
    if (result?.ok && result.thread) {
      navigate(`/inbox/${result.thread.id}`);
    }
  }

  async function handleSaveListingNote() {
    if (!selectedListing) {
      return;
    }
    await updateListingAdminNote(selectedListing.id, listingNote);
    setSelectedListing(null);
    setListingNote("");
  }

  async function handleSaveBugNotes() {
    if (!selectedBugReport) {
      return;
    }
    await updateBugReport(selectedBugReport.id, { adminNotes: bugNotes });
    setSelectedBugReport(null);
    setBugNotes("");
  }

  async function handleAddEvent(event) {
    event.preventDefault();
    await addManualEvent(eventForm);
    setEventForm({
      title: "",
      store: "Galaxy Comics",
      sourceUrl: "",
      dateStr: "",
      time: "6:30 PM",
      game: "Pokemon",
      fee: "TBD",
      neighborhood: "Winnipeg",
      note: "",
    });
  }

  return (
    <MobileScreen className="pb-[92px]">
      <SeoHead canonicalPath="/admin" description="Moderation, user control, event management, and storefront settings for TCG WPG." title="Admin" />

      <ScreenHeader subtitle="Operations console" title="Admin" />

      <ScreenSection className="pb-3">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {ADMIN_SECTIONS.map((section) => (
            <ChoicePill key={section.id} active={activeSection === section.id} onClick={() => setActiveSection(section.id)}>
              {section.label}
            </ChoicePill>
          ))}
        </div>
      </ScreenSection>

      {activeSection === "overview" ? (
        <>
          <ScreenSection className="grid grid-cols-2 gap-2 pb-3">
            <AdminMetric label="Active users" value={adminOverview.activeUsers} />
            <AdminMetric label="Open reports" value={adminOverview.openReports} />
            <AdminMetric label="Flagged" value={adminOverview.flaggedListings} />
            <AdminMetric label="Open bugs" value={adminOverview.openBugReports} />
          </ScreenSection>

          <ScreenSection className="pb-3">
            <div className="rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
              <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                Current focus
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {adminRoadmap.currentFocus.map((item) => (
                  <div key={item.id} className="rounded-[14px] px-3 py-3" style={{ background: m.surfaceStrong }}>
                    <p className="text-[11px] text-white" style={{ fontWeight: 700 }}>
                      {item.title}
                    </p>
                    <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </ScreenSection>
        </>
      ) : null}

      {activeSection === "reports" ? (
        <ScreenSection className="pb-2">
          <div className="flex flex-col gap-2">
            {openReports.map((report) => (
              <article key={report.id} className="rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] text-white" style={{ fontWeight: 700 }}>
                      {report.reason}
                    </p>
                    <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                      {report.listing?.title || "Listing"} · {report.reporter?.publicName || report.reporter?.name || "Reporter"}
                    </p>
                    <p className="mt-2 text-[11px] leading-5" style={{ color: m.textSecondary }}>
                      {report.details || "No details supplied."}
                    </p>
                  </div>
                  <span className="rounded-full px-2 py-[4px] text-[8px]" style={{ background: m.surfaceStrong, color: m.textSecondary, fontWeight: 700 }}>
                    {report.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <SmallToggle active={report.status === "open"} onClick={() => updateReportStatus(report.id, "open")}>
                    Open
                  </SmallToggle>
                  <SmallToggle active={report.status === "under-review"} onClick={() => updateReportStatus(report.id, "under-review")}>
                    Review
                  </SmallToggle>
                  <SmallToggle active={report.status === "resolved"} onClick={() => updateReportStatus(report.id, "resolved")} tone="success">
                    Resolve
                  </SmallToggle>
                  <SmallToggle active={false} onClick={() => handleOpenResolutionThread(report)}>
                    Thread
                  </SmallToggle>
                </div>
              </article>
            ))}

            {adminBugReports.map((report) => (
              <article key={report.id} className="rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] text-white" style={{ fontWeight: 700 }}>
                      {report.title}
                    </p>
                    <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                      {report.area} · {report.pagePath || "unknown route"}
                    </p>
                    <p className="mt-2 text-[11px] leading-5" style={{ color: m.textSecondary }}>
                      {report.actualBehavior}
                    </p>
                  </div>
                  <span className="rounded-full px-2 py-[4px] text-[8px]" style={{ background: "rgba(239,68,68,0.14)", color: "#fca5a5", fontWeight: 700 }}>
                    {report.severity}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["open", "triaged", "in-progress", "fixed", "closed"].map((status) => (
                    <SmallToggle
                      key={`${report.id}-${status}`}
                      active={report.status === status}
                      onClick={() => updateBugReport(report.id, { status })}
                      tone={status === "fixed" || status === "closed" ? "success" : "default"}
                    >
                      {status}
                    </SmallToggle>
                  ))}
                  <SmallToggle
                    active={false}
                    onClick={() => {
                      setSelectedBugReport(report);
                      setBugNotes(report.adminNotes || "");
                    }}
                  >
                    Notes
                  </SmallToggle>
                </div>
              </article>
            ))}

            {!openReports.length && !adminBugReports.length ? (
              <EmptyBlock description="Open listing reports and bug reports will show here." title="No moderation queue right now" />
            ) : null}
          </div>
        </ScreenSection>
      ) : null}

      {activeSection === "listings" ? (
        <>
          <ScreenSection className="pb-3">
            <TextField onChange={setListingQuery} placeholder="Search listings, seller, neighborhood..." value={listingQuery} />
          </ScreenSection>
          <ScreenSection className="pb-2">
            <div className="flex flex-col gap-2">
              {filteredListings.slice(0, 20).map((listing) => (
                <article key={listing.id} className="rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
                  <p className="text-[13px] text-white" style={{ fontWeight: 700 }}>
                    {listing.title}
                  </p>
                  <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                    {[listing.game, listing.neighborhood, listing.seller?.publicName || listing.seller?.name].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SmallToggle active={listing.flagged} onClick={() => toggleListingFlag(listing.id)}>
                      <Flag size={12} />
                      Flag
                    </SmallToggle>
                    <SmallToggle active={listing.featured} onClick={() => toggleListingFeatured(listing.id)}>
                      <Star size={12} />
                      Featured
                    </SmallToggle>
                    <SmallToggle active={listing.status === "removed"} onClick={() => toggleListingRemoved(listing.id)} tone="danger">
                      <ShieldX size={12} />
                      Removed
                    </SmallToggle>
                    <SmallToggle
                      active={false}
                      onClick={() => {
                        setSelectedListing(listing);
                        setListingNote(listing.adminNotes || "");
                      }}
                    >
                      Note
                    </SmallToggle>
                  </div>
                </article>
              ))}
            </div>
          </ScreenSection>
        </>
      ) : null}

      {activeSection === "users" ? (
        <>
          <ScreenSection className="pb-3">
            <TextField onChange={setUserQuery} placeholder="Search users, usernames, neighborhoods..." value={userQuery} />
          </ScreenSection>
          <ScreenSection className="pb-2">
            <div className="flex flex-col gap-2">
              {filteredUsers.slice(0, 20).map((user) => (
                <article key={user.id} className="rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
                  <div className="flex items-start gap-3">
                    <UserAvatar className="h-11 w-11 shrink-0 rounded-[14px] text-[13px] font-bold" user={user} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] text-white" style={{ fontWeight: 700 }}>
                            {user.publicName || user.name}
                          </p>
                          <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                            {user.username ? `@${user.username} · ` : ""}{user.neighborhood}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <SmallToggle active={user.verified} onClick={() => toggleUserVerified(user.id)} tone="success">
                          <BadgeCheck size={12} />
                          Verified
                        </SmallToggle>
                        <SmallToggle active={user.accountStatus === "suspended"} onClick={() => toggleUserSuspended(user.id)} tone="danger">
                          Suspend
                        </SmallToggle>
                        <SmallToggle active={user.role === "admin"} onClick={() => toggleUserAdmin(user.id)}>
                          Admin
                        </SmallToggle>
                        <SmallToggle active={false} onClick={() => startViewAs(user.id)}>
                          <Eye size={12} />
                          View as
                        </SmallToggle>
                        <SmallToggle active={false} onClick={() => deleteUserAccount(user.id)} tone="danger">
                          <Trash2 size={12} />
                          Delete
                        </SmallToggle>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {BADGE_IDS.map((badge) => (
                          <SmallToggle
                            key={`${user.id}-${badge}`}
                            active={(user.badges || []).includes(badge)}
                            onClick={() => toggleUserBadge(user.id, badge)}
                          >
                            {reviewBadgeCatalog[badge]?.label || badge}
                          </SmallToggle>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {isViewingAs ? (
              <div className="mt-3">
                <SecondaryButton className="w-full" onClick={stopViewAs}>
                  Stop view-as
                </SecondaryButton>
              </div>
            ) : null}
          </ScreenSection>
        </>
      ) : null}

      {activeSection === "events" ? (
        <>
          <ScreenSection className="pb-3">
            <form className="flex flex-col gap-3 rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}` }} onSubmit={handleAddEvent}>
              <div className="flex items-center gap-2">
                <CalendarPlus size={14} style={{ color: m.red }} />
                <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                  Add manual event
                </p>
              </div>
              <TextField onChange={(value) => setEventForm((current) => ({ ...current, title: value }))} placeholder="Event title" value={eventForm.title} />
              <div className="grid grid-cols-2 gap-2">
                <select className="h-[42px] rounded-[14px] border px-3 text-[12px] outline-none" style={{ background: m.surfaceStrong, borderColor: m.border, color: m.text }} value={eventForm.store} onChange={(event) => setEventForm((current) => ({ ...current, store: event.target.value }))}>
                  {STORE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <select className="h-[42px] rounded-[14px] border px-3 text-[12px] outline-none" style={{ background: m.surfaceStrong, borderColor: m.border, color: m.text }} value={eventForm.game} onChange={(event) => setEventForm((current) => ({ ...current, game: event.target.value }))}>
                  {GAME_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TextField onChange={(value) => setEventForm((current) => ({ ...current, dateStr: value }))} placeholder="2026-04-10" value={eventForm.dateStr} />
                <TextField onChange={(value) => setEventForm((current) => ({ ...current, time: value }))} placeholder="6:30 PM" value={eventForm.time} />
              </div>
              <TextArea onChange={(value) => setEventForm((current) => ({ ...current, note: value }))} placeholder="Optional notes" rows={3} value={eventForm.note} />
              <PrimaryButton className="w-full" type="submit">
                Add event
              </PrimaryButton>
            </form>
          </ScreenSection>
          <ScreenSection className="pb-2">
            <div className="flex flex-col gap-2">
              {manualEvents.map((event) => (
                <article key={event.id} className="rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
                  <p className="text-[13px] text-white" style={{ fontWeight: 700 }}>
                    {event.title}
                  </p>
                  <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                    {[event.store, event.game, event.dateStr, event.time].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SmallToggle active={event.published !== false} onClick={() => toggleManualEventPublished(event.id)} tone="success">
                      Publish
                    </SmallToggle>
                    <SmallToggle active={false} onClick={() => toggleManualEventPublished(event.id)}>
                      Toggle
                    </SmallToggle>
                    <SmallToggle active={false} onClick={() => removeManualEvent(event.id)} tone="danger">
                      Remove
                    </SmallToggle>
                  </div>
                </article>
              ))}
            </div>
          </ScreenSection>
        </>
      ) : null}

      {activeSection === "storefront" ? (
        <>
          <ScreenSection className="pb-3">
            <div className="rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
              <div className="flex items-center gap-2">
                <Home size={14} style={{ color: m.red }} />
                <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                  Homepage hero
                </p>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                <select className="h-[42px] rounded-[14px] border px-3 text-[12px] outline-none" style={{ background: m.surfaceStrong, borderColor: m.border, color: m.text }} value={heroDraft.featuredListingId || ""} onChange={(event) => setHeroDraft((current) => ({ ...current, featuredListingId: event.target.value || null }))}>
                  <option value="">Auto featured listing</option>
                  {listingChoices.map((listing) => (
                    <option key={listing.id} value={listing.id}>{listing.title}</option>
                  ))}
                </select>
                <select className="h-[42px] rounded-[14px] border px-3 text-[12px] outline-none" style={{ background: m.surfaceStrong, borderColor: m.border, color: m.text }} value={heroDraft.pinnedEventId || ""} onChange={(event) => setHeroDraft((current) => ({ ...current, pinnedEventId: event.target.value || null }))}>
                  <option value="">Auto pinned event</option>
                  {manualEvents.map((event) => (
                    <option key={event.id} value={event.id}>{event.title}</option>
                  ))}
                </select>
                <select className="h-[42px] rounded-[14px] border px-3 text-[12px] outline-none" style={{ background: m.surfaceStrong, borderColor: m.border, color: m.text }} value={heroDraft.spotlightGameSlug || ""} onChange={(event) => setHeroDraft((current) => ({ ...current, spotlightGameSlug: event.target.value || null }))}>
                  <option value="">Auto spotlight game</option>
                  <option value="pokemon">Pokemon</option>
                  <option value="magic">Magic</option>
                  <option value="one-piece">One Piece</option>
                  <option value="dragon-ball-super-fusion-world">Dragon Ball Super Fusion World</option>
                  <option value="union-arena">Union Arena</option>
                </select>
                <PrimaryButton className="w-full" onClick={() => updateHomeHeroSettings(heroDraft)}>
                  Save hero
                </PrimaryButton>
              </div>
            </div>
          </ScreenSection>
          <ScreenSection className="pb-2">
            <div className="rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
              <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                Homepage sections
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(sectionDraft).map(([key, value]) => (
                  <ChoicePill key={key} active={Boolean(value)} onClick={() => setSectionDraft((current) => ({ ...current, [key]: !current[key] }))}>
                    {key.replace("show", "")}
                  </ChoicePill>
                ))}
              </div>
              <div className="mt-4">
                <PrimaryButton className="w-full" onClick={() => updateStorefrontSettings({ homeSections: sectionDraft })}>
                  Save layout
                </PrimaryButton>
              </div>
            </div>
          </ScreenSection>
        </>
      ) : null}

      {activeSection === "audit" ? (
        <ScreenSection className="pb-2">
          <div className="flex flex-col gap-2">
            {adminAuditLog.slice(0, 16).map((entry) => (
              <article key={entry.id} className="rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
                <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                  {entry.title}
                </p>
                <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                  {entry.action} · {new Date(entry.createdAt).toLocaleString("en-CA", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {entry.details ? (
                  <p className="mt-2 text-[11px] leading-5" style={{ color: m.textSecondary }}>
                    {entry.details}
                  </p>
                ) : null}
              </article>
            ))}

            <div className="rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
              <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                Dev feed
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {adminRoadmap.recentPushes.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-[14px] px-3 py-3" style={{ background: m.surfaceStrong }}>
                    <p className="text-[11px] text-white" style={{ fontWeight: 700 }}>
                      {item.title}
                    </p>
                    <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                      {item.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScreenSection>
      ) : null}

      <BottomSheet open={Boolean(selectedListing)} onClose={() => setSelectedListing(null)}>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <p className="text-[15px] text-white" style={{ fontWeight: 700 }}>
            Listing admin note
          </p>
          <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
            {selectedListing?.title}
          </p>
          <TextArea className="mt-4" onChange={setListingNote} placeholder="Internal admin note" rows={5} value={listingNote} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <SecondaryButton className="w-full" onClick={() => setSelectedListing(null)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton className="w-full" onClick={handleSaveListingNote}>
              Save note
            </PrimaryButton>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={Boolean(selectedBugReport)} onClose={() => setSelectedBugReport(null)}>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <p className="text-[15px] text-white" style={{ fontWeight: 700 }}>
            Bug report note
          </p>
          <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
            {selectedBugReport?.title}
          </p>
          <TextArea className="mt-4" onChange={setBugNotes} placeholder="Admin note for triage" rows={5} value={bugNotes} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <SecondaryButton className="w-full" onClick={() => setSelectedBugReport(null)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton className="w-full" onClick={handleSaveBugNotes}>
              Save note
            </PrimaryButton>
          </div>
        </div>
      </BottomSheet>
    </MobileScreen>
  );
}
