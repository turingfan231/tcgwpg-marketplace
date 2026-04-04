import { m } from "../../mobile/design";

export default function PageSkeleton({
  titleWidth = "w-64",
  bodyWidth = "w-full",
  rows = 3,
  cards = 3,
}) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[22px] border p-6 sm:p-7" style={{ background: m.surface, borderColor: m.border, boxShadow: m.shadowPanel }}>
        <div className="skeleton-shimmer h-3 w-28 rounded-full" />
        <div className={`skeleton-shimmer mt-4 h-12 rounded-full ${titleWidth}`} />
        <div className={`skeleton-shimmer mt-4 h-4 rounded-full ${bodyWidth}`} />
        <div className="skeleton-shimmer mt-2 h-4 w-4/5 rounded-full" />
      </section>

      {rows > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: cards }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-[22px] border p-5" style={{ background: m.surface, borderColor: m.border, boxShadow: m.shadowPanel }}>
              <div className="skeleton-shimmer h-40 rounded-[20px]" />
              <div className="skeleton-shimmer mt-4 h-5 w-3/4 rounded-full" />
              <div className="skeleton-shimmer mt-3 h-4 w-2/3 rounded-full" />
              <div className="skeleton-shimmer mt-6 h-8 w-24 rounded-full" />
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
