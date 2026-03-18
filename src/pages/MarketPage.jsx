import { ArrowUpDown, MapPin, SearchX } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
import EmptyState from "../components/ui/EmptyState";
import { neighborhoods } from "../data/mockData";
import { useMarketplace } from "../hooks/useMarketplace";

export default function MarketPage() {
  const navigate = useNavigate();
  const { gameSlug } = useParams();
  const { activeListings, gameCatalog, globalSearch, openCreateListing, setGlobalSearch } =
    useMarketplace();
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("All Winnipeg");
  const [sortBy, setSortBy] = useState("recent");
  const deferredSearch = useDeferredValue(globalSearch.trim().toLowerCase());

  const selectedGame = useMemo(() => {
    if (!gameSlug) {
      return gameCatalog.find((game) => game.slug === "all");
    }

    return gameCatalog.find((game) => game.slug === gameSlug) || gameCatalog[0];
  }, [gameCatalog, gameSlug]);

  const filteredListings = useMemo(() => {
    let results = [...activeListings];

    if (selectedGame?.slug && selectedGame.slug !== "all") {
      results = results.filter((listing) => listing.gameSlug === selectedGame.slug);
    }

    if (selectedNeighborhood !== "All Winnipeg") {
      results = results.filter(
        (listing) => listing.neighborhood === selectedNeighborhood,
      );
    }

    if (deferredSearch) {
      results = results.filter((listing) => {
        const searchableText = [
          listing.title,
          listing.game,
          listing.seller?.name,
          listing.description,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(deferredSearch);
      });
    }

    if (sortBy === "price-low") {
      results.sort((left, right) => left.priceCad - right.priceCad);
    } else if (sortBy === "price-high") {
      results.sort((left, right) => right.priceCad - left.priceCad);
    } else {
      results.sort((left, right) => right.sortTimestamp - left.sortTimestamp);
    }

    return results;
  }, [activeListings, deferredSearch, selectedGame, selectedNeighborhood, sortBy]);

  return (
    <div className="space-y-7">
      <section className="surface-card overflow-hidden">
        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="section-kicker">Market feed</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">
              {selectedGame?.name || "All Listings"}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-steel">
              {selectedGame?.description ||
                "Filter local listings by game, neighborhood, price, and search query."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="surface-muted p-4">
              <p className="text-sm text-steel">Matches</p>
              <p className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
                {filteredListings.length}
              </p>
            </div>
            <div className="surface-muted p-4">
              <p className="text-sm text-steel">Area</p>
              <p className="mt-2 text-lg font-semibold text-ink">{selectedNeighborhood}</p>
            </div>
            <div className="surface-muted p-4">
              <p className="text-sm text-steel">Search</p>
              <p className="mt-2 truncate text-lg font-semibold text-ink">
                {globalSearch || "Open feed"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card grid gap-4 p-5 lg:grid-cols-[1fr_1fr_1fr_auto] lg:p-6">
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-steel">
            <MapPin size={16} />
            Neighborhood
          </span>
          <select
            className="w-full rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
            value={selectedNeighborhood}
            onChange={(event) => setSelectedNeighborhood(event.target.value)}
          >
            {neighborhoods.map((neighborhood) => (
              <option key={neighborhood}>{neighborhood}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-steel">
            <ArrowUpDown size={16} />
            Sort
          </span>
          <select
            className="w-full rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="recent">Most recent</option>
            <option value="price-low">Price low to high</option>
            <option value="price-high">Price high to low</option>
          </select>
        </label>

        <div className="rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5">
          <p className="text-sm font-semibold text-steel">Header search</p>
          <p className="mt-2 text-sm text-ink">
            {globalSearch
              ? `"${globalSearch}"`
              : "Use the top search bar to filter by card, game, seller, or set."}
          </p>
        </div>

        <div className="flex items-end gap-3">
          {globalSearch ? (
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
              type="button"
              onClick={() => setGlobalSearch("")}
            >
              <SearchX size={16} />
              Clear search
            </button>
          ) : null}
        </div>
      </section>

      {filteredListings.length ? (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </section>
      ) : (
        <EmptyState
          action={
            <button
              className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white"
              type="button"
              onClick={() => {
                setGlobalSearch("");
                const opened = openCreateListing();
                if (!opened) {
                  navigate("/auth", { state: { from: "/market" } });
                }
              }}
            >
              Post a listing
            </button>
          }
          description="No listings match the current game, neighborhood, and search filters. Try widening the search or post the listing you want buyers to find."
          title="No active matches"
        />
      )}
    </div>
  );
}
