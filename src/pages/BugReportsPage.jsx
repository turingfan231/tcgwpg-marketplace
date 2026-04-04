import { Bug, ExternalLink, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import {
  ChoicePill,
  EmptyBlock,
  MobileScreen,
  PrimaryButton,
  ScreenHeader,
  ScreenSection,
  TextArea,
  TextField,
} from "../mobile/primitives";

const AREA_OPTIONS = [
  { value: "general", label: "General" },
  { value: "create-listing", label: "Create listing" },
  { value: "search", label: "Search" },
  { value: "messages", label: "Messages" },
  { value: "market", label: "Market" },
  { value: "seller", label: "Seller" },
  { value: "events", label: "Events" },
  { value: "mobile", label: "Mobile" },
  { value: "performance", label: "Performance" },
];

const SEVERITY_OPTIONS = ["low", "medium", "high", "critical"];

function buildEnvironmentLabel() {
  if (typeof window === "undefined") {
    return "Unknown environment";
  }
  return `${window.innerWidth}x${window.innerHeight} · ${window.navigator?.userAgent?.slice(0, 90) || "Browser"}`;
}

function formatStatusLabel(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ReportCard({ report }) {
  return (
    <article className="rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full px-2 py-[4px] text-[8px]" style={{ background: m.surfaceStrong, color: m.textSecondary, fontWeight: 700 }}>
              {formatStatusLabel(report.status)}
            </span>
            <span className="rounded-full px-2 py-[4px] text-[8px]" style={{ background: "rgba(239,68,68,0.14)", color: "#fca5a5", fontWeight: 700 }}>
              {formatStatusLabel(report.severity)}
            </span>
          </div>
          <p className="mt-2 text-[13px] text-white" style={{ fontWeight: 700 }}>
            {report.title}
          </p>
          <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
            {formatStatusLabel(report.area)}{report.pagePath ? ` · ${report.pagePath}` : ""}
          </p>
        </div>
        {report.screenshotUrl ? (
          <a
            className="inline-flex h-8 items-center justify-center gap-1 rounded-[12px] px-3 text-[10px]"
            href={report.screenshotUrl}
            rel="noreferrer"
            style={{ background: m.surfaceStrong, color: m.textSecondary, fontWeight: 600 }}
            target="_blank"
          >
            Shot
            <ExternalLink size={11} />
          </a>
        ) : null}
      </div>
      <p className="mt-3 text-[11px] leading-5" style={{ color: m.textSecondary }}>
        {report.actualBehavior}
      </p>
      {report.adminNotes ? (
        <div className="mt-3 rounded-[14px] px-3 py-3" style={{ background: m.surfaceStrong, border: `1px solid ${m.border}` }}>
          <p className="text-[9px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
            Admin note
          </p>
          <p className="mt-2 text-[11px] leading-5" style={{ color: m.textSecondary }}>
            {report.adminNotes}
          </p>
        </div>
      ) : null}
    </article>
  );
}

export default function BugReportsPage() {
  const location = useLocation();
  const { bugReportsForCurrentUser, isAdmin, isBetaTester, submitBugReport } = useMarketplace();
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

  function updateField(field, value) {
    setError("");
    setMessage("");
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const result = await submitBugReport(form);
    if (!result?.ok) {
      setError(result?.error || "Bug report could not be submitted.");
      return;
    }
    setMessage(result.warning || "Bug report submitted for triage.");
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

  if (!isAdmin && !isBetaTester) {
    return (
      <MobileScreen className="pb-[92px]">
        <SeoHead canonicalPath="/beta/bugs" description="Bug tracker access" title="Bug tracker access" />
        <ScreenHeader subtitle="Beta access required" title="Bug Tracker" />
        <ScreenSection className="pt-2">
          <EmptyBlock
            description="Ask an admin to grant the Beta Tester badge if you need access to the shared bug tracker."
            title="Access required"
          />
        </ScreenSection>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen className="pb-[92px]">
      <SeoHead canonicalPath="/beta/bugs" description="Submit reproducible issues and track triage notes from the beta bug queue." title="Bug Tracker" />

      <ScreenHeader subtitle={bugCountLabel} title="Bug Tracker" />

      <ScreenSection className="pb-3">
        <div className="rounded-[18px] px-4 py-4" style={{ background: m.surfaceStrong, border: `1px solid ${m.border}` }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: "rgba(239,68,68,0.12)" }}>
              <Bug size={15} style={{ color: m.red }} />
            </div>
            <div>
              <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                Beta reporting lane
              </p>
              <p className="text-[10px]" style={{ color: m.textSecondary }}>
                {isAdmin ? "Admin access" : "Beta tester access"} · include route, exact behavior, and reproduction steps
              </p>
            </div>
            <div className="ml-auto inline-flex items-center gap-1 text-[10px]" style={{ color: m.textSecondary }}>
              <ShieldCheck size={12} style={{ color: m.red }} />
              Access
            </div>
          </div>
        </div>
      </ScreenSection>

      <ScreenSection className="pb-3">
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <TextField onChange={(value) => updateField("title", value)} placeholder="Unread badge comes back after opening thread" value={form.title} />

          <div className="rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
            <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
              Area
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {AREA_OPTIONS.map((option) => (
                <ChoicePill key={option.value} active={form.area === option.value} onClick={() => updateField("area", option.value)}>
                  {option.label}
                </ChoicePill>
              ))}
            </div>

            <p className="mt-4 text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
              Severity
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SEVERITY_OPTIONS.map((option) => (
                <ChoicePill key={option} active={form.severity === option} onClick={() => updateField("severity", option)}>
                  {formatStatusLabel(option)}
                </ChoicePill>
              ))}
            </div>
          </div>

          <TextField onChange={(value) => updateField("pagePath", value)} placeholder="/inbox/thread-id" value={form.pagePath} />
          <TextArea onChange={(value) => updateField("actualBehavior", value)} placeholder="What actually happened?" rows={4} value={form.actualBehavior} />
          <TextArea onChange={(value) => updateField("expectedBehavior", value)} placeholder="What should have happened?" rows={3} value={form.expectedBehavior} />
          <TextArea onChange={(value) => updateField("reproductionSteps", value)} placeholder="Step-by-step reproduction notes" rows={4} value={form.reproductionSteps} />
          <TextField onChange={(value) => updateField("screenshotUrl", value)} placeholder="Optional screenshot URL" value={form.screenshotUrl} />

          {error ? (
            <p className="text-[11px]" style={{ color: "#fca5a5" }}>
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-[11px]" style={{ color: "#86efac" }}>
              {message}
            </p>
          ) : null}

          <PrimaryButton className="w-full" type="submit">
            Submit bug report
          </PrimaryButton>
        </form>
      </ScreenSection>

      <ScreenSection className="pb-2">
        <p className="mb-2 text-[12px] text-white" style={{ fontWeight: 700 }}>
          Your reports
        </p>
        {bugReportsForCurrentUser.length ? (
          <div className="flex flex-col gap-2">
            {bugReportsForCurrentUser.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <EmptyBlock description="Submitted bug reports will appear here after you send them." title="No reports yet" />
        )}
      </ScreenSection>
    </MobileScreen>
  );
}
