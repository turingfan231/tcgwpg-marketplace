export default function EmptyState({ title, description, action }) {
  return (
    <div className="panel flex min-h-52 flex-col items-center justify-center px-5 py-10 text-center sm:min-h-64 sm:px-6 sm:py-12">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-10 rounded-full bg-navy/12" />
        <span className="h-2 w-2 rounded-full bg-orange/80" />
        <span className="h-2 w-5 rounded-full bg-navy/20" />
      </div>
      <h3 className="font-display text-[1.45rem] font-semibold tracking-[-0.04em] text-ink sm:text-2xl">
        {title}
      </h3>
      <p className="mt-3 max-w-md text-sm leading-7 text-steel sm:text-base">{description}</p>
      {action ? <div className="mt-5 sm:mt-6">{action}</div> : null}
    </div>
  );
}
