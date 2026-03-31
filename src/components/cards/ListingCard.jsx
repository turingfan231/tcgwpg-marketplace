import {
  ArrowUpRight,
  Heart,
  MapPin,
  Repeat2,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";
import {
  getConditionClasses,
  getGameClasses,
  getListingTypeClasses,
} from "../../utils/formatters";
import CardArtwork from "../shared/CardArtwork";
import UserAvatar from "../shared/UserAvatar";

export default function ListingCard({ listing, onOpen }) {
  const { formatCadPrice, toggleWishlist } = useMarketplace();
  const hasSalePrice = listing.previousPrice && listing.previousPrice > listing.price;

  return (
    <Link
      className="group block overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--surface-solid)] shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-navy/20 hover:shadow-lift"
      to={`/listing/${listing.id}`}
      onClick={() => onOpen?.(listing.id)}
    >
      <div className="flex gap-3 p-2.5 sm:gap-3.5 sm:p-3.5">
        <div className="relative flex w-[6.2rem] shrink-0 self-start items-center justify-center overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--surface-hover)] p-1 sm:w-[6.8rem]">
          <CardArtwork
            className="aspect-[63/88] h-full w-full rounded-[8px] object-contain bg-white shadow-sm"
            game={listing.game}
            src={listing.imageUrl}
            title={listing.title}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2 sm:space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
            <span
              className={`rounded-[8px] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] sm:text-[10px] ${getListingTypeClasses(
                listing.type,
              )}`}
            >
              {listing.type}
            </span>
            <span
              className={`rounded-[8px] px-2 py-1 text-[9px] font-semibold sm:text-[10px] ${getGameClasses(
                listing.game,
              )}`}
            >
              {listing.game}
            </span>
            {listing.listingFormat && listing.listingFormat !== "single" ? (
              <span className="rounded-[8px] bg-[var(--surface-hover)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-steel sm:text-[10px]">
                {listing.listingFormat}
              </span>
            ) : null}
            </div>

            <button
              aria-label="Toggle wishlist"
              className="rounded-[8px] bg-white/90 p-1.5 text-steel shadow-sm transition hover:text-orange"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                toggleWishlist(listing.id);
              }}
            >
              <Heart
                className={listing.wishlisted ? "text-orange" : ""}
                fill={listing.wishlisted ? "currentColor" : "none"}
                size={17}
              />
            </button>
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
            <h3 className="line-clamp-2 font-display text-[0.92rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[1rem]">
              {listing.title}
            </h3>
            <div className="flex items-center gap-1.5 text-[0.72rem] text-steel sm:text-[0.78rem]">
              <UserAvatar className="h-5 w-5 text-[0.56rem] font-bold sm:h-6 sm:w-6 sm:text-[0.62rem]" user={listing.seller} />
              <span className="truncate">
                {listing.seller?.publicName || listing.seller?.name} | {listing.timeAgo}
              </span>
            </div>
          </div>
            <ArrowUpRight className="mt-0.5 h-4 w-4 text-slate-300 transition group-hover:text-navy" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[9px] sm:gap-1.5 sm:text-[10px]">
          <span
            className={`rounded-[8px] px-2 py-1 font-semibold uppercase tracking-[0.12em] ${getConditionClasses(
              listing.condition,
            )}`}
          >
            {listing.condition}
          </span>
          <span className="flex items-center gap-1 rounded-[8px] bg-[var(--surface-hover)] px-2 py-1 font-semibold text-steel">
            <MapPin size={12} />
            {listing.neighborhood}
          </span>
          {listing.acceptsTrade ? (
            <span className="inline-flex items-center gap-1 rounded-[8px] bg-navy px-2 py-1 font-semibold uppercase tracking-[0.12em] text-white">
              <Repeat2 size={11} />
              Trades
            </span>
          ) : null}
          {listing.quantity > 1 ? (
            <span className="rounded-[8px] bg-orange/10 px-2 py-1 font-semibold text-orange">
              {listing.quantity}x available
            </span>
          ) : null}
          </div>

          <div className="flex items-end justify-between gap-2 border-t border-[var(--line)] pt-2 sm:gap-3 sm:pt-2.5">
            <div className="space-y-1">
            <div className="flex items-center gap-2">
              {hasSalePrice ? (
                <span className="text-[0.7rem] font-semibold text-slate-400 line-through sm:text-[0.78rem]">
                  {formatCadPrice(listing.previousPrice, listing.priceCurrency || "CAD")}
                </span>
              ) : null}
              <span className="font-display text-[1rem] font-semibold tracking-[-0.03em] text-ink sm:text-[1.12rem]">
                {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
              </span>
              {listing.marketPrice ? (
                <div className="group/tooltip relative">
                  <span className="inline-flex rounded-full bg-emerald-500/10 p-1.5 text-emerald-700">
                    <TrendingUp size={14} />
                  </span>
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-2xl bg-slate-950 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition group-hover/tooltip:opacity-100">
                    Market average:
                    <span className="ml-1 font-semibold">
                      {formatCadPrice(
                        listing.marketPrice,
                        listing.marketPriceCurrency || "CAD",
                      )}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
            <p className="text-[0.64rem] text-steel sm:text-[0.72rem]">
              {listing.views} views | {listing.offers} offers
            </p>
          </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

