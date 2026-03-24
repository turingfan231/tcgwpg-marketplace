export default function EmptyState({ title, description, action }) {
  return (
    <div className="panel flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-5 flex items-center gap-2">
        <span className="h-2.5 w-12 rounded-full bg-navy/12" />
        <span className="h-2.5 w-2.5 rounded-full bg-orange/80" />
        <span className="h-2.5 w-6 rounded-full bg-navy/20" />
      </div>
      <h3 className="font-display text-2xl font-bold uppercase tracking-[0.08em] text-ink">
        {title}
      </h3>
      <p className="mt-3 max-w-md text-base text-steel">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
