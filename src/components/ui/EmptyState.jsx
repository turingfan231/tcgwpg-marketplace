export default function EmptyState({ title, description, action }) {
  return (
    <div className="panel flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <h3 className="font-display text-2xl font-bold uppercase tracking-[0.08em] text-ink">
        {title}
      </h3>
      <p className="mt-3 max-w-md text-base text-steel">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
