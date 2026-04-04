import { Bookmark, MapPin, Repeat2 } from "lucide-react";
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

export default function CompactListingRow({ listing, onOpen }) {
  const { formatCadPrice, toggleWishlist } = useMarketplace();

  return (
    <Link
      className="flex items-center gap-3 rounded-[18px] border p-2.5 transition"
      style={{ background: m.surface, borderColor: m.border, boxShadow: m.shadowPanel }}
      to={`/listing/${listing.id}`}
      onClick={() => onOpen?.(listing.id)}
    >
      <CardArtwork
        className="h-[4.8rem] w-[3.55rem] shrink-0 rounded-[12px] object-cover"
        game={listing.game}
        src={listing.primaryImage || listing.imageUrl}
        title={listing.title}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{listing.title}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary }}>
              {listing.game}
            </p>
          </div>
          <button
            aria-label={listing.wishlisted ? "Remove from wishlist" : "Save listing"}
            className="flex h-6 w-6 items-center justify-center rounded-full transition"
            style={{ color: m.textSecondary }}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void toggleWishlist(listing.id);
            }}
          >
            <Bookmark fill={listing.wishlisted ? "currentColor" : "none"} size={14} />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">
          <span className={conditionTone(listing.condition)}>{listing.condition || "Listed"}</span>
          {listing.acceptsTrade ? (
            <span className="inline-flex items-center gap-1 text-[var(--primary)]">
              <Repeat2 size={10} />
              Trade
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary }}>
              Ask price
            </p>
            <p className="text-[1rem] font-black tracking-[-0.05em] text-white">
              {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary }}>
              Market
            </p>
            <p className="truncate text-xs font-semibold" style={{ color: m.textSecondary }}>
              {listing.marketPrice
                ? formatCadPrice(listing.marketPrice, listing.marketPriceCurrency || "CAD")
                : "N/A"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1 text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary }}>
          <MapPin size={10} />
          <span className="truncate">{listing.neighborhood || "Winnipeg"}</span>
        </div>
      </div>
    </Link>
  );
}
