import { m } from "../../mobile/design";

export default function EmptyState({ title, description, action, actionLabel, onAction }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-[22px] border px-5 py-10 text-center sm:min-h-64 sm:px-6 sm:py-12" style={{ background: m.surface, borderColor: m.border, boxShadow: m.shadowPanel }}>
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-10 rounded-full" style={{ background: "rgba(239,68,68,0.12)" }} />
        <span className="h-2 w-2 rounded-full" style={{ background: m.red }} />
        <span className="h-2 w-5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
      </div>
      <h3 className="text-[1.45rem] tracking-tight text-white sm:text-2xl" style={{ fontWeight: 700 }}>
        {title}
      </h3>
      <p className="mt-3 max-w-md text-sm sm:text-base" style={{ color: m.textSecondary, lineHeight: 1.7 }}>{description}</p>
      {action ? <div className="mt-5 sm:mt-6">{action}</div> : null}
      {!action && actionLabel && onAction ? (
        <div className="mt-5 sm:mt-6">
          <button className="inline-flex h-[44px] items-center justify-center rounded-[14px] px-4 text-[13px] text-white" style={{ background: m.redGradient, fontWeight: 700 }} type="button" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
