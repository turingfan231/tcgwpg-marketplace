import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BookmarkPlus,
  MapPin,
  Search,
  SearchX,
  SlidersHorizontal,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
import ModalShell from "../components/ui/ModalShell";
import EmptyState from "../components/ui/EmptyState";
import PageSkeleton from "../components/ui/PageSkeleton";
import SeoHead from "../components/seo/SeoHead";
import { neighborhoods } from "../data/mockData";
import { useMarketplace } from "../hooks/useMarketplace";
import { trackEvent } from "../lib/analytics";
import { filterAndSortListings } from "../lib/marketFilters";

const SAVED_FILTERS_KEY = "tcgwpg.market.savedFilters";
const MARKET_SCROLL_STATE_KEY = "tcgwpg.market.scrollState";
const DESKTOP_PAGE_SIZE = 12;
const MOBILE_BATCH_SIZE = 8;

const scopePills = [
  { id: "listings", label: "Listings", path: "/market" },
  { id: "cards", label: "Cards", path: "/collection" },
  { id: "sellers", label: "Sellers", path: "/sellers" },
  { id: "stores", label: "Stores", path: "/stores" },
  { id: "events", label: "Events", path: "/events" },
];

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

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (event) => setIsMobile(event.matches);
    setIsMobile(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isMobile;
}

function saveMarketScrollState({ path, scrollY }) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      MARKET_SCROLL_STATE_KEY,
      JSON.stringify({
        path,
        scrollY,
      }),
    );
  } catch {
    // Ignore storage issues.
  }
}

function restoreMarketScrollState(path) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const rawState = window.sessionStorage.getItem(MARKET_SCROLL_STATE_KEY);
    if (!rawState) {
      return;
    }

    const parsed = JSON.parse(rawState);
    if (parsed?.path !== path || typeof parsed?.scrollY !== "number") {
      return;
    }

    window.sessionStorage.removeItem(MARKET_SCROLL_STATE_KEY);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: parsed.scrollY, behavior: "auto" });
    });
  } catch {
    // Ignore storage issues.
  }
}

function MarketControls({
  marketSearch,
  selectedNeighborhood,
  sortBy,
  onSearchChange,
  onNeighborhoodChange,
  onSortChange,
  onSaveFilter,
  onClearFilters,
  compact = false,
}) {
  return (
    <div className={`grid gap-2.5 ${compact ? "" : "xl:grid-cols-[minmax(0,1.55fr)_minmax(0,0.72fr)_minmax(0,0.58fr)_auto]"}`}>
      <label className="block">
        <span className="mb-1.5 flex items-center gap-2 text-[0.82rem] font-semibold text-steel">
          <Search size={16} />
          Search the market
        </span>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel"
            size={15}
          />
          <input
            aria-label="Search listings"
            className="w-full rounded-[16px] border border-[var(--line)] bg-[var(--input-bg)] py-2.5 pl-10 pr-3.5 text-[0.92rem] text-ink outline-none transition focus:border-navy focus:bg-[var(--surface-solid)]"
            placeholder="Card, set code, seller, condition"
            value={marketSearch}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-2 text-[0.82rem] font-semibold text-steel">
          <MapPin size={16} />
          Neighborhood
        </span>
        <select
          aria-label="Neighborhood"
          className="w-full rounded-[16px] border border-[var(--line)] bg-[var(--input-bg)] px-3.5 py-2.5 text-[0.92rem] text-ink outline-none transition focus:border-navy focus:bg-[var(--surface-solid)]"
          value={selectedNeighborhood}
          onChange={(event) => onNeighborhoodChange(event.target.value)}
        >
          {neighborhoods.map((neighborhood) => (
            <option key={neighborhood}>{neighborhood}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-center gap-2 text-[0.82rem] font-semibold text-steel">
          <ArrowUpDown size={16} />
          Sort
        </span>
        <select
          aria-label="Sort listings"
          className="w-full rounded-[16px] border border-[var(--line)] bg-[var(--input-bg)] px-3.5 py-2.5 text-[0.92rem] text-ink outline-none transition focus:border-navy focus:bg-[var(--surface-solid)]"
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value)}
        >
          <option value="newest">Newest to oldest</option>
          <option value="oldest">Oldest to newest</option>
          <option value="price-low">Price low to high</option>
          <option value="price-high">Price high to low</option>
        </select>
      </label>

      <div className={`flex gap-2 ${compact ? "sm:flex-row" : "flex-col justify-end sm:flex-row xl:flex-col"}`}>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-navy px-3.5 py-2.5 text-[0.84rem] font-semibold text-white"
          type="button"
          onClick={onSaveFilter}
        >
          <BookmarkPlus size={16} />
          Save filter
        </button>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--surface-solid)] px-3.5 py-2.5 text-[0.84rem] font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
          type="button"
          onClick={onClearFilters}
        >
          <SearchX size={16} />
          Reset
        </button>
      </div>
    </div>
  );
}

