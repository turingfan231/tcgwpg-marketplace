export default function PageSkeleton({
  titleWidth = "w-64",
  bodyWidth = "w-full",
  rows = 3,
  cards = 3,
}) {
  return (
    <div className="space-y-6 animate-pulse">
      <section className="surface-card p-6 sm:p-7">
        <div className="h-3 w-28 rounded-full bg-slate-200" />
        <div className={`mt-4 h-12 rounded-full bg-slate-200 ${titleWidth}`} />
        <div className={`mt-4 h-4 rounded-full bg-slate-100 ${bodyWidth}`} />
        <div className="mt-2 h-4 w-4/5 rounded-full bg-slate-100" />
      </section>

      {rows > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: cards }).map((_, index) => (
            <div key={index} className="surface-card p-5">
              <div className="h-40 rounded-[20px] bg-slate-100" />
              <div className="mt-4 h-5 w-3/4 rounded-full bg-slate-200" />
              <div className="mt-3 h-4 w-2/3 rounded-full bg-slate-100" />
              <div className="mt-6 h-8 w-24 rounded-full bg-slate-200" />
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
