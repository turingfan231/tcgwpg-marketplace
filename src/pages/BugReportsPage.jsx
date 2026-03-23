import { Bug, ExternalLink, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";
import PageSkeleton from "../components/ui/PageSkeleton";
import { useMarketplace } from "../hooks/useMarketplace";

const areaOptions = [
  { value: "general", label: "General app" },
  { value: "create-listing", label: "Create listing" },
  { value: "search", label: "Card search" },
  { value: "messages", label: "Messages" },
  { value: "market", label: "Market feed" },
  { value: "seller", label: "Seller page" },
  { value: "events", label: "Events" },
  { value: "mobile", label: "Mobile layout" },
  { value: "performance", label: "Performance" },
];

const severityOptions = ["low", "medium", "high", "critical"];

function buildEnvironmentLabel() {
  if (typeof window === "undefined") {
    return "Unknown environment";
  }

  const viewport = `${window.innerWidth}x${window.innerHeight}`;
  const userAgent = window.navigator?.userAgent || "Unknown browser";
  return `${viewport} | ${userAgent.slice(0, 120)}`;
}

function formatStatusLabel(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function BugReportsPage() {
  const location = useLocation();
  const {
    bugReportsForCurrentUser,
    currentUser,
    isAdmin,
    isBetaTester,
    loading,
    submitBugReport,
  } = useMarketplace();
  const [form, setForm] = useState({
    title: "",
    area: "general",
    severity: "medium",
    pagePath: location.pathname,
    expectedBehavior: "",
    actualBehavior: "",
    reproductionSteps: "",
    environmentLabel: buildEnvironmentLabel(),
    screenshotUrl: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const bugCountLabel = useMemo(
    () => `${bugReportsForCurrentUser.length} submitted`,
    [bugReportsForCurrentUser.length],
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const result = await submitBugReport(form);

    if (!result?.ok) {
      setError(result?.error || "Bug report could not be submitted.");
      return;
    }

    setMessage(
      result.warning ||
        "Bug report submitted. Admins can now triage it from the beta tracker queue.",
    );
    setForm((current) => ({
      ...current,
      title: "",
      expectedBehavior: "",
      actualBehavior: "",
      reproductionSteps: "",
      screenshotUrl: "",
      pagePath: location.pathname,
      environmentLabel: buildEnvironmentLabel(),
    }));
  }

  function updateField(field, value) {
    setError("");
    setMessage("");
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  if (loading && !bugReportsForCurrentUser.length) {
    return <PageSkeleton cards={3} rows={1} titleWidth="w-56" />;
  }

  if (!isAdmin && !isBetaTester) {
    return (
      <EmptyState
        description="Ask an admin to grant the Beta Tester badge if you need access to the shared bug tracker."
        title="Bug tracker access required"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-kicker">Beta bug tracker</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
              Report app issues with real reproduction details
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-8 text-steel">
              This section is only available to users with the Beta Tester badge. Include
              the page, exact steps, and what you expected to happen so issues can be
              triaged quickly.
            </p>
          </div>

          <div className="rounded-[24px] bg-[#f8f5ee] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
              Access
            </p>
            <p className="mt-2 inline-flex items-center gap-2 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
              <ShieldCheck size={18} className="text-orange" />
              {isAdmin ? "Admin" : "Beta tester"}
            </p>
            <p className="mt-2 text-sm text-steel">{bugCountLabel}</p>
          </div>
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="flex items-center gap-3">
          <Bug className="text-orange" size={20} />
          <div>
            <p className="section-kicker">New report</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
              File a reproducible bug
            </h2>
          </div>
        </div>

        <form className="mt-6 grid gap-5 lg:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-steel">Bug title</span>
            <input
              required
              className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
              placeholder="Unread message badge stays after opening thread"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-steel">Area</span>
            <select
              className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
              value={form.area}
              onChange={(event) => updateField("area", event.target.value)}
            >
              {areaOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-steel">Severity</span>
            <select
              className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
              value={form.severity}
              onChange={(event) => updateField("severity", event.target.value)}
            >
              {severityOptions.map((option) => (
                <option key={option} value={option}>
                  {formatStatusLabel(option)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-steel">Page / route</span>
            <input
              className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
              placeholder="/messages"
              value={form.pagePath}
              onChange={(event) => updateField("pagePath", event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-steel">
              Screenshot URL
            </span>
            <input
              className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
              placeholder="https://..."
              value={form.screenshotUrl}
              onChange={(event) => updateField("screenshotUrl", event.target.value)}
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-steel">Actual behavior</span>
            <textarea
              required
              className="min-h-28 w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
              placeholder="What happened instead?"
              value={form.actualBehavior}
              onChange={(event) => updateField("actualBehavior", event.target.value)}
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-steel">Expected behavior</span>
            <textarea
              className="min-h-24 w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
              placeholder="What should have happened?"
              value={form.expectedBehavior}
              onChange={(event) => updateField("expectedBehavior", event.target.value)}
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-steel">
              Reproduction steps
            </span>
            <textarea
              required
              className="min-h-32 w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
              placeholder="1. Open messages  2. Reply to thread  3. Refresh  4. Unread badge returns"
              value={form.reproductionSteps}
              onChange={(event) => updateField("reproductionSteps", event.target.value)}
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-steel">
              Environment details
            </span>
            <textarea
              className="min-h-24 w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
              value={form.environmentLabel}
              onChange={(event) => updateField("environmentLabel", event.target.value)}
            />
          </label>

          <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="space-y-2">
              {message ? (
                <p className="text-sm font-semibold text-emerald-700">{message}</p>
              ) : null}
              {error ? (
                <p className="text-sm font-semibold text-rose-700">{error}</p>
              ) : null}
            </div>
            <button
              className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              Submit bug report
            </button>
          </div>
        </form>
      </section>

      <section className="surface-card p-6">
        <p className="section-kicker">My reports</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
          Submitted issues
        </h2>

        <div className="mt-5 space-y-4">
          {bugReportsForCurrentUser.length ? (
            bugReportsForCurrentUser.map((report) => (
              <article
                key={report.id}
                className="rounded-[26px] border border-slate-200 bg-[#fbf8f1] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                        {report.title}
                      </h3>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {formatStatusLabel(report.status)}
                      </span>
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                        {formatStatusLabel(report.severity)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-steel">
                      {formatStatusLabel(report.area)}
                      {report.pagePath ? ` | ${report.pagePath}` : ""}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-steel">{report.actualBehavior}</p>
                    {report.adminNotes ? (
                      <div className="mt-4 rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                          Admin note
                        </p>
                        <p className="mt-2 text-sm leading-7 text-steel">{report.adminNotes}</p>
                      </div>
                    ) : null}
                  </div>
                  {report.screenshotUrl ? (
                    <a
                      className="inline-flex items-center gap-2 text-sm font-semibold text-navy"
                      href={report.screenshotUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Screenshot
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              description="Submitted bugs will show status changes, admin notes, and fix progress here."
              title="No bug reports yet"
            />
          )}
        </div>
      </section>
    </div>
  );
}
