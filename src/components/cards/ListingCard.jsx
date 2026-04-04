import { Bookmark, Repeat2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";
import { m } from "../../mobile/design";
import CardArtwork from "../shared/CardArtwork";

function conditionTone(condition) {
  const value = String(condition || "").toUpperCase();
  if (value === "NM" || value === "MINT" || value === "PSA 10") {
    return "text-[var(--success)]";
  }
  if (value === "LP" || value === "MP") {
    return "text-[var(--warning)]";
  }
  return "text-[var(--on-surface-muted)]";
}

export default function ListingCard({ listing, onOpen }) {
  const { formatCadPrice, toggleWishlist } = useMarketplace();
  const marketDelta =
    Number.isFinite(Number(listing.marketPrice)) && Number.isFinite(Number(listing.price))
      ? Number(listing.price) - Number(listing.marketPrice)
      : null;

  return (
    <Link
      className="group flex h-full flex-col overflow-hidden rounded-[22px] border transition duration-200"
      style={{ background: m.surface, borderColor: m.border, boxShadow: m.shadowPanel }}
      to={`/listing/${listing.id}`}
      onClick={() => onOpen?.(listing.id)}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-black">
        <CardArtwork
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          game={listing.game}
          src={listing.primaryImage || listing.imageUrl}
          title={listing.title}
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <span className={`bg-black/84 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${conditionTone(listing.condition)}`}>
            {listing.condition || "Listed"}
          </span>
          {listing.acceptsTrade ? (
            <span className="bg-[var(--primary-container)] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-white">
              Trade Ready
            </span>
          ) : null}
        </div>
          <button
            aria-label={listing.wishlisted ? "Remove from wishlist" : "Save listing"}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full transition md:h-8 md:w-8"
            style={{ background: "rgba(0,0,0,0.8)", color: m.textSecondary }}
            type="button"
            onClick={(event) => {
              event.preventDefault();
            void toggleWishlist(listing.id);
          }}
        >
          <Bookmark
            fill={listing.wishlisted ? "currentColor" : "none"}
            size={14}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2.5 md:p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-bold text-white md:text-sm">{listing.title}</h3>
            <p className="mt-0.5 truncate text-[11px]" style={{ color: m.textSecondary }}>
              {listing.description?.split("|")?.[0]?.trim() || listing.game}
            </p>
          </div>
          <span className="shrink-0 text-[10px]" style={{ color: m.textTertiary, fontWeight: 700 }}>
            {listing.printing || listing.cardNumber || ""}
          </span>
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: m.textTertiary }}>
                Market Value
              </p>
              <p className="text-xs font-semibold" style={{ color: m.textSecondary }}>
                {listing.marketPrice
                  ? formatCadPrice(listing.marketPrice, listing.marketPriceCurrency || "CAD")
                  : "N/A"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: m.textTertiary }}>
                Ask Price
              </p>
              <p className="text-[1.18rem] font-black leading-none text-white md:text-[1.35rem]">
                {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-[14px] px-2.5 py-2 text-[10px] md:px-3" style={{ background: m.surfaceStrong }}>
            <div className="font-bold uppercase tracking-[0.12em]">
              {marketDelta === null ? (
                <span style={{ color: m.textTertiary }}>No market delta</span>
              ) : marketDelta <= 0 ? (
                <span style={{ color: m.success }}>Delta: {marketDelta.toFixed(2)}</span>
              ) : (
                <span style={{ color: m.danger }}>Delta: +{marketDelta.toFixed(2)}</span>
              )}
            </div>
            <div className="flex items-center gap-2" style={{ color: m.textTertiary }}>
              {listing.acceptsTrade ? <Repeat2 size={12} /> : null}
              <span>Qty: {listing.quantity || 1}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
