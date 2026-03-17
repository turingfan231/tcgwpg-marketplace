import { Search, Star, Store } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";
import RatingStars from "../components/ui/RatingStars";
import { useMarketplace } from "../hooks/useMarketplace";

export default function SellersPage() {
  const { sellers } = useMarketplace();
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
        seller.name,
        seller.neighborhood,
        ...(seller.favoriteGames || []),
      ]
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
  }, [query, sellers, sortBy]);

  if (!sellers.length) {
    return <EmptyState description="Seller profiles will appear here once users start posting." title="No sellers yet" />;
  }

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Browse sellers</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
              Search local seller storefronts
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-8 text-steel">
              Compare seller ratings, completed deals, favorite games, and meetup areas.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-steel">
                <Search size={15} />
                Search
              </span>
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Name, game, neighborhood"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3">
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

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredSellers.map((seller) => (
          <Link
            key={seller.id}
            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
            to={`/seller/${seller.id}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-lg font-bold text-white">
                  {seller.initials}
                </div>
                <div>
                  <h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                    {seller.publicName || seller.name}
                  </h2>
                  <p className="mt-1 text-sm text-steel">{seller.neighborhood}</p>
                </div>
              </div>
              {seller.verified ? (
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] bg-[#f8f5ee] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                  Deals done
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-ink">
                  <Store size={15} className="text-orange" />
                  {seller.completedDeals}
                </p>
              </div>
              <div className="rounded-[20px] bg-[#f8f5ee] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                  Rating
                </p>
                <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-ink">
                  <Star size={15} className="text-navy" />
                  {seller.overallRating.toFixed(1)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-steel">
              {seller.bio || "Local seller storefront."}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
