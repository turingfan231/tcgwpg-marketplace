import { Search, Star, Store } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import UserAvatar from "../components/shared/UserAvatar";
import EmptyState from "../components/ui/EmptyState";
import PageSkeleton from "../components/ui/PageSkeleton";
import RatingStars from "../components/ui/RatingStars";
import { useMarketplace } from "../hooks/useMarketplace";

export default function SellersPage() {
  const { loading, reviewBadgeCatalog, sellers } = useMarketplace();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("deals");

  const sellerFollowerCounts = useMemo(
    () =>
      sellers.reduce((accumulator, seller) => {
        (seller.followedSellerIds || []).forEach((followedId) => {
          accumulator[followedId] = (accumulator[followedId] || 0) + 1;
        });
        return accumulator;
      }, {}),
    [sellers],
  );

  const filteredSellers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const results = sellers.filter((seller) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        seller.publicName,
        seller.username,
        seller.name,
        seller.neighborhood,
        seller.bio,
        ...(seller.favoriteGames || []),
        ...(seller.badges || []).map((badge) => reviewBadgeCatalog[badge]?.label || badge),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

    results.sort((left, right) => {
      if (sortBy === "rating") {
        return right.overallRating - left.overallRating || right.reviewCount - left.reviewCount;
      }

      return right.completedDeals - left.completedDeals || right.overallRating - left.overallRating;
    });

    return results;
  }, [query, reviewBadgeCatalog, sellers, sortBy]);

  if (loading && !sellers.length) {
    return <PageSkeleton cards={6} titleWidth="w-72" />;
  }

  if (!sellers.length) {
    return (
      <EmptyState
        description="Seller profiles will appear here once users start posting."
        title="No sellers yet"
      />
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="console-shell p-4 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="section-kicker">Browse sellers</p>
            <h1 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
              Search local seller storefronts
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-steel sm:text-base sm:leading-8">
              Sort by completed deals or rating, then skim badges, favorite games, and meetup areas without opening every profile first.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem] xl:min-w-[34rem]">
            <label className="console-well px-4 py-3">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-steel">
                <Search size={15} />
                Search
              </span>
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Seller, badge, game, neighborhood"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="console-well px-4 py-3">
              <span className="mb-2 block text-sm font-semibold text-steel">Sort by</span>
              <select
                className="w-full bg-transparent text-sm outline-none"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="deals">Completed deals</option>
                <option value="rating">Rating</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredSellers.map((seller) => (
          <Link
            key={seller.id}
            className="console-panel p-3 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lift sm:p-4"
            to={`/seller/${seller.id}`}
          >
            <div className="flex items-start justify-between gap-2.5 sm:gap-3">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <UserAvatar className="h-10 w-10 text-[0.8rem] font-bold sm:h-12 sm:w-12 sm:text-sm" user={seller} />
                <div className="min-w-0">
                  <h2 className="truncate font-display text-[1.12rem] font-semibold tracking-[-0.03em] text-ink sm:text-[1.45rem]">
                    {seller.publicName || seller.name}
                  </h2>
                  <p className="truncate text-[0.8rem] text-steel sm:text-sm">{seller.neighborhood}</p>
                </div>
              </div>
              {seller.verified ? (
                <span className="rounded-full bg-orange/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange sm:px-3 sm:text-[11px] sm:tracking-[0.18em]">
                  Verified
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex items-center gap-2.5 sm:mt-4 sm:gap-3">
              <RatingStars value={seller.overallRating} />
              <span className="text-[0.8rem] text-steel sm:text-sm">
                {seller.overallRating.toFixed(1)} from {seller.reviewCount} reviews
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
              {(seller.favoriteGames || []).slice(0, 3).map((game) => (
                <span
                  key={`${seller.id}-${game}`}
                  className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700 sm:px-3 sm:text-xs sm:tracking-[0.16em]"
                >
                  {game}
                </span>
              ))}
              {(seller.badges || []).slice(0, 3).map((badge) => (
                <span
                  key={`${seller.id}-${badge}`}
                  className="rounded-full bg-navy/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy sm:px-3 sm:text-xs sm:tracking-[0.16em]"
                >
                  {reviewBadgeCatalog[badge]?.label || badge}
                </span>
              ))}
            </div>

            <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3 sm:grid-cols-2">
              <div className="console-well px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-[11px] sm:tracking-[0.18em]">
                  Deals
                </p>
                <p className="mt-1.5 inline-flex items-center gap-2 text-sm font-semibold text-ink sm:mt-2 sm:text-base">
                  <Store size={15} className="text-orange" />
                  {seller.completedDeals}
                </p>
              </div>
              <div className="console-well px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-[11px] sm:tracking-[0.18em]">
                  Rating
                </p>
                <p className="mt-1.5 inline-flex items-center gap-2 text-sm font-semibold text-ink sm:mt-2 sm:text-base">
                  <Star size={15} className="text-navy" />
                  {seller.overallRating.toFixed(1)}
                </p>
              </div>
              <div className="console-well px-3 py-2.5 sm:px-4 sm:py-3 sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-[11px] sm:tracking-[0.18em]">
                  Followers
                </p>
                <p className="mt-1.5 inline-flex items-center gap-2 text-sm font-semibold text-ink sm:mt-2 sm:text-base">
                  <Store size={15} className="text-navy" />
                  {sellerFollowerCounts[seller.id] || 0}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                {seller.riskLabel}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                {seller.accountAgeLabel} old
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                {seller.responseRate}% response
              </span>
            </div>

            <p className="mt-3 line-clamp-3 text-[0.84rem] leading-6 text-steel sm:mt-4 sm:text-sm sm:leading-7">
              {seller.bio || "Local seller storefront."}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