export default function MarketPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameSlug } = useParams();
  const isMobileViewport = useIsMobileViewport();
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
  const [desktopPage, setDesktopPage] = useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_BATCH_SIZE);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const deferredSearch = useDeferredValue(marketSearch.trim().toLowerCase());

  useEffect(() => {
    setMarketSearch(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    restoreMarketScrollState(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    setDesktopPage(1);
    setMobileVisibleCount(MOBILE_BATCH_SIZE);
  }, [deferredSearch, selectedNeighborhood, sortBy, gameSlug]);

  const selectedGame = useMemo(() => {
    if (!gameSlug) {
      return gameCatalog.find((game) => game.slug === "all");
    }

    return gameCatalog.find((game) => game.slug === gameSlug) || gameCatalog[0];
  }, [gameCatalog, gameSlug]);

  const filteredListings = useMemo(() => {
    return filterAndSortListings(activeListings, {
      search: deferredSearch,
      gameSlug: selectedGame?.slug,
      neighborhood: selectedNeighborhood,
      sortBy,
    });
  }, [activeListings, deferredSearch, selectedGame, selectedNeighborhood, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / DESKTOP_PAGE_SIZE));
  const desktopResults = filteredListings.slice(
    (desktopPage - 1) * DESKTOP_PAGE_SIZE,
    desktopPage * DESKTOP_PAGE_SIZE,
  );
  const mobileResults = filteredListings.slice(0, mobileVisibleCount);
  const visibleListings = isMobileViewport ? mobileResults : desktopResults;

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

  const listingJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${selectedGame?.name || "All listings"} | TCG WPG Marketplace`,
    description:
      selectedGame?.description ||
      "Browse live local trading card listings, filters, stores, and sellers in Winnipeg.",
    url:
      typeof window !== "undefined"
        ? `${window.location.origin}${location.pathname}`
        : `https://tcgwpg.com${location.pathname}`,
  };

  function handleSearchChange(value) {
    setMarketSearch(value);
    setGlobalSearch(value);
  }

  function clearFilters() {
    setSelectedNeighborhood("All Winnipeg");
    setSortBy("newest");
    handleSearchChange("");
    trackEvent("market_filters_cleared", {
      game: selectedGame?.slug || "all",
    });
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
    trackEvent("market_filter_saved", nextFilter);
  }

  function applySavedFilter(filter) {
    handleSearchChange(filter.search || "");
    setSelectedNeighborhood(filter.neighborhood || "All Winnipeg");
    setSortBy(filter.sortBy || "newest");
    setShowMobileFilters(false);
    navigate(filter.gameSlug && filter.gameSlug !== "all" ? `/market/${filter.gameSlug}` : "/market");
    trackEvent("market_filter_applied", {
      filterId: filter.id,
      game: filter.gameSlug || "all",
    });
  }

  function openScope(scope) {
    navigate(scope.path);
    trackEvent("market_scope_opened", { scope: scope.id });
  }

  function handleOpenListing(listingId) {
    saveMarketScrollState({
      path: location.pathname,
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
    });
    trackEvent("listing_card_opened", {
      listingId,
      source: "market_grid",
      game: selectedGame?.slug || "all",
    });
  }

  if (loading && !activeListings.length) {
    return <PageSkeleton cards={6} titleWidth="w-60" />;
  }

  return (
    <>
      <SeoHead
        canonicalPath={location.pathname}
        description={
          selectedGame?.description ||
          "Browse local TCG listings, sellers, stores, and events inside TCG WPG Marketplace."
        }
        jsonLd={listingJsonLd}
        title={selectedGame?.name ? `${selectedGame.name} listings` : "All listings"}
        type="website"
      />

      <main className="space-y-4 sm:space-y-5">
        <section className="console-shell overflow-hidden">
          <div className="space-y-3 p-3.5 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="section-kicker">Marketplace</p>
                <h1 className="mt-1 font-display text-[1.4rem] font-semibold tracking-[-0.05em] text-ink sm:mt-2 sm:text-[2.4rem]">
                  {selectedGame?.name || "All listings"}
                </h1>
                <p className="mt-1.5 max-w-2xl text-[0.88rem] leading-6 text-steel sm:mt-3 sm:text-[0.95rem] sm:leading-7">
                  {selectedGame?.description ||
                    "Search by card, neighborhood, seller, or condition without leaving the live marketplace."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-solid)] px-3.5 py-1.5 text-[0.82rem] font-semibold text-ink">
                  {filteredListings.length} matches
                </span>
                <button
                  className="inline-flex items-center justify-center rounded-full bg-navy px-4 py-2 text-[0.82rem] font-semibold text-white shadow-soft"
                  type="button"
                  onClick={() => openCreateListing({ type: "WTS" })}
                >
                  Post listing
                </button>
              </div>
            </div>

            <nav
              aria-label="Marketplace scopes"
              className="header-chip-scroll flex gap-2 overflow-x-auto pb-1"
            >
              {scopePills.map((scope) => {
                const isActive = scope.id === "listings";
                return (
                  <button
                    key={scope.id}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-full px-3.5 py-2 text-[0.82rem] font-semibold transition ${
                      isActive
                        ? "bg-navy text-white shadow-soft"
                        : "border border-[var(--line)] bg-[var(--surface-solid)] text-steel hover:border-slate-300 hover:text-ink"
                    }`}
                    type="button"
                    onClick={() => openScope(scope)}
                  >
                    {scope.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </section>

        <section className="console-panel space-y-3.5 p-3.5 sm:space-y-4 sm:p-4.5 lg:p-5">
          <div className="sm:hidden">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-[0.82rem] font-semibold text-steel">
                <Search size={16} />
                Search the market
              </span>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel"
                  size={15}
                />
                <input
                  aria-label="Search listings"
                  className="w-full rounded-[16px] border border-[var(--line)] bg-[var(--input-bg)] py-2.5 pl-10 pr-3.5 text-[0.92rem] text-ink outline-none transition focus:border-navy focus:bg-[var(--surface-solid)]"
                  placeholder="Card, set code, seller, condition"
                  value={marketSearch}
                  onChange={(event) => handleSearchChange(event.target.value)}
                />
              </div>
            </label>

            <div className="mt-2.5 flex gap-2">
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--surface-solid)] px-3.5 py-2.5 text-[0.84rem] font-semibold text-ink"
                type="button"
                onClick={() => setShowMobileFilters(true)}
              >
                <SlidersHorizontal size={16} />
                Filters
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-navy px-3.5 py-2.5 text-[0.84rem] font-semibold text-white"
                type="button"
                onClick={saveCurrentFilter}
              >
                <BookmarkPlus size={16} />
                Save
              </button>
              <button
                aria-label="Reset filters"
                className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-[var(--line)] bg-[var(--surface-solid)] px-3.5 py-2.5 text-[0.84rem] font-semibold text-steel"
                type="button"
                onClick={clearFilters}
              >
                <SearchX size={16} />
              </button>
            </div>
          </div>

          <div className="hidden sm:block">
            <MarketControls
              marketSearch={marketSearch}
              selectedNeighborhood={selectedNeighborhood}
              sortBy={sortBy}
              onSearchChange={handleSearchChange}
              onNeighborhoodChange={setSelectedNeighborhood}
              onSortChange={setSortBy}
              onSaveFilter={saveCurrentFilter}
              onClearFilters={clearFilters}
            />
          </div>

          {activeFilterChips.length ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-steel">
                <SlidersHorizontal size={14} />
                Active
              </span>
              {activeFilterChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-[var(--line)] bg-[var(--surface-solid)] px-2.5 py-1 text-[0.78rem] font-semibold text-ink"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}

          {savedFilters.length ? (
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-steel">
                Saved searches
              </p>
              <div className="header-chip-scroll flex gap-2 overflow-x-auto pb-1">
                {savedFilters.map((filter) => (
                  <button
                    key={filter.id}
                    className="whitespace-nowrap rounded-full border border-[var(--line)] bg-[var(--surface-solid)] px-3 py-1.5 text-[0.8rem] font-semibold text-ink transition hover:border-slate-300 hover:bg-[var(--surface-hover)]"
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

        {visibleListings.length ? (
          <section aria-label="Listings results" className="space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} onOpen={handleOpenListing} />
              ))}
            </div>

            {isMobileViewport && mobileVisibleCount < filteredListings.length ? (
              <div className="flex justify-center">
                <button
                  className="rounded-full border border-[var(--line)] bg-[var(--surface-solid)] px-5 py-3 text-sm font-semibold text-ink transition hover:border-slate-300"
                  type="button"
                  onClick={() => {
                    setMobileVisibleCount((current) =>
                      Math.min(current + MOBILE_BATCH_SIZE, filteredListings.length),
                    );
                    trackEvent("market_load_more", {
                      visibleCount: Math.min(
                        mobileVisibleCount + MOBILE_BATCH_SIZE,
                        filteredListings.length,
                      ),
                    });
                  }}
                >
                  Load more listings
                </button>
              </div>
            ) : null}

            {!isMobileViewport && totalPages > 1 ? (
              <nav
                aria-label="Pagination"
                className="flex items-center justify-between gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--surface-solid)] px-4 py-3"
              >
                <p className="text-sm text-steel">
                  Page {desktopPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Previous page"
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3.5 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={desktopPage === 1}
                    type="button"
                    onClick={() => setDesktopPage((current) => Math.max(1, current - 1))}
                  >
                    <ArrowLeft size={15} />
                    Previous
                  </button>
                  <button
                    aria-label="Next page"
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3.5 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={desktopPage === totalPages}
                    type="button"
                    onClick={() =>
                      setDesktopPage((current) => Math.min(totalPages, current + 1))
                    }
                  >
                    Next
                    <ArrowRight size={15} />
                  </button>
                </div>
              </nav>
            ) : null}
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

        {showMobileFilters ? (
          <ModalShell
            mobileSheet
            subtitle="Tune the market feed without losing your place in the scroll."
            title="Filters"
            onClose={() => setShowMobileFilters(false)}
          >
            <div className="space-y-4 px-4 py-4">
              <MarketControls
                compact
                marketSearch={marketSearch}
                selectedNeighborhood={selectedNeighborhood}
                sortBy={sortBy}
                onSearchChange={handleSearchChange}
                onNeighborhoodChange={setSelectedNeighborhood}
                onSortChange={setSortBy}
                onSaveFilter={() => {
                  saveCurrentFilter();
                  setShowMobileFilters(false);
                }}
                onClearFilters={clearFilters}
              />
              <button
                className="w-full rounded-[16px] bg-navy px-4 py-3 text-sm font-semibold text-white"
                type="button"
                onClick={() => setShowMobileFilters(false)}
              >
                Show {filteredListings.length} matches
              </button>
            </div>
          </ModalShell>
        ) : null}
      </main>
    </>
  );
}
