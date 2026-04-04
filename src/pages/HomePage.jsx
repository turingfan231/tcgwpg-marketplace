import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Flame,
  MapPin,
  Search,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import UserAvatar from "../components/shared/UserAvatar";
import { storeProfiles } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";
import DBSFWBanner from "../assets/DBSFW_Banner_optimized.jpg";
import MTGBanner from "../assets/MTG_Banner_optimized.jpg";
import OPTCGBanner from "../assets/OPTCG_Banner_optimized.jpg";
import PokemonBanner from "../assets/Pokemon_Banner.jpg";
import UABanner from "../assets/UA_Banner_optimized.jpg";
import { m, conditionStyle } from "../mobile/design";
import {
  compactTimeLabel,
  formatPrice,
  listingArtwork,
  listingHref,
  rememberAndNavigateToListing,
  rememberListingReturnPath,
  sellerInitial,
  sellerLabel,
} from "../mobile/helpers";
import { ListingRow, MobileScreen, PullToRefresh } from "../mobile/primitives";

const HERO_GAMES = [
  {
    slug: "pokemon",
    game: "Pokemon",
    banner: PokemonBanner,
    accent: "#ef4444",
    placeholderTitle: "Pokemon spotlight",
    placeholderSubtitle: "Top Pokemon listing",
  },
  {
    slug: "magic",
    game: "Magic",
    banner: MTGBanner,
    accent: "#c084fc",
    placeholderTitle: "Magic spotlight",
    placeholderSubtitle: "Top Magic listing",
  },
  {
    slug: "one-piece",
    game: "One Piece",
    banner: OPTCGBanner,
    accent: "#ef4444",
    placeholderTitle: "One Piece spotlight",
    placeholderSubtitle: "Top One Piece listing",
  },
  {
    slug: "dragon-ball-fusion-world",
    game: "Dragon Ball Super Fusion World",
    banner: DBSFWBanner,
    accent: "#38bdf8",
    placeholderTitle: "Fusion World spotlight",
    placeholderSubtitle: "Top Fusion World listing",
  },
  {
    slug: "union-arena",
    game: "Union Arena",
    banner: UABanner,
    accent: "#f59e0b",
    placeholderTitle: "Union Arena spotlight",
    placeholderSubtitle: "Top Union Arena listing",
  },
];

function normalizeHeroGameSlug(value) {
  const source = String(value || "").toLowerCase();
  if (source.includes("pokemon")) return "pokemon";
  if (source.includes("magic")) return "magic";
  if (source.includes("one piece") || source.includes("one-piece")) return "one-piece";
  if (source.includes("union")) return "union-arena";
  if (
    source.includes("dragon ball") ||
    source.includes("dragon-ball") ||
    source.includes("fusion world") ||
    source.includes("fusion-world") ||
    source.includes("dbs")
  ) {
    return "dragon-ball-fusion-world";
  }
  return "";
}

function buildPokemonPlaceholderCard() {
  return {
    title: "Pokemon banner pending",
    subtitle: "Placeholder card",
    image: "",
  };
}

function SectionHeader({ title, to }) {
  return (
    <div className="mb-2 mt-4 flex items-center justify-between px-4 lg:px-0">
      <h2
        className="text-[13px] uppercase tracking-[0.06em]"
        style={{ fontWeight: 600, color: "#707078" }}
      >
        {title}
      </h2>
      {to ? (
        <Link className="flex items-center gap-0.5" to={to}>
          <span className="text-[11px]" style={{ fontWeight: 500, color: "#f87171" }}>
            See All
          </span>
          <ChevronRight size={11} style={{ color: "#f87171" }} />
        </Link>
      ) : null}
    </div>
  );
}

function CompactBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-[10px] text-white" style={{ background: "#17090b" }}>
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(127,29,29,0.92))" }} />
        <div className="absolute -right-2 -top-2 h-6 w-6 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
        <span className="relative text-[8px] tracking-[0.08em]" style={{ fontWeight: 900 }}>WPG</span>
      </div>
      <div>
        <p className="text-[13px] text-white" style={{ fontWeight: 700 }}>
          TCG WPG
        </p>
        <p className="text-[11px]" style={{ color: m.textSecondary }}>
          Winnipeg, MB
        </p>
      </div>
    </div>
  );
}

