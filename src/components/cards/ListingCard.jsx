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

export default function ListingCard({ listing }) {
  const { formatCadPrice, toggleWishlist } = useMarketplace();
  const hasSalePrice = listing.previousPrice && listing.previousPrice > listing.price;

  return (
    <Link
      className="group block overflow-hidden rounded-[22px] border border-[rgba(203,220,231,0.92)] bg-[linear-gradient(180deg,rgba(250,253,255,0.94),rgba(241,243,245,0.88))] shadow-soft transition duration-300 hover:-translate-y-1 hover:border-navy/20 hover:shadow-lift sm:rounded-[28px]"
      to={`/listing/${listing.id}`}
    >
      <div className="flex gap-2.5 p-2.5 sm:block sm:p-0">
        <div className="relative flex w-[5.5rem] shrink-0 items-center justify-center rounded-[16px] border border-[rgba(203,220,231,0.82)] bg-[linear-gradient(180deg,#f7fbfe_0%,#e4eef4_100%)] p-2 sm:w-auto sm:rounded-none sm:border-0 sm:border-b sm:border-[rgba(203,220,231,0.78)] sm:px-3 sm:pb-3 sm:pt-3">
          <CardArtwork
            className="aspect-[63/88] w-full rounded-[12px] object-cover shadow-sm sm:w-[8.75rem] sm:max-w-full sm:rounded-[18px] sm:shadow-soft"
            game={listing.game}
            src={listing.imageUrl}
            title={listing.title}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2 sm:space-y-3 sm:p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:px-3 sm:text-[11px] sm:tracking-[0.16em] ${getListingTypeClasses(
                listing.type,
              )}`}
            >
              {listing.type}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-[11px] ${getGameClasses(
                listing.game,
              )}`}
            >
              {listing.game}
            </span>
            {listing.listingFormat && listing.listingFormat !== "single" ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700 sm:px-3 sm:text-[11px] sm:tracking-[0.16em]">
                {listing.listingFormat}
              </span>
            ) : null}
            </div>

            <button
              aria-label="Toggle wishlist"
              className="rounded-full bg-white/90 p-1.5 text-steel shadow-sm transition hover:text-orange sm:p-2"
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
            <div className="min-w-0 space-y-1 sm:space-y-1.5">
            <h3 className="line-clamp-2 font-display text-[0.97rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[1.22rem]">
              {listing.title}
            </h3>
            <div className="flex items-center gap-2 text-[0.76rem] text-steel sm:text-sm">
              <UserAvatar className="h-6 w-6 text-[0.62rem] font-bold sm:h-7 sm:w-7 sm:text-[0.7rem]" user={listing.seller} />
              <span className="truncate">
                {listing.seller?.publicName || listing.seller?.name} | {listing.timeAgo}
              </span>
            </div>
          </div>
            <ArrowUpRight className="mt-0.5 h-4 w-4 text-slate-300 transition group-hover:text-navy" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:gap-2 sm:text-xs">
          <span
            className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.14em] sm:px-3 sm:tracking-[0.16em] ${getConditionClasses(
              listing.condition,
            )}`}
          >
            {listing.condition}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/78 px-2.5 py-1 font-semibold text-slate-600 sm:px-3">
            <MapPin size={12} />
            {listing.neighborhood}
          </span>
          {listing.acceptsTrade ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-white sm:px-3 sm:tracking-[0.16em]">
              <Repeat2 size={11} />
              Trades
            </span>
          ) : null}
          {listing.quantity > 1 ? (
            <span className="rounded-full bg-orange/10 px-2.5 py-1 font-semibold text-orange sm:px-3">
              {listing.quantity}x available
            </span>
          ) : null}
          </div>

          <div className="flex items-end justify-between gap-3 border-t border-[rgba(203,220,231,0.75)] pt-2 sm:gap-4 sm:pt-2.5">
            <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-2">
              {hasSalePrice ? (
                <span className="text-xs font-semibold text-slate-400 line-through sm:text-base">
                  {formatCadPrice(listing.previousPrice, listing.priceCurrency || "CAD")}
                </span>
              ) : null}
              <span className="font-display text-[1.18rem] font-semibold tracking-[-0.03em] text-ink sm:text-[1.72rem]">
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
            <p className="text-[0.7rem] text-steel sm:text-sm">
              {listing.views} views | {listing.offers} offers
            </p>
          </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

