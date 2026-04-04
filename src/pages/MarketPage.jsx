import {
  Flame,
  Grid3X3,
  Heart,
  LayoutList,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useDeferredValue, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import { useMarketplace } from "../hooks/useMarketplace";
import { filterAndSortListings } from "../lib/marketFilters";
import { m, conditionStyle } from "../mobile/design";
import {
  compactTimeLabel,
  formatPrice,
  listingArtwork,
  rememberAndNavigateToListing,
  sellerInitial,
  sellerLabel,
} from "../mobile/helpers";
import { ChoicePill, EmptyBlock, MobileScreen, PullToRefresh } from "../mobile/primitives";

const SORT_OPTIONS = [
  { id: "recent", label: "Recent" },
  { id: "popular", label: "Popular" },
  { id: "price-low", label: "Price ↑" },
  { id: "price-high", label: "Price ↓" },
];

const CONDITION_OPTIONS = ["All", "Mint", "NM", "LP", "MP", "HP"];

const GAME_ICONS = {
  all: "🎴",
  pokemon: "⚡",
  magic: "🔮",
  "yu-gi-oh": "🌀",
  "one-piece": "🏴‍☠️",
  lorcana: "✨",
  "dragon-ball-fusion-world": "🔥",
  "union-arena": "⭐",
};

function gameLabel(game) {
  const raw = String(game?.shortName || game?.name || "All");
  return raw === "Pokemon" ? "Pokémon" : raw;
}

function FeedRow({ favorite, listing, onFavorite, onOpen }) {
  const seller = listing?.seller || listing;
  const rating = Number(listing?.seller?.overallRating || listing?.seller?.rating || seller?.overallRating || 0);
  const tone = conditionStyle(listing?.condition);

  return (
    <motion.button
      className="flex w-full cursor-pointer overflow-hidden rounded-xl text-left"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${m.border}`,
        contentVisibility: "auto",
        containIntrinsicSize: "96px 720px",
      }}
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
    >
      <div className="relative w-[82px] shrink-0 overflow-hidden">
        <img
          alt={listing.title}
          className="h-full w-full object-cover"
          decoding="async"
          loading="lazy"
          src={listingArtwork(listing)}
          style={{ minHeight: 88 }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 60%, rgba(10,10,12,0.3) 100%)" }} />
        <div
          className="absolute left-1.5 top-1.5 rounded px-[5px] py-[1px]"
          style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${tone.color}20` }}
        >
          <span className="text-[7px]" style={{ color: tone.color, fontWeight: 700, letterSpacing: "0.02em" }}>
            {tone.label}
          </span>
        </div>
        {Number(listing?.views || 0) > 50 ? (
          <div
            className="absolute bottom-1.5 left-1.5 flex h-[15px] w-[15px] items-center justify-center rounded-full"
            style={{ background: "rgba(239,68,68,0.3)" }}
          >
            <Flame size={7} style={{ color: "#f87171" }} />
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between px-2.5 py-2">
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[12px]" style={{ color: "#e8e8ec", fontWeight: 600, lineHeight: 1.3 }}>
              {listing.title}
            </p>
            <span className="shrink-0 text-[14px] tabular-nums" style={{ color: "#f4f4f6", fontWeight: 700, lineHeight: 1 }}>
              {formatPrice(listing.priceCad ?? listing.price, listing.priceCurrency || "CAD")}
            </span>
          </div>
          <p className="mt-[2px] truncate text-[9.5px]" style={{ color: "#48484f", fontWeight: 400 }}>
            {[listing.setName || listing.set, listing.game].filter(Boolean).join(" | ")}
          </p>
        </div>

        <div className="mt-1.5 flex items-center border-t pt-1.5" style={{ borderColor: "rgba(255,255,255,0.035)" }}>
          <div
            className="mr-[4px] flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full text-[6px] text-white"
            style={{ background: "#2a2a32", fontWeight: 700 }}
          >
            {sellerInitial(seller)}
          </div>
          <span className="truncate text-[9px]" style={{ color: "#555560", fontWeight: 500 }}>
            {sellerLabel(seller)}
          </span>
          {rating ? (
            <>
              <span className="mx-1 text-[7px]" style={{ color: "#fbbf24" }}>
                ★
              </span>
              <span className="text-[8px]" style={{ color: "#404048", fontWeight: 400 }}>
                {rating.toFixed(1)}
              </span>
            </>
          ) : null}
          {listing.neighborhood ? (
            <>
              <div className="mx-1.5 h-2 w-px" style={{ background: "rgba(255,255,255,0.04)" }} />
              <MapPin size={8} className="shrink-0" style={{ color: "#333340" }} />
              <span className="ml-[2px] truncate text-[8px]" style={{ color: "#383840", fontWeight: 400 }}>
                {listing.neighborhood}
              </span>
            </>
          ) : null}
          <div className="flex-1" />
          <span className="mr-1 shrink-0 text-[8px]" style={{ color: "#282830", fontWeight: 400 }}>
            {compactTimeLabel(listing.sortTimestamp || listing.createdAt || listing.timeAgo)}
          </span>
          <motion.button
            className="p-[2px]"
            type="button"
            whileTap={{ scale: 0.7 }}
            onClick={(event) => {
              event.stopPropagation();
              onFavorite?.();
            }}
          >
            <Heart
              fill={favorite ? "#ef4444" : "none"}
              size={13}
              strokeWidth={favorite ? 0 : 1.5}
              style={{ color: favorite ? "#ef4444" : "#28282f" }}
            />
          </motion.button>
        </div>
      </div>
    </motion.button>
  );
}

function GridCard({ favorite, listing, onFavorite, onOpen }) {
  const tone = conditionStyle(listing?.condition);

  return (
    <motion.button
      className="cursor-pointer overflow-hidden rounded-xl text-left"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${m.border}`,
        contentVisibility: "auto",
        containIntrinsicSize: "240px 220px",
      }}
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onOpen}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          alt={listing.title}
          className="h-full w-full object-cover"
          decoding="async"
          loading="lazy"
          src={listingArtwork(listing)}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(10,10,12,0.8) 100%)" }} />
        <div
          className="absolute left-1.5 top-1.5 rounded px-[5px] py-[1px]"
          style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${tone.color}20` }}
        >
          <span className="text-[7px]" style={{ color: tone.color, fontWeight: 700 }}>
            {tone.label}
          </span>
        </div>
        <motion.button
          className="absolute right-1.5 top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full"
          style={{ background: "rgba(0,0,0,0.35)" }}
          type="button"
          whileTap={{ scale: 0.7 }}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite?.();
          }}
        >
          <Heart
            fill={favorite ? "#ef4444" : "none"}
            size={11}
            strokeWidth={favorite ? 0 : 1.5}
            style={{ color: favorite ? "#ef4444" : "rgba(255,255,255,0.5)" }}
          />
        </motion.button>
        {Number(listing?.views || 0) > 50 ? (
          <div className="absolute bottom-1.5 right-1.5 flex h-[15px] w-[15px] items-center justify-center rounded-full" style={{ background: "rgba(239,68,68,0.3)" }}>
            <Flame size={7} style={{ color: "#f87171" }} />
          </div>
        ) : null}
        <div className="absolute bottom-1.5 left-1.5">
          <span className="text-[13px] text-white tabular-nums" style={{ fontWeight: 700, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            {formatPrice(listing.priceCad ?? listing.price, listing.priceCurrency || "CAD")}
          </span>
        </div>
      </div>
      <div className="px-2 py-[5px]">
        <p className="truncate text-[10px]" style={{ color: "#e0e0e6", fontWeight: 600 }}>
          {listing.title}
        </p>
        <p className="mt-[1px] truncate text-[8px]" style={{ color: "#3e3e48", fontWeight: 400 }}>
          {listing.setName || listing.set || listing.game}
        </p>
        <div className="mt-[3px] flex items-center gap-1">
          <div className="flex h-[9px] w-[9px] items-center justify-center rounded-full text-[5px] text-white" style={{ background: "#2a2a32", fontWeight: 700 }}>
            {sellerInitial(listing?.seller || listing)}
          </div>
          <span className="truncate text-[7.5px]" style={{ color: "#48484f", fontWeight: 500 }}>
            {sellerLabel(listing?.seller || listing)}
          </span>
          <span className="ml-auto shrink-0 text-[6.5px]" style={{ color: "#2e2e38" }}>
            {compactTimeLabel(listing.sortTimestamp || listing.createdAt || listing.timeAgo)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

export default function MarketPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameSlug } = useParams();
  const { activeListings, gameCatalog, refreshMarketplaceData, toggleWishlist, wishlist } = useMarketplace();

  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [sortBy, setSortBy] = useState("recent");
  const [condition, setCondition] = useState("All");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const activeScope = useMemo(
    () => gameCatalog.find((item) => item.slug === (gameSlug || "all")) || gameCatalog[0],
    [gameCatalog, gameSlug],
  );

  const filtered = useMemo(() => {
    const items = filterAndSortListings(activeListings, {
      gameSlug,
      neighborhood: "All Winnipeg",
      search: deferredQuery,
      sortBy: sortBy === "recent" || sortBy === "popular" ? "newest" : sortBy,
    });

    const conditioned = items.filter((listing) => {
      if (condition === "All") {
        return true;
      }
      return String(listing.condition || "").toUpperCase() === condition.toUpperCase();
    });

    if (sortBy === "popular") {
      return [...conditioned].sort((left, right) => Number(right.views || 0) - Number(left.views || 0));
    }

    return conditioned;
  }, [activeListings, condition, deferredQuery, gameSlug, sortBy]);

  const activeFilterCount = Number(condition !== "All") + Number(sortBy !== "recent");

  return (
    <MobileScreen>
      <SeoHead
        canonicalPath={gameSlug ? `/market/${gameSlug}` : "/market"}
        description="Browse live local Winnipeg TCG listings with compact marketplace filters and real-time seller context."
        title="Market"
      />

      <header
        className="sticky top-0 z-40 lg:static"
        style={{
          background: "rgba(12,12,14,0.8)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div className="px-4 pb-2.5 pt-[max(0.85rem,env(safe-area-inset-top))] lg:px-6 lg:pb-5 lg:pt-8">
          <div className="mb-3 flex items-end justify-between lg:mb-4">
            <h1 className="text-[22px] tracking-tight text-white" style={{ fontWeight: 700, lineHeight: 1 }}>
              Market
            </h1>
            <div className="flex items-center gap-1.5 pb-[2px]">
              <div className="h-[5px] w-[5px] rounded-full" style={{ background: "#34d399", boxShadow: "0 0 4px rgba(52,211,153,0.4)" }} />
              <span className="text-[10px]" style={{ color: "#6ee7b7", fontWeight: 500 }}>
                {filtered.length} live
              </span>
            </div>
          </div>

          <div className="mb-2 flex items-center gap-2 lg:mb-3 lg:max-w-none">
            <div
              className="flex flex-1 items-center gap-2 rounded-xl px-3 py-[7px]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}
            >
              <Search size={14} style={{ color: "#333340" }} className="shrink-0" />
              <input
                className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-[#333340]"
                placeholder="Search cards, sellers..."
                style={{ color: m.text, fontWeight: 400 }}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query ? (
                <button
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                  type="button"
                  onClick={() => setQuery("")}
                >
                  <X size={9} style={{ color: "#78787f" }} />
                </button>
              ) : null}
            </div>

            <motion.button
              className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl"
              style={{
                background: activeFilterCount > 0 ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
                border: activeFilterCount > 0 ? "1px solid rgba(239,68,68,0.12)" : "1px solid rgba(255,255,255,0.04)",
              }}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowFilterSheet(true)}
            >
              <SlidersHorizontal size={14} style={{ color: activeFilterCount > 0 ? "#f87171" : "#3e3e48" }} />
              {activeFilterCount > 0 ? (
                <div className="absolute -right-1 -top-1 flex h-[14px] w-[14px] items-center justify-center rounded-full text-[7px] text-white" style={{ background: m.redGradient, fontWeight: 700 }}>
                  {activeFilterCount}
                </div>
              ) : null}
            </motion.button>
          </div>

          <div className="no-scrollbar flex gap-[5px] overflow-x-auto pb-2 lg:pb-3" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {gameCatalog.slice(0, 7).map((game) => {
              const active = activeScope.slug === game.slug;
              const icon = GAME_ICONS[game.slug] || "🎴";
              return (
                <motion.button
                  key={game.slug}
                  className="flex shrink-0 items-center gap-[4px] rounded-[10px] px-2.5 py-[5px]"
                  style={{
                    background: active ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.03)",
                    border: active ? "1px solid rgba(239,68,68,0.15)" : "1px solid rgba(255,255,255,0.04)",
                  }}
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={() => navigate(game.slug === "all" ? "/market" : `/market/${game.slug}`)}
                >
                  <span className="text-[11px]">{icon}</span>
                  <span className="text-[11px]" style={{ color: active ? "#fca5a5" : "#48484f", fontWeight: active ? 600 : 400 }}>
                    {gameLabel(game)}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="flex items-center justify-between lg:max-w-none">
            <div className="flex gap-[4px]">
              {SORT_OPTIONS.map((option) => {
                const selected = sortBy === option.id;
                return (
                  <button
                    key={option.id}
                    className="rounded-lg px-2 py-[4px] text-[10px]"
                    style={{
                      background: selected ? "rgba(239,68,68,0.08)" : "transparent",
                      color: selected ? "#fca5a5" : "#3e3e48",
                      fontWeight: selected ? 600 : 400,
                    }}
                    type="button"
                    onClick={() => setSortBy(option.id)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="flex overflow-hidden rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
              <button
                className="px-2 py-[4px]"
                style={{ background: viewMode === "list" ? "rgba(239,68,68,0.08)" : "transparent" }}
                type="button"
                onClick={() => setViewMode("list")}
              >
                <LayoutList size={12} style={{ color: viewMode === "list" ? "#f87171" : "#3e3e48" }} />
              </button>
              <button
                className="px-2 py-[4px]"
                style={{ background: viewMode === "grid" ? "rgba(239,68,68,0.08)" : "transparent" }}
                type="button"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 size={12} style={{ color: viewMode === "grid" ? "#f87171" : "#3e3e48" }} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showFilterSheet ? (
          <>
            <motion.button
              className="fixed inset-0 z-[60]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
              type="button"
              onClick={() => setShowFilterSheet(false)}
            />
            <motion.div
              className="fixed bottom-0 left-1/2 z-[70] w-full max-w-[430px] -translate-x-1/2 overflow-hidden rounded-t-2xl lg:bottom-auto lg:top-1/2 lg:max-w-[520px] lg:-translate-y-1/2 lg:rounded-[24px]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              style={{ background: "rgba(18,18,22,0.96)", backdropFilter: "blur(40px)", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
            >
              <div className="flex justify-center pb-1 pt-2.5">
                <div className="h-[3px] w-8 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
              </div>
              <div className="px-4 pb-6 pt-1">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[16px] text-white" style={{ fontWeight: 600 }}>
                    Filters
                  </h2>
                  <button
                    className="text-[11px]"
                    style={{ color: m.redLight, fontWeight: 500 }}
                    type="button"
                    onClick={() => {
                      setSortBy("recent");
                      setCondition("All");
                    }}
                  >
                    Reset
                  </button>
                </div>

                <p className="mb-2 text-[10px] uppercase tracking-[0.08em]" style={{ color: "#48484f", fontWeight: 600 }}>
                  Condition
                </p>
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {CONDITION_OPTIONS.map((option) => (
                    <ChoicePill key={option} active={condition === option} onClick={() => setCondition(option)}>
                      {option === "All" ? "Any" : option}
                    </ChoicePill>
                  ))}
                </div>

                <motion.button
                  className="w-full rounded-xl py-2.5 text-[13px] text-white"
                  style={{ background: m.redGradient, fontWeight: 600 }}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowFilterSheet(false)}
                >
                  Show {filtered.length} results
                </motion.button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <PullToRefresh onRefresh={() => refreshMarketplaceData?.()}>
        <main className="pb-[82px] lg:mx-auto lg:w-full lg:max-w-[1480px] lg:px-6 lg:pb-8">
          {filtered.length ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-2 px-3 pt-2.5 lg:rounded-[26px] lg:border lg:border-white/5 lg:bg-white/[0.015] lg:grid-cols-6 lg:gap-4 lg:px-5 lg:py-5">
                {filtered.map((listing) => (
                  <GridCard
                    key={listing.id}
                    favorite={wishlist?.includes(listing.id)}
                    listing={listing}
                    onFavorite={() => toggleWishlist(listing.id)}
                    onOpen={() => rememberAndNavigateToListing(navigate, location, listing.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-[6px] px-4 pt-2.5 lg:rounded-[24px] lg:border lg:border-white/5 lg:bg-white/[0.015] lg:grid lg:grid-cols-2 lg:gap-3 lg:px-5 lg:py-5">
                {filtered.map((listing) => (
                  <FeedRow
                    key={listing.id}
                    favorite={wishlist?.includes(listing.id)}
                    listing={listing}
                    onFavorite={() => toggleWishlist(listing.id)}
                    onOpen={() => rememberAndNavigateToListing(navigate, location, listing.id)}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="px-4 py-20 lg:rounded-[24px] lg:border lg:border-white/5 lg:bg-white/[0.015] lg:py-28">
              <EmptyBlock
                action={
                  <motion.button
                    className="rounded-full px-4 py-2 text-[11px] text-white"
                    style={{ background: m.redGradient, fontWeight: 700 }}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setCondition("All");
                      setSortBy("recent");
                      setQuery("");
                    }}
                  >
                    Reset filters
                  </motion.button>
                }
                description="Try widening your search or clearing a filter."
                title="No listings found"
              />
            </div>
          )}
        </main>
      </PullToRefresh>
    </MobileScreen>
  );
}