function HeroCarousel({ slides }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [heroIndex, setHeroIndex] = useState(0);
  const [desktopViewport, setDesktopViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false,
  );
  const scrollRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event) => setDesktopViewport(event.matches);
    setDesktopViewport(media.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (slides.length <= 1 || desktopViewport) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setHeroIndex((current) => {
        const nextIndex = (current + 1) % slides.length;
        const nextNode = scrollRef.current?.children?.[nextIndex];
        nextNode?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
        return nextIndex;
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [desktopViewport, slides.length]);

  if (!slides.length) {
    return null;
  }

  function handleHeroScroll(event) {
    const container = event.currentTarget;
    const width = container.clientWidth || 1;
    const nextIndex = Math.round(container.scrollLeft / width);
    if (nextIndex !== heroIndex) {
      setHeroIndex(nextIndex);
    }
  }

  function goToSlide(index) {
    setHeroIndex(index);
    const nextNode = scrollRef.current?.children?.[index];
    nextNode?.scrollIntoView({
      behavior: desktopViewport ? "auto" : "smooth",
      inline: "start",
      block: "nearest",
    });
  }

  return (
    <div className="px-4 pt-2 lg:px-0 lg:pt-0">
      <div
        className="relative overflow-hidden rounded-2xl lg:rounded-[28px]"
        style={{ border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          ref={scrollRef}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
          onScroll={handleHeroScroll}
        >
          {slides.map((item, index) => (
            <motion.button
              key={item.id}
              className="relative block w-full shrink-0 snap-center text-left"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              type="button"
              onClick={() => {
                if (String(item.to || "").startsWith("/listing/")) {
                  const listingId = String(item.to).replace("/listing/", "");
                  rememberAndNavigateToListing(navigate, location, listingId);
                  return;
                }
                navigate(item.to);
              }}
            >
              <div
                className="relative grid min-h-[126px] grid-cols-[1.08fr_0.92fr] items-stretch lg:min-h-[252px] lg:grid-cols-[1.05fr_0.95fr]"
                style={{
                  background: item.banner
                    ? `linear-gradient(90deg, rgba(8,8,10,0.94) 0%, rgba(8,8,10,0.84) 30%, rgba(8,8,10,0.28) 64%, rgba(8,8,10,0.08) 100%), url(${item.banner})`
                    : `radial-gradient(circle at top left, ${item.accent}22 0%, rgba(24,18,22,0.92) 48%, rgba(12,12,14,1) 100%)`,
                  backgroundSize: item.banner ? "cover" : "auto",
                  backgroundPosition: item.banner ? (desktopViewport ? "right center" : "center center") : "center",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      item.banner
                        ? "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 42%), linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 100%)"
                        : "linear-gradient(135deg, rgba(255,255,255,0.015) 0%, transparent 45%), repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 16px)",
                    opacity: item.banner ? 1 : 0.45,
                  }}
                />
                <div className="flex min-w-0 flex-col justify-between px-3.5 py-3 lg:px-6 lg:py-5">
                  <span
                    className="inline-flex self-start rounded px-[6px] py-[2px] text-[8px] uppercase tracking-[0.12em] lg:px-2 lg:py-1 lg:text-[10px]"
                    style={{ fontWeight: 700, color: item.accent, background: `${item.accent}26` }}
                  >
                    {item.tag}
                  </span>
                  <div className="mt-2 lg:mt-4">
                    <p className="text-[15px] text-white lg:max-w-[32rem] lg:text-[36px]" style={{ fontWeight: 700, lineHeight: 1.08 }}>
                      {item.title}
                    </p>
                    <p className="mt-[5px] text-[10.5px] lg:mt-3 lg:max-w-[30rem] lg:text-[14px]" style={{ fontWeight: 400, color: "#8b8b95", lineHeight: 1.45 }}>
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <div className="relative flex items-end justify-end overflow-hidden pr-2 pt-2 lg:pr-5 lg:pt-5">
                  <div
                    className="absolute inset-y-0 left-0 w-10 lg:w-24"
                    style={{ background: "linear-gradient(90deg, rgba(12,12,14,0.55), transparent)" }}
                  />
                  <div
                    className="absolute right-2 top-3 h-16 w-16 rounded-full blur-2xl lg:right-8 lg:top-8 lg:h-40 lg:w-40 lg:blur-3xl"
                    style={{ background: `${item.accent}33` }}
                  />
                  <div
                    className="absolute right-5 top-4 h-[84px] w-[84px] rounded-[22px] lg:right-16 lg:top-8 lg:h-[190px] lg:w-[190px] lg:rounded-[36px]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      transform: "rotate(-10deg)",
                    }}
                  />
                  {item.isEvent ? (
                    <div
                      className="relative mr-1 flex h-[102px] w-[76px] flex-col items-center justify-center overflow-hidden rounded-[18px] px-2 lg:mr-3 lg:h-[190px] lg:w-[150px] lg:rounded-[28px] lg:px-4"
                      style={{
                        background: "rgba(8,8,10,0.58)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: desktopViewport ? "0 24px 60px rgba(0,0,0,0.28)" : "0 14px 36px rgba(0,0,0,0.28)",
                      }}
                    >
                      {item.storeLogo ? (
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden lg:h-16 lg:w-16">
                          <img
                            alt={item.storeName || "Store logo"}
                            className="h-full w-full object-contain"
                            decoding="async"
                            loading="lazy"
                            src={item.storeLogo}
                          />
                        </div>
                      ) : (
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-[14px] text-[14px] text-white"
                          style={{
                            fontWeight: 800,
                            background: `linear-gradient(135deg, ${item.accent}, ${item.accent}99)`,
                          }}
                        >
                          {item.storeInitial}
                        </div>
                      )}
                      <p
                        className="mt-2 line-clamp-2 text-center text-[8px] lg:mt-4 lg:text-[13px]"
                        style={{ fontWeight: 700, color: "#f4f4f5", lineHeight: 1.2 }}
                      >
                        {item.storeName || "Local store"}
                      </p>
                      <p className="mt-1 text-[7px] lg:mt-2 lg:text-[11px]" style={{ color: "#9ca3af", lineHeight: 1.2 }}>
                        {item.gameLabel}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="relative mr-1 flex h-[102px] w-[76px] items-center justify-center overflow-hidden rounded-[18px] lg:mr-3 lg:h-[206px] lg:w-[152px] lg:rounded-[28px]"
                      style={{
                        background: item.cardImage
                          ? "rgba(8,8,10,0.58)"
                          : `linear-gradient(180deg, ${item.accent}22 0%, rgba(18,18,22,0.92) 100%)`,
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: desktopViewport ? "0 24px 60px rgba(0,0,0,0.28)" : "0 14px 36px rgba(0,0,0,0.28)",
                      }}
                    >
                      {item.cardImage ? (
                        <img
                          alt={item.cardTitle || item.title}
                          className="h-full w-full object-cover"
                          decoding="async"
                          loading={heroIndex === index ? "eager" : "lazy"}
                          src={item.cardImage}
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col justify-between p-2">
                          <span
                            className="inline-flex self-start rounded px-[5px] py-[1px] text-[7px] uppercase tracking-[0.08em]"
                            style={{ background: `${item.accent}1f`, color: item.accent, fontWeight: 700 }}
                          >
                            soon
                          </span>
                          <div>
                            <p className="text-[9px] text-white" style={{ fontWeight: 700, lineHeight: 1.15 }}>
                              Pokemon
                            </p>
                            <p className="mt-1 text-[7px]" style={{ color: "#9ca3af", lineHeight: 1.25 }}>
                              Placeholder card art until the updated banner arrives.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {slides.length > 1 ? (
          <>
            <button
              className="absolute left-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full"
              style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}
              type="button"
              onClick={() => goToSlide((heroIndex - 1 + slides.length) % slides.length)}
            >
              <ChevronLeft size={12} className="text-white/70" />
            </button>
            <button
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full"
              style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)" }}
              type="button"
              onClick={() => goToSlide((heroIndex + 1) % slides.length)}
            >
              <ChevronRight size={12} className="text-white/70" />
            </button>
            <div className="absolute bottom-1.5 right-3 flex gap-[4px]">
              {slides.map((item, index) => (
                <button
                  key={item.id}
                  className="h-[5px] w-[5px] rounded-full transition-all"
                  style={{ background: index === heroIndex ? "#ef4444" : "rgba(255,255,255,0.2)" }}
                  type="button"
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function HotListingCard({ listing }) {
  const navigate = useNavigate();
  const location = useLocation();
  const tone = conditionStyle(listing.condition);

  return (
    <motion.button
      className="w-[120px] shrink-0 cursor-pointer overflow-hidden rounded-xl text-left lg:w-auto lg:rounded-[18px]"
      data-listing-link={listing.id}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={() => rememberAndNavigateToListing(navigate, location, listing.id)}
    >
      <div className="relative h-[90px] overflow-hidden lg:h-[132px]">
        <img
          alt={listing.title}
          className="h-full w-full object-cover"
          decoding="async"
          loading="lazy"
          src={listingArtwork(listing)}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 30%, rgba(10,10,12,0.85) 100%)" }}
        />
        <div
          className="absolute left-1.5 top-1.5 rounded px-[4px] py-[1px]"
          style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${tone.color}20` }}
        >
          <span className="text-[7px]" style={{ fontWeight: 700, color: tone.color }}>
            {tone.label}
          </span>
        </div>
        <div
          className="absolute right-1.5 top-1.5 flex h-[14px] w-[14px] items-center justify-center rounded-full"
          style={{ background: "rgba(239,68,68,0.25)" }}
        >
          <Flame size={7} style={{ color: "#f87171" }} />
        </div>
        <span className="absolute bottom-1.5 left-1.5 text-[13px] text-white tabular-nums" style={{ fontWeight: 700 }}>
          {formatPrice(listing.priceCad ?? listing.price, listing.priceCurrency || "CAD")}
        </span>
      </div>
      <div className="px-2 py-1.5 lg:px-3 lg:py-2.5">
        <p className="truncate text-[10.5px] lg:text-[12px]" style={{ fontWeight: 600, color: "#d0d0d8" }}>
          {listing.title}
        </p>
        <p className="mt-[1px] truncate text-[9px] lg:text-[10px]" style={{ fontWeight: 400, color: "#444450" }}>
          {sellerLabel(listing.seller || listing)}
        </p>
      </div>
    </motion.button>
  );
}

function SellerChip({ seller }) {
  const location = useLocation();
  const backTo = `${location.pathname}${location.search}${location.hash}`;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.92 }}>
      <Link
        className="flex shrink-0 flex-col items-center gap-1 lg:w-full lg:flex-row lg:items-center lg:gap-3 lg:rounded-[20px] lg:border lg:border-white/5 lg:bg-white/[0.025] lg:px-3.5 lg:py-3"
        to={`/seller/${seller.id}`}
        state={{ backTo }}
        onClick={() => rememberListingReturnPath(backTo)}
      >
        <UserAvatar
          className="h-[40px] w-[40px] border border-white/5 lg:h-[48px] lg:w-[48px]"
          name={sellerLabel(seller)}
          src={seller.avatarUrl}
          textClassName="text-[13px]"
          user={seller}
        />
        <div className="min-w-0 lg:flex-1">
          <p className="max-w-[56px] truncate text-[9px] lg:max-w-none lg:text-[12px]" style={{ fontWeight: 600, color: "#d0d0d8" }}>
            {sellerLabel(seller)}
          </p>
          <div className="flex items-center gap-[2px] lg:mt-1 lg:gap-1">
            <Star size={7} fill="#fbbf24" style={{ color: "#fbbf24" }} />
            <span className="text-[8px] lg:text-[10px]" style={{ fontWeight: 500, color: "#6c6c76" }}>
              {Number(seller.overallRating || seller.rating || 0).toFixed(1)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function StoreCard({ store }) {
  const accent =
    store.accent ||
    (store.tone === "navy"
      ? "#3b82f6"
      : store.tone === "orange"
        ? "#f59e0b"
        : store.tone === "ice"
          ? "#06b6d4"
          : "#10b981");

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      whileTap={{ scale: 0.97 }}
    >
      <Link
        className="block w-[140px] shrink-0 cursor-pointer rounded-xl p-2.5 lg:w-full lg:rounded-[20px] lg:p-3.5"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}
        to={`/stores/${store.slug}`}
      >
        <div
          className="mb-2 flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-[9px] lg:h-[42px] lg:w-[42px] lg:rounded-[14px]"
          style={{ background: store.logoUrl ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg, ${accent}, ${accent}88)` }}
        >
          {store.logoUrl ? (
            <img
              alt={store.name}
              className="h-full w-full object-contain p-1"
              decoding="async"
              loading="lazy"
              src={store.logoUrl}
            />
          ) : (
            <span className="text-[12px] text-white" style={{ fontWeight: 700 }}>
              {String(store.name || "?").charAt(0)}
            </span>
          )}
        </div>
        <p className="truncate text-[11px] lg:text-[13px]" style={{ fontWeight: 600, color: "#c0c0c8" }}>
          {store.name}
        </p>
        <div className="mt-[3px] flex items-center gap-1">
          <MapPin size={8} style={{ color: "#3e3e48" }} />
          <span className="truncate text-[9px] lg:text-[10px]" style={{ fontWeight: 400, color: "#4a4a54" }}>
            {store.neighborhood}
          </span>
        </div>
        <p
          className="mt-1.5 border-t pt-1.5 text-[9px] lg:mt-2 lg:pt-2 lg:text-[10px]"
          style={{ fontWeight: 500, color: "#6a6a74", borderColor: "rgba(255,255,255,0.04)" }}
        >
          {store.listingCount || 0} listings
        </p>
      </Link>
    </motion.div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const {
    activeListings,
    currentUser,
    followedStoreSlugs,
    manualEvents,
    notificationsForCurrentUser,
    refreshMarketplaceData,
    sellers,
    siteSettings,
    toggleWishlist,
    wishlist,
  } = useMarketplace();

  const liveListings = useMemo(
    () => [...(Array.isArray(activeListings) ? activeListings : [])].filter(Boolean),
    [activeListings],
  );

  const hotListings = useMemo(
    () =>
      [...liveListings]
        .sort(
          (left, right) =>
            Number(right.featured || 0) - Number(left.featured || 0) ||
            Number(right.views || 0) - Number(left.views || 0) ||
            Number(right.sortTimestamp || 0) - Number(left.sortTimestamp || 0),
        )
        .slice(0, 4),
    [liveListings],
  );

  const recentListings = useMemo(
    () =>
      [...liveListings]
        .sort((left, right) => Number(right.sortTimestamp || 0) - Number(left.sortTimestamp || 0))
        .slice(0, 6),
    [liveListings],
  );

  const topSellers = useMemo(
    () =>
      [...(sellers || [])]
        .sort(
          (left, right) =>
            Number(right.completedDeals || 0) - Number(left.completedDeals || 0) ||
            Number(right.overallRating || right.rating || 0) - Number(left.overallRating || left.rating || 0),
        )
        .slice(0, 5),
    [sellers],
  );

  const upcomingEvents = useMemo(
    () =>
      [...(manualEvents || [])]
        .filter((event) => event?.published !== false)
        .sort(
          (left, right) =>
            new Date(left.dateStr || left.date || 0).getTime() -
            new Date(right.dateStr || right.date || 0).getTime(),
        )
        .slice(0, 3)
        .map((event) => ({
          ...event,
          dateLabel: new Date(event.dateStr || event.date || Date.now()).toLocaleDateString("en-CA", {
            weekday: "short",
          }).slice(0, 3),
          dateNumber: new Date(event.dateStr || event.date || Date.now()).getDate(),
        })),
    [manualEvents],
  );

  const priorityStores = useMemo(
    () =>
      storeProfiles
        .filter((store) => followedStoreSlugs?.includes(store.slug))
        .concat(storeProfiles.filter((store) => !followedStoreSlugs?.includes(store.slug)))
        .slice(0, 3)
        .map((store) => {
          const listingCount = liveListings.filter((listing) => {
            const storeName = String(listing.storeName || listing.store || "").toLowerCase();
            return (
              storeName.includes(String(store.name || "").toLowerCase()) ||
              storeName.includes(String(store.shortName || "").toLowerCase())
            );
          }).length;

          return {
            ...store,
            listingCount,
          };
        }),
    [followedStoreSlugs, liveListings],
  );

  const heroSlides = useMemo(() => {
    const pinnedEventId = siteSettings?.homeHero?.pinnedEventId || null;

    return HERO_GAMES.map((gameConfig) => {
      const gameListings = liveListings
        .filter((listing) => normalizeHeroGameSlug(listing.gameSlug || listing.game) === gameConfig.slug)
        .sort(
          (left, right) =>
            Number(right.featured || 0) - Number(left.featured || 0) ||
            Number(right.views || 0) - Number(left.views || 0) ||
            Number(right.sortTimestamp || 0) - Number(left.sortTimestamp || 0),
        );

      const featuredListing = gameListings[0] || null;
      const matchingEvents = upcomingEvents.filter(
        (event) => normalizeHeroGameSlug(event.game) === gameConfig.slug,
      );
      const pinnedEvent =
        matchingEvents.find((event) => String(event.id) === String(pinnedEventId)) || null;
      const event = pinnedEvent || matchingEvents[0] || null;
      const storeMatch = storeProfiles.find((store) => {
        const eventStore = String(event?.store || event?.location || "").toLowerCase();
        return (
          eventStore.includes(String(store.name || "").toLowerCase()) ||
          eventStore.includes(String(store.shortName || "").toLowerCase())
        );
      });

      const defaultCard =
        gameConfig.slug === "pokemon" ? buildPokemonPlaceholderCard() : null;
      const cardImage = listingArtwork(featuredListing) || defaultCard?.image || "";
      const cardTitle = featuredListing?.title || defaultCard?.title || `${gameConfig.game} featured card`;

      return {
        id: `hero-${gameConfig.slug}`,
        tag: event ? "Event" : "Featured",
        title: event ? event.title : featuredListing?.title || gameConfig.placeholderTitle,
        subtitle: event
          ? `${gameConfig.game} • ${event.store || event.location || "Local venue"} • ${event.time || compactTimeLabel(event.dateStr || event.date)}`
          : featuredListing
            ? `${formatPrice(featuredListing.priceCad ?? featuredListing.price, featuredListing.priceCurrency || "CAD")} • ${featuredListing.condition || "Listed now"} • ${featuredListing.neighborhood || "Winnipeg"}`
            : gameConfig.placeholderSubtitle,
        banner: gameConfig.banner,
        accent: gameConfig.accent,
        cardImage,
        cardTitle,
        isEvent: Boolean(event),
        gameLabel: gameConfig.game,
        storeName: storeMatch?.name || event?.store || event?.location || "",
        storeLogo: storeMatch?.logoUrl || "",
        storeInitial: String(storeMatch?.name || event?.store || event?.location || gameConfig.game)
          .trim()
          .charAt(0)
          .toUpperCase(),
        to: event ? "/events" : featuredListing ? listingHref(featuredListing.id) : "/market",
      };
    });
  }, [liveListings, siteSettings?.homeHero?.pinnedEventId, upcomingEvents]);

  return (
    <MobileScreen>
      <SeoHead
        canonicalPath="/"
        description="TCG WPG is Winnipeg's local marketplace for buying, selling, and trading cards with events, trusted sellers, and live listings."
        title="Home"
      />

      <header
        className="relative z-10 px-4 pb-2.5 pt-3 lg:px-6 lg:pb-5 lg:pt-8"
        style={{
          background: m.bg,
          transition: "background 0.2s ease",
        }}
      >
        <div className="mb-2.5 flex items-center justify-between">
          <CompactBrand />
          <div className="flex items-center gap-2">
            <motion.button
              className="relative flex h-8 w-8 items-center justify-center rounded-[10px]"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.04)" }}
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => navigate("/notifications")}
            >
              <Bell size={15} style={{ color: "#4a4a54" }} />
              {(notificationsForCurrentUser || []).some((notification) => !notification.readAt) ? (
                <div
                  className="absolute right-1.5 top-1.5 h-[5px] w-[5px] rounded-full"
                  style={{ background: "#ef4444", boxShadow: "0 0 4px rgba(239,68,68,0.5)" }}
                />
              ) : null}
            </motion.button>
            <motion.button
              className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] text-white"
              style={{ fontWeight: 600, background: m.redGradient }}
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => navigate("/account")}
            >
              {sellerInitial(currentUser)}
            </motion.button>
          </div>
        </div>

        <motion.button
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-[8px]"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/market")}
        >
          <Search size={14} style={{ color: "#333340" }} />
          <span className="text-[12.5px]" style={{ fontWeight: 400, color: "#333340" }}>
            Search cards, sellers, sets...
          </span>
        </motion.button>
      </header>

      <PullToRefresh onRefresh={() => refreshMarketplaceData?.()}>
        <main className="pb-[72px] lg:mx-auto lg:grid lg:w-full lg:max-w-[1480px] lg:grid-cols-[minmax(0,1.35fr)_360px] lg:gap-6 lg:px-6 lg:pb-10">
          <div
            className="min-w-0 lg:rounded-[24px] lg:border lg:border-white/5 lg:bg-white/[0.015] lg:p-5"
          >
            <HeroCarousel slides={heroSlides} />

            <SectionHeader title="Hot Listings" to="/market" />
            <div className="flex gap-2 overflow-x-auto px-4 no-scrollbar lg:grid lg:grid-cols-4 lg:gap-4 lg:px-0" style={{ scrollbarWidth: "none" }}>
              {hotListings.map((listing) => (
                <HotListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            <SectionHeader title="Recent Listings" to="/market" />
            <div className="flex flex-col gap-[6px] px-4 lg:grid lg:grid-cols-2 lg:gap-3 lg:px-0">
              {recentListings.map((listing) => (
                <ListingRow
                  key={listing.id}
                  favorite={wishlist?.includes(listing.id)}
                  listing={listing}
                  onFavorite={() => toggleWishlist(listing.id)}
                />
              ))}
            </div>
          </div>

          <aside className="px-4 lg:sticky lg:top-6 lg:self-start lg:px-0">
            <SectionHeader title="Top Sellers" to="/sellers" />
            <div className="flex gap-3 overflow-x-auto no-scrollbar lg:flex-col lg:gap-3" style={{ scrollbarWidth: "none" }}>
              {topSellers.map((seller) => (
                <SellerChip key={seller.id} seller={seller} />
              ))}
            </div>

            <SectionHeader title="This Week" to="/events" />
            <div
              className="overflow-hidden rounded-xl lg:rounded-[22px]"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
            >
              {upcomingEvents.map((event, index) => (
                <button
                  key={event.id}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left active:bg-white/[0.02]"
                  style={{ borderBottom: index < upcomingEvents.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}
                  type="button"
                  onClick={() => navigate("/events")}
                >
                <div
                  className="flex h-[34px] w-[34px] shrink-0 flex-col items-center justify-center rounded-[10px]"
                  style={{ background: "rgba(220,38,38,0.07)" }}
                >
                  <span className="text-[7px] uppercase" style={{ fontWeight: 700, color: "#f87171", lineHeight: 1 }}>
                    {event.dateLabel}
                  </span>
                  <span className="text-[14px]" style={{ fontWeight: 700, color: "#fca5a5", lineHeight: 1.1 }}>
                    {event.dateNumber}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px]" style={{ fontWeight: 600, color: "#d0d0d8" }}>
                    {event.title}
                  </p>
                  <div className="mt-[2px] flex items-center gap-1">
                    <MapPin size={8} style={{ color: "#3e3e48" }} />
                    <span className="truncate text-[9px]" style={{ fontWeight: 400, color: "#4a4a54" }}>
                      {event.store || event.location || "Local venue"}
                    </span>
                    <span className="mx-1 text-[6px]" style={{ color: "#2a2a32" }}>
                      .
                    </span>
                    <span className="text-[9px]" style={{ fontWeight: 400, color: "#4a4a54" }}>
                      {event.time || compactTimeLabel(event.dateStr || event.date)}
                    </span>
                  </div>
                </div>
                <ChevronRight size={12} style={{ color: "#2a2a32" }} />
                </button>
              ))}
            </div>

            <SectionHeader title="Local Stores" to="/stores" />
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar lg:flex-col lg:gap-3 lg:pb-0" style={{ scrollbarWidth: "none" }}>
              {priorityStores.map((store) => (
                <StoreCard key={store.slug} store={store} />
              ))}
            </div>
          </aside>
        </main>
      </PullToRefresh>
    </MobileScreen>
  );
}
