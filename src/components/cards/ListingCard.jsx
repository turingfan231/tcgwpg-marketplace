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
      className="group block overflow-hidden rounded-[30px] border border-slate-200/85 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:border-navy/20 hover:shadow-lift"
      to={`/listing/${listing.id}`}
    >
      <div className="relative border-b border-slate-200/70 bg-[linear-gradient(180deg,#faf7f0_0%,#f3efe7_100%)] px-4 pb-4 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getListingTypeClasses(
                listing.type,
              )}`}
            >
              {listing.type}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getGameClasses(
                listing.game,
              )}`}
            >
              {listing.game}
            </span>
            {listing.listingFormat && listing.listingFormat !== "single" ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                {listing.listingFormat}
              </span>
            ) : null}
          </div>

          <button
            aria-label="Toggle wishlist"
            className="rounded-full bg-white/90 p-2 text-steel shadow-sm transition hover:text-orange"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              toggleWishlist(listing.id);
            }}
          >
            <Heart
              className={listing.wishlisted ? "text-orange" : ""}
              fill={listing.wishlisted ? "currentColor" : "none"}
              size={18}
            />
          </button>
        </div>

        <div className="flex min-h-[14.5rem] items-center justify-center rounded-[22px] border border-slate-200/75 bg-white/80 p-3">
          <CardArtwork
            className="aspect-[63/88] w-[9.75rem] max-w-full rounded-[20px] object-cover shadow-soft"
            game={listing.game}
            src={listing.imageUrl}
            title={listing.title}
          />
        </div>

        {listing.acceptsTrade ? (
          <div className="absolute bottom-3 left-4 inline-flex items-center gap-2 rounded-full bg-navy px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
            <Repeat2 size={13} />
            Trades accepted
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h3 className="line-clamp-2 font-display text-[1.35rem] font-semibold leading-tight tracking-[-0.03em] text-ink">
              {listing.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-steel">
              <UserAvatar className="h-7 w-7 text-[0.7rem] font-bold" user={listing.seller} />
              <span className="truncate">
                {listing.seller?.publicName || listing.seller?.name} | {listing.timeAgo}
              </span>
            </div>
          </div>
          <ArrowUpRight className="mt-1 text-slate-300 transition group-hover:text-navy" />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-3 py-1 font-semibold uppercase tracking-[0.16em] ${getConditionClasses(
              listing.condition,
            )}`}
          >
            {listing.condition}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
            <MapPin size={12} />
            {listing.neighborhood}
          </span>
          {listing.quantity > 1 ? (
            <span className="rounded-full bg-orange/10 px-3 py-1 font-semibold text-orange">
              {listing.quantity}x available
            </span>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {hasSalePrice ? (
                <span className="text-lg font-semibold text-slate-400 line-through">
                  {formatCadPrice(listing.previousPrice, listing.priceCurrency || "CAD")}
                </span>
              ) : null}
              <span className="font-display text-[2rem] font-semibold tracking-[-0.03em] text-ink">
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
            <p className="text-sm text-steel">
              {listing.views} views | {listing.offers} offers
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
