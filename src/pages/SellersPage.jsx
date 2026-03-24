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
    <div className="space-y-6">
      <section className="console-shell p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="section-kicker">Browse sellers</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
              Search local seller storefronts
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-8 text-steel">
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredSellers.map((seller) => (
          <Link
            key={seller.id}
            className="console-panel p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lift"
            to={`/seller/${seller.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar className="h-12 w-12 text-sm font-bold" user={seller} />
                <div className="min-w-0">
                  <h2 className="truncate font-display text-[1.45rem] font-semibold tracking-[-0.03em] text-ink">
                    {seller.publicName || seller.name}
                  </h2>
                  <p className="truncate text-sm text-steel">{seller.neighborhood}</p>
                </div>
              </div>
              {seller.verified ? (
                <span className="rounded-full bg-orange/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange">
                  Verified
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <RatingStars value={seller.overallRating} />
              <span className="text-sm text-steel">
                {seller.overallRating.toFixed(1)} from {seller.reviewCount} reviews
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(seller.favoriteGames || []).slice(0, 3).map((game) => (
                <span
                  key={`${seller.id}-${game}`}
                  className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700"
                >
                  {game}
                </span>
              ))}
              {(seller.badges || []).slice(0, 3).map((badge) => (
                <span
                  key={`${seller.id}-${badge}`}
                  className="rounded-full bg-navy/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-navy"
                >
                  {reviewBadgeCatalog[badge]?.label || badge}
                </span>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="console-well px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
                  Deals
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-ink">
                  <Store size={15} className="text-orange" />
                  {seller.completedDeals}
                </p>
              </div>
              <div className="console-well px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
                  Rating
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-ink">
                  <Star size={15} className="text-navy" />
                  {seller.overallRating.toFixed(1)}
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

            <p className="mt-4 line-clamp-3 text-sm leading-7 text-steel">
              {seller.bio || "Local seller storefront."}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
