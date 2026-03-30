import {
  ArrowUpDown,
  BookmarkPlus,
  MapPin,
  Search,
  SearchX,
  SlidersHorizontal,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
import EmptyState from "../components/ui/EmptyState";
import PageSkeleton from "../components/ui/PageSkeleton";
import { neighborhoods } from "../data/mockData";
import { useMarketplace } from "../hooks/useMarketplace";

const SAVED_FILTERS_KEY = "tcgwpg.market.savedFilters";

function readSavedFilters() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(SAVED_FILTERS_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeSavedFilters(filters) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(filters.slice(0, 8)));
  } catch {
    // Ignore local storage write errors.
  }
}

function buildSavedFilterLabel({ gameName, neighborhood, search }) {
  const parts = [gameName || "All listings"];
  if (neighborhood && neighborhood !== "All Winnipeg") {
    parts.push(neighborhood);
  }
  if (search) {
    parts.push(search);
  }
  return parts.join(" · ");
}

export default function MarketPage() {
  const navigate = useNavigate();
  const { gameSlug } = useParams();
  const {
    activeListings,
    gameCatalog,
    globalSearch,
    loading,
    openCreateListing,
    setGlobalSearch,
  } = useMarketplace();
  const [marketSearch, setMarketSearch] = useState(globalSearch);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("All Winnipeg");
  const [sortBy, setSortBy] = useState("newest");
  const [savedFilters, setSavedFilters] = useState(readSavedFilters);
  const deferredSearch = useDeferredValue(marketSearch.trim().toLowerCase());

  useEffect(() => {
    setMarketSearch(globalSearch);
  }, [globalSearch]);

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
      results = results.filter((listing) => listing.neighborhood === selectedNeighborhood);
    }

    if (deferredSearch) {
      results = results.filter((listing) => {
        const searchableText = [
          listing.title,
          listing.game,
          listing.description,
          listing.condition,
          listing.neighborhood,
          listing.seller?.name,
          listing.seller?.publicName,
          listing.seller?.username,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(deferredSearch);
      });
    }

    if (sortBy === "price-low") {
      results.sort((left, right) => left.priceCad - right.priceCad);
    } else if (sortBy === "price-high") {
      results.sort((left, right) => right.priceCad - left.priceCad);
    } else if (sortBy === "oldest") {
      results.sort((left, right) => left.sortTimestamp - right.sortTimestamp);
    } else {
      results.sort((left, right) => right.sortTimestamp - left.sortTimestamp);
    }

    return results;
  }, [activeListings, deferredSearch, selectedGame, selectedNeighborhood, sortBy]);

  function handleSearchChange(value) {
    setMarketSearch(value);
    setGlobalSearch(value);
  }

  function clearFilters() {
    setSelectedNeighborhood("All Winnipeg");
    setSortBy("newest");
    handleSearchChange("");
  }

  function saveCurrentFilter() {
    const nextFilter = {
      id: `filter-${Date.now()}`,
      label: buildSavedFilterLabel({
        gameName: selectedGame?.name,
        neighborhood: selectedNeighborhood,
        search: marketSearch.trim(),
      }),
      gameSlug: selectedGame?.slug || "all",
      neighborhood: selectedNeighborhood,
      search: marketSearch.trim(),
      sortBy,
    };
    const nextFilters = [
      nextFilter,
      ...savedFilters.filter((filter) => filter.label !== nextFilter.label),
    ].slice(0, 8);
    setSavedFilters(nextFilters);
    writeSavedFilters(nextFilters);
  }

  function applySavedFilter(filter) {
    handleSearchChange(filter.search || "");
    setSelectedNeighborhood(filter.neighborhood || "All Winnipeg");
    setSortBy(filter.sortBy || "recent");
    navigate(filter.gameSlug && filter.gameSlug !== "all" ? `/market/${filter.gameSlug}` : "/market");
  }

  const activeFilterChips = [
    selectedGame?.slug !== "all" ? selectedGame?.name : null,
    deferredSearch ? `Search: ${marketSearch.trim()}` : null,
    selectedNeighborhood !== "All Winnipeg" ? selectedNeighborhood : null,
      sortBy !== "newest"
      ? sortBy === "price-low"
        ? "Price low to high"
        : sortBy === "price-high"
          ? "Price high to low"
          : "Oldest to newest"
      : null,
  ].filter(Boolean);

  if (loading && !activeListings.length) {
    return <PageSkeleton cards={6} titleWidth="w-60" />;
  }

  return (
    <div className="space-y-7">
      <section className="console-shell overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-4 sm:hidden">
          <div className="min-w-0">
            <p className="section-kicker">Market</p>
            <h1 className="mt-1 truncate font-display text-[1.55rem] font-semibold tracking-[-0.05em] text-ink">
              {selectedGame?.name || "All listings"}
            </h1>
            <p className="mt-1 text-sm text-steel">{filteredListings.length} live matches.</p>
          </div>
          <button
            className="shrink-0 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-soft"
            type="button"
            onClick={() => openCreateListing({ type: "WTS" })}
          >
            Sell
          </button>
        </div>
        <div className="hidden gap-5 p-5 sm:grid sm:p-7 xl:grid-cols-[1.3fr_0.7fr] xl:items-end">
          <div>
            <p className="section-kicker">Market feed</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-[3.25rem]">
              {selectedGame?.name || "All Listings"}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-steel">
              {selectedGame?.description ||
                "Search by card, seller, neighborhood, or condition without leaving the market feed."}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <span className="inline-flex rounded-full border border-[rgba(203,220,231,0.92)] bg-white/82 px-4 py-2 text-sm font-semibold text-ink">
              {filteredListings.length} matches
            </span>
            <span className="inline-flex rounded-full border border-[rgba(203,220,231,0.92)] bg-white/82 px-4 py-2 text-sm font-semibold text-ink">
              {selectedNeighborhood}
            </span>
            <span className="inline-flex rounded-full border border-[rgba(203,220,231,0.92)] bg-white/82 px-4 py-2 text-sm font-semibold text-ink">
              {savedFilters.length} saved
            </span>
          </div>
        </div>
      </section>

      <section className="console-panel space-y-4 p-4 sm:space-y-5 sm:p-5 lg:p-6">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.75fr)_minmax(0,0.6fr)_auto]">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-steel">
              <Search size={16} />
              Search the market
            </span>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-steel"
                size={16}
              />
              <input
              className="w-full rounded-[20px] border border-[rgba(203,220,231,0.92)] bg-[rgba(249,252,255,0.84)] py-3 pl-11 pr-4 outline-none transition focus:border-navy focus:bg-white"
                placeholder="Card, set code, seller, condition"
                value={marketSearch}
                onChange={(event) => handleSearchChange(event.target.value)}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-steel">
              <MapPin size={16} />
              Neighborhood
            </span>
            <select
              className="w-full rounded-[20px] border border-[rgba(203,220,231,0.92)] bg-[rgba(249,252,255,0.84)] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
              className="w-full rounded-[20px] border border-[rgba(203,220,231,0.92)] bg-[rgba(249,252,255,0.84)] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="newest">Newest to oldest</option>
              <option value="oldest">Oldest to newest</option>
              <option value="price-low">Price low to high</option>
              <option value="price-high">Price high to low</option>
            </select>
          </label>

          <div className="flex flex-col justify-end gap-2 sm:flex-row xl:flex-col">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-4 py-3 text-sm font-semibold text-white"
              type="button"
              onClick={saveCurrentFilter}
            >
              <BookmarkPlus size={16} />
              Save filter
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
              type="button"
              onClick={clearFilters}
            >
              <SearchX size={16} />
              Reset
            </button>
          </div>
        </div>

        {activeFilterChips.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-steel">
              <SlidersHorizontal size={14} />
              Active
            </span>
            {activeFilterChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[rgba(203,220,231,0.92)] bg-white/75 px-3 py-1.5 text-sm font-semibold text-ink"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        {savedFilters.length ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
              Saved searches
            </p>
            <div className="header-chip-scroll flex gap-2 overflow-x-auto pb-1">
              {savedFilters.map((filter) => (
                <button
                  key={filter.id}
                  className="whitespace-nowrap rounded-full border border-[rgba(203,220,231,0.92)] bg-white/82 px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-300 hover:bg-[rgba(250,253,255,0.95)]"
                  type="button"
                  onClick={() => applySavedFilter(filter)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {filteredListings.length ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                clearFilters();
                const opened = openCreateListing({ type: "WTS" });
                if (!opened) {
                  navigate("/auth", { state: { from: "/market" } });
                }
              }}
            >
              Post a listing
            </button>
          }
          description="No listings match the current game, search, and neighborhood filters. Try widening the search or save a broader filter for later."
          title="No active matches"
        />
      )}
    </div>
  );
}
