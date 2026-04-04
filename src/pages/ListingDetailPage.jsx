import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  ShieldCheck,
  ShieldX,
  Share2,
  Shield,
  Star,
  TrendingDown,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import { approvedMeetupSpots } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";
import { m, conditionStyle } from "../mobile/design";
import {
  compactTimeLabel,
  formatPrice,
  listingArtwork,
  readListingReturnPath,
  sellerHref,
  sellerInitial,
  sellerLabel,
} from "../mobile/helpers";
import {
  BottomSheet,
  Lightbox,
  ListingTile,
  MobileScreen,
  PrimaryButton,
  ScreenSection,
  SecondaryButton,
} from "../mobile/primitives";

function Divider() {
  return <div className="mx-4 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />;
}

function MetaPill({ accent = false, children }) {
  return (
    <span
      className="rounded-full px-2 py-[4px] text-[10px]"
      style={{
        background: accent ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${accent ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)"}`,
        color: accent ? "#fca5a5" : "#6a6a72",
        fontWeight: accent ? 700 : 500,
      }}
    >
      {children}
    </span>
  );
}

export default function ListingDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { listingId } = useParams();
  const {
    activeListings,
    currentUser,
    findOrCreateThread,
    offersByListingId,
    recordListingView,
    toggleListingFeatured,
    toggleListingFlag,
    toggleListingRemoved,
    toggleWishlist,
    updateListingAdminNote,
    wishlist,
  } = useMarketplace();

  const [activeImg, setActiveImg] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showOfferSheet, setShowOfferSheet] = useState(false);
  const [showAdminSheet, setShowAdminSheet] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [adminSaving, setAdminSaving] = useState(false);
  const galleryRef = useRef(null);
  const recordedViewsRef = useRef(new Set());

  const listing = useMemo(
    () => activeListings.find((item) => String(item.id) === String(listingId)),
    [activeListings, listingId],
  );

  useEffect(() => {
    const normalizedId = String(listing?.id || "");
    if (!normalizedId || recordedViewsRef.current.has(normalizedId)) {
      return;
    }

    recordedViewsRef.current.add(normalizedId);
    void recordListingView(normalizedId);
  }, [listing?.id, recordListingView]);

  useEffect(() => {
    if (!listing?.id || typeof window === "undefined") {
      return;
    }

    window.scrollTo(0, 0);
    if (galleryRef.current) {
      galleryRef.current.scrollTo({ left: 0, behavior: "auto" });
    }
    setActiveImg(0);
  }, [listing?.id]);

  useEffect(() => {
    setSaved(Boolean(listing && wishlist?.includes(listing.id)));
  }, [listing, wishlist]);

  useEffect(() => {
    setAdminNote(listing?.adminNotes || "");
  }, [listing?.adminNotes, listing?.id]);

  const gallery = useMemo(() => {
    if (!listing) {
      return [];
    }

    return [
      listing.primaryImage,
      listing.imageUrl,
      ...(Array.isArray(listing.imageGallery) ? listing.imageGallery : []),
      ...(Array.isArray(listing.conditionImages) ? listing.conditionImages : []),
    ]
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);
  }, [listing]);

  const seller = listing?.seller || listing;
  const isAdmin = currentUser?.role === "admin";
  const tone = conditionStyle(listing?.condition);
  const offerCount = listing ? (offersByListingId[listing.id] || []).length : 0;
  const marketPrice = Number(listing?.marketPriceCad || listing?.marketPrice || 0);
  const priceValue = Number(listing?.priceCad ?? listing?.price ?? 0);
  const discount = marketPrice > 0 ? Math.round(((marketPrice - priceValue) / marketPrice) * 100) : 0;
  const relatedListings = useMemo(
    () =>
      listing
        ? activeListings
            .filter((candidate) => candidate.id !== listing.id && candidate.gameSlug === listing.gameSlug)
            .slice(0, 4)
        : [],
    [activeListings, listing],
  );
  const trustedSpots = useMemo(
    () =>
      approvedMeetupSpots.filter((spot) =>
        Array.isArray(listing?.seller?.trustedMeetupSpots)
          ? listing.seller.trustedMeetupSpots.includes(spot.id) ||
            listing.seller.trustedMeetupSpots.includes(spot.slug)
          : false,
      ),
    [listing],
  );

  function goBack() {
    const backTo = location.state?.backTo || readListingReturnPath("/market");
    navigate(backTo, { replace: true });
  }

  function handleGalleryScroll(event) {
    const container = event.currentTarget;
    const width = container.clientWidth || 1;
    const nextIndex = Math.round(container.scrollLeft / width);
    if (nextIndex !== activeImg) {
      setActiveImg(nextIndex);
    }
  }

  async function handleMessageSeller() {
    if (!listing) {
      return;
    }
    if (!currentUser) {
      navigate("/auth", { state: { from: `/listing/${listing.id}` } });
      return;
    }

    const result = await findOrCreateThread({
      listingId: listing.id,
      otherUserId: listing.sellerId,
    });

    if (result?.ok && result.thread?.id) {
      navigate(`/inbox/${result.thread.id}`);
    }
  }

  async function handleAdminNoteSave() {
    if (!listing?.id || !isAdmin || adminSaving) {
      return;
    }
    setAdminSaving(true);
    try {
      await updateListingAdminNote(listing.id, adminNote);
      setShowAdminSheet(false);
    } finally {
      setAdminSaving(false);
    }
  }

  if (!listing) {
    return (
      <MobileScreen>
        <SeoHead canonicalPath={listingId ? `/listing/${listingId}` : "/listing"} description="Marketplace listing details." title="Listing" />
        <div
          className="sticky top-0 z-40 px-4 pb-2 pt-[max(0.8rem,env(safe-area-inset-top))]"
          style={{
            background: "rgba(12,12,14,0.7)",
            backdropFilter: "blur(30px) saturate(180%)",
            WebkitBackdropFilter: "blur(30px) saturate(180%)",
            borderBottom: `1px solid ${m.border}`,
          }}
        >
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "rgba(255,255,255,0.06)" }}
            type="button"
            onClick={goBack}
          >
            <ArrowLeft size={18} style={{ color: "#c0c0c8" }} />
          </button>
        </div>
        <ScreenSection className="pt-8">
          <div className="rounded-[20px] border px-4 py-5 text-center" style={{ background: m.surface, borderColor: m.border }}>
            <p className="text-[15px] text-white" style={{ fontWeight: 600 }}>
              Listing not found
            </p>
            <p className="mt-2 text-[12px]" style={{ color: m.textSecondary }}>
              This listing may have sold or is no longer available.
            </p>
          </div>
        </ScreenSection>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen>
      <SeoHead canonicalPath={`/listing/${listing.id}`} description={listing.description || `View ${listing.title} on TCG WPG.`} title={listing.title} />

      <motion.header
        className="sticky top-0 z-50 flex items-center justify-between px-3 py-2 lg:px-6 lg:py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: "rgba(12,12,14,0.7)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          borderBottom: `1px solid ${m.border}`,
        }}
        transition={{ duration: 0.3 }}
      >
        <motion.button
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.06)" }}
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={goBack}
        >
          <ArrowLeft size={18} style={{ color: "#c0c0c8" }} />
        </motion.button>
        <span className="max-w-[180px] truncate text-[13px]" style={{ color: "#a0a0a8", fontWeight: 600 }}>
          {listing.title}
        </span>
        <div className="flex items-center gap-1.5">
          <motion.button
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: saved ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)" }}
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              setSaved((current) => !current);
              toggleWishlist(listing.id);
            }}
          >
            <Heart
              fill={saved ? m.redLight : "none"}
              size={17}
              strokeWidth={saved ? 0 : 1.5}
              style={{ color: saved ? m.redLight : "#808088" }}
            />
          </motion.button>
          <motion.button
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "rgba(255,255,255,0.06)" }}
            type="button"
            whileTap={{ scale: 0.85 }}
          >
            <Share2 size={16} style={{ color: "#808088" }} />
          </motion.button>
          {isAdmin ? (
            <motion.button
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.12)" }}
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => setShowAdminSheet(true)}
            >
              <ShieldCheck size={16} style={{ color: "#fca5a5" }} />
            </motion.button>
          ) : null}
        </div>
      </motion.header>

      <main className="flex-1 overflow-y-auto pb-[152px] lg:px-8 lg:pb-10 lg:pt-8">
      <div className="mx-auto lg:grid lg:max-w-[1480px] lg:grid-cols-[minmax(0,1.12fr)_440px] lg:items-start lg:gap-8">
        <div className="lg:sticky lg:top-24">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <div className="relative">
            <div
              ref={galleryRef}
              className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
              onScroll={handleGalleryScroll}
              style={{ scrollbarWidth: "none" }}
            >
              {gallery.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="w-full shrink-0 snap-center"
                  onClick={() => setLightboxSrc(image)}
                >
                  <div
                    className="relative aspect-[4/3] overflow-hidden cursor-pointer"
                    style={{
                      background:
                        "radial-gradient(circle at top, rgba(88,20,20,0.2) 0%, rgba(18,18,22,0.96) 58%, rgba(12,12,14,1) 100%)",
                    }}
                  >
                    <img
                      alt={`${listing.title} ${index + 1}`}
                      className="h-full w-full object-contain p-2"
                      decoding="async"
                      loading={index === activeImg ? "eager" : "lazy"}
                      src={image}
                    />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(12,12,14,0.15) 0%, transparent 25%, transparent 80%, rgba(12,12,14,0.4) 100%)" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-[5px]">
              {gallery.map((image, index) => (
                <button
                  key={`${image}-dot`}
                  className="h-[6px] w-[6px] rounded-full transition-all duration-200"
                  style={{ background: index === activeImg ? "#ffffff" : "rgba(255,255,255,0.3)" }}
                  type="button"
                  onClick={() => {
                    setActiveImg(index);
                    const container = galleryRef.current;
                    const target = container?.children[index];
                    target?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
                  }}
                />
              ))}
            </div>
            <div
              className="absolute bottom-3 right-3 rounded-lg px-2 py-[3px]"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
            >
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                {activeImg + 1}/{Math.max(gallery.length, 1)}
              </span>
            </div>
            <div
              className="absolute left-3 top-3 rounded-lg px-2 py-[3px]"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", border: `1px solid ${tone.color}25` }}
            >
              <span className="text-[10px]" style={{ color: tone.color, fontWeight: 700 }}>
                {listing.condition || "N/A"}
              </span>
            </div>
          </div>
        </motion.div>
        </div>

        <div className="min-w-0 lg:rounded-[28px] lg:border lg:border-white/5 lg:bg-white/[0.015] lg:p-6">

        <motion.div
          className="px-4 pb-3 pt-3.5 lg:px-0 lg:pt-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-1 flex items-baseline gap-2.5">
            <span className="text-[28px] text-white tabular-nums" style={{ fontWeight: 700, lineHeight: 1 }}>
              {formatPrice(priceValue, listing.priceCurrency || "CAD")}
            </span>
            {marketPrice > 0 ? (
              <>
                <span className="text-[13px] tabular-nums line-through" style={{ color: "#4a4a52", fontWeight: 400 }}>
                  {formatPrice(marketPrice, "CAD")}
                </span>
                <span
                  className="rounded-md px-[6px] py-[2px] text-[11px]"
                  style={{
                    background: "rgba(52,211,153,0.1)",
                    border: "1px solid rgba(52,211,153,0.1)",
                    color: "#6ee7b7",
                    fontWeight: 700,
                  }}
                >
                  {discount}% below market
                </span>
              </>
            ) : null}
          </div>

          <h1 className="mt-1 text-[19px] text-white" style={{ fontWeight: 600, lineHeight: 1.2 }}>
            {listing.title}
          </h1>
          <p className="mt-[3px] text-[12px]" style={{ color: "#5e5e66", fontWeight: 400 }}>
            {[listing.setName || listing.set, listing.cardNumber ? `#${listing.cardNumber}` : null].filter(Boolean).join(" · ")}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {listing.game ? <MetaPill>{listing.game}</MetaPill> : null}
            {listing.type ? <MetaPill>{listing.type}</MetaPill> : null}
            {listing.condition ? <MetaPill accent>{listing.condition}</MetaPill> : null}
            {offerCount ? <MetaPill>{offerCount} offers</MetaPill> : null}
          </div>

          <div className="mt-3 flex items-center gap-3 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-1">
              <Eye size={11} style={{ color: "#4a4a52" }} />
              <span className="text-[10px]" style={{ color: "#4a4a52", fontWeight: 500 }}>
                {listing.views || 0} views
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Heart size={11} style={{ color: "#4a4a52" }} />
              <span className="text-[10px]" style={{ color: "#4a4a52", fontWeight: 500 }}>
                {(wishlist || []).includes(listing.id) ? 1 : 0} saves
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={11} style={{ color: "#4a4a52" }} />
              <span className="text-[10px]" style={{ color: "#4a4a52", fontWeight: 500 }}>
                Listed {compactTimeLabel(listing.createdAt || listing.sortTimestamp)}
              </span>
            </div>
          </div>
        </motion.div>

        <Divider />

        <motion.div
          className="px-4 py-3 lg:px-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-3 rounded-[22px] lg:border lg:border-white/5 lg:bg-white/[0.02] lg:p-4">
            <div className="relative">
              <div
                className="flex h-[42px] w-[42px] items-center justify-center rounded-[13px] text-[16px] text-white"
                style={{ background: m.redGradient, boxShadow: `0 3px 12px ${m.redGlow}`, fontWeight: 700 }}
              >
                {sellerInitial(seller)}
              </div>
              {seller?.verified ? (
                <div className="absolute -bottom-[2px] -right-[2px] flex h-[16px] w-[16px] items-center justify-center rounded-full" style={{ background: m.bg, border: "2px solid #0c0c0e" }}>
                  <CheckCircle2 size={12} fill="#3b82f6" style={{ color: "#ffffff" }} />
                </div>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[14px]" style={{ color: "#e4e4e8", fontWeight: 600 }}>
                  {sellerLabel(seller)}
                </span>
              </div>
              <div className="mt-[2px] flex items-center gap-1.5">
                <Star size={10} fill="#fbbf24" style={{ color: "#fbbf24" }} />
                <span className="text-[11px]" style={{ color: "#c0c0c8", fontWeight: 600 }}>
                  {Number(seller?.overallRating || seller?.rating || 0).toFixed(1)}
                </span>
                <span className="text-[10px]" style={{ color: "#4e4e56", fontWeight: 400 }}>
                  ({seller?.completedDeals || 0} sales)
                </span>
              </div>
            </div>
            <Link
              className="rounded-xl px-3 py-[7px]"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${m.border}` }}
              to={sellerHref(seller)}
              state={{ backTo: `${location.pathname}${location.search}${location.hash}` }}
            >
              <span className="text-[11px]" style={{ color: "#b0b0b8", fontWeight: 600 }}>
                View Profile
              </span>
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {seller?.verified ? (
              <div className="flex items-center gap-1 rounded-lg px-2 py-[4px]" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.08)" }}>
                <Shield size={9} style={{ color: "#60a5fa" }} />
                <span className="text-[9px]" style={{ color: "#93c5fd", fontWeight: 600 }}>
                  Verified
                </span>
              </div>
            ) : null}
            <div className="flex items-center gap-1 rounded-lg px-2 py-[4px]" style={{ background: "rgba(255,255,255,0.03)" }}>
              <Clock size={9} style={{ color: "#5e5e66" }} />
              <span className="text-[9px]" style={{ color: "#6a6a72", fontWeight: 500 }}>
                Replies {seller?.responseTime || "~1 hour"}
              </span>
            </div>
          </div>
          {currentUser?.id !== listing.sellerId ? (
            <div className="mt-4 hidden lg:grid lg:grid-cols-2 lg:gap-2">
              <SecondaryButton className="min-w-0 w-full" onClick={() => void handleMessageSeller()}>
                <MessageCircle size={16} style={{ color: "#c0c0c8" }} />
                Message
              </SecondaryButton>
              <PrimaryButton className="min-w-0 w-full" onClick={() => setShowOfferSheet(true)}>
                Make Offer
              </PrimaryButton>
            </div>
          ) : null}
        </motion.div>

        <Divider />

        <motion.div
          className="px-4 py-3 lg:px-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-2.5 text-[11px] uppercase tracking-[0.08em]" style={{ color: "#4a4a52", fontWeight: 600 }}>
            Meetup Options
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2.5 rounded-xl border p-2.5" style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.04)" }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(16,185,129,0.08)" }}>
                <Users size={14} style={{ color: "#6ee7b7" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px]" style={{ color: "#d0d0d4", fontWeight: 600 }}>
                    Local Meetup
                  </span>
                  <span className="rounded px-[5px] py-[1px] text-[9px]" style={{ background: "rgba(52,211,153,0.1)", color: "#6ee7b7", fontWeight: 600 }}>
                    FREE
                  </span>
                </div>
                <div className="mt-[3px] flex flex-wrap items-center gap-1">
                  {(trustedSpots.length ? trustedSpots : approvedMeetupSpots.slice(0, 3)).map((spot, index) => (
                    <span key={spot.id || spot.slug} className="text-[10px]" style={{ color: "#5a5a64", fontWeight: 400 }}>
                      {spot.label || spot.name}
                      {index < (trustedSpots.length ? trustedSpots : approvedMeetupSpots.slice(0, 3)).length - 1 ? (
                        <span className="mx-[3px]" style={{ color: "#2e2e36" }}>
                          ·
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <Divider />

        <motion.div
          className="px-4 py-3 lg:px-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-2.5 flex items-center gap-1.5">
            <TrendingDown size={13} style={{ color: "#6ee7b7" }} />
            <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: "#4a4a52", fontWeight: 600 }}>
              Price Context
            </p>
          </div>
          <div className="grid grid-cols-3 gap-[6px]">
            <div className="rounded-xl border p-2 text-center" style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.04)" }}>
              <p className="text-[13px] text-white tabular-nums" style={{ fontWeight: 700, lineHeight: 1.2 }}>
                {marketPrice ? formatPrice(marketPrice, "CAD") : "N/A"}
              </p>
              <p className="mt-[3px] text-[8px] uppercase tracking-wider" style={{ color: "#4a4a52", fontWeight: 500 }}>
                Market
              </p>
            </div>
            <div className="rounded-xl border p-2 text-center" style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.04)" }}>
              <p className="text-[13px] text-white tabular-nums" style={{ fontWeight: 700, lineHeight: 1.2 }}>
                {offerCount}
              </p>
              <p className="mt-[3px] text-[8px] uppercase tracking-wider" style={{ color: "#4a4a52", fontWeight: 500 }}>
                Offers
              </p>
            </div>
            <div className="rounded-xl border p-2 text-center" style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.1)" }}>
              <p className="text-[13px] text-white tabular-nums" style={{ color: "#fca5a5", fontWeight: 700, lineHeight: 1.2 }}>
                {formatPrice(priceValue, listing.priceCurrency || "CAD")}
              </p>
              <p className="mt-[3px] text-[8px] uppercase tracking-wider" style={{ color: "rgba(248,113,113,0.5)", fontWeight: 500 }}>
                Asking
              </p>
            </div>
          </div>
        </motion.div>

        <Divider />

        <motion.div
          className="px-4 py-3 lg:px-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-2 text-[11px] uppercase tracking-[0.08em]" style={{ color: "#4a4a52", fontWeight: 600 }}>
            Description
          </p>
          <p
            className="text-[12.5px]"
            style={{
              color: "#8a8a92",
              display: "-webkit-box",
              fontWeight: 400,
              lineHeight: 1.6,
              overflow: "hidden",
              WebkitBoxOrient: "vertical",
              ...(showFullDesc ? {} : { WebkitLineClamp: 3 }),
            }}
          >
            {listing.description || "No seller notes were provided for this listing yet."}
          </p>
          {listing.description ? (
            <button
              className="mt-1.5"
              style={{ color: m.redLight }}
              type="button"
              onClick={() => setShowFullDesc((current) => !current)}
            >
              <span className="text-[11px]" style={{ fontWeight: 600 }}>
                {showFullDesc ? "Show less" : "Read more"}
              </span>
            </button>
          ) : null}
        </motion.div>

        {relatedListings.length ? (
          <>
            <Divider />
            <motion.div
              className="py-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-2.5 flex items-center justify-between px-4">
                <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: "#4a4a52", fontWeight: 600 }}>
                  Similar Listings
                </p>
                <Link className="flex items-center gap-0.5" to={listing.gameSlug ? `/market/${listing.gameSlug}` : "/market"}>
                  <span className="text-[10px]" style={{ color: m.redLight, fontWeight: 500 }}>
                    See All
                  </span>
                </Link>
              </div>
              <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
                {relatedListings.map((related) => (
                  <div key={related.id} className="w-[120px] shrink-0">
                    <ListingTile
                      favorite={Boolean(wishlist?.includes(related.id))}
                      listing={related}
                      onFavorite={() => toggleWishlist(related.id)}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        ) : null}

        <Divider />

        <div className="flex items-center justify-center gap-4 px-4 py-3">
          <button className="flex items-center gap-1" type="button">
            <Flag size={11} style={{ color: "#3e3e46" }} />
            <span className="text-[10px]" style={{ color: "#3e3e46", fontWeight: 400 }}>
              Report listing
            </span>
          </button>
          <div className="h-3 w-px" style={{ background: "rgba(255,255,255,0.04)" }} />
          <button className="flex items-center gap-1" type="button">
            <Shield size={11} style={{ color: "#3e3e46" }} />
            <span className="text-[10px]" style={{ color: "#3e3e46", fontWeight: 400 }}>
              Safety tips
            </span>
          </button>
          {isAdmin ? (
            <>
              <div className="h-3 w-px" style={{ background: "rgba(255,255,255,0.04)" }} />
              <button className="flex items-center gap-1" type="button" onClick={() => setShowAdminSheet(true)}>
                <ShieldCheck size={11} style={{ color: "#fca5a5" }} />
                <span className="text-[10px]" style={{ color: "#fca5a5", fontWeight: 600 }}>
                  Admin controls
                </span>
              </button>
            </>
          ) : null}
        </div>
        </div>
        </div>
      </main>

        {currentUser?.id !== listing.sellerId ? (
          <motion.div
            className="fixed bottom-[max(0.45rem,env(safe-area-inset-bottom))] inset-x-0 z-50 mx-auto w-[min(calc(100vw-1rem),406px)] lg:hidden"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 28, stiffness: 320, delay: 0.2 }}
          >
            <div
              className="relative overflow-hidden rounded-[22px] p-2"
              style={{
                background:
                  "linear-gradient(180deg, rgba(56,14,18,0.42) 0%, rgba(18,18,22,0.88) 28%, rgba(12,12,14,0.96) 100%)",
                backdropFilter: "blur(32px) saturate(180%)",
                WebkitBackdropFilter: "blur(32px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-4 top-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)" }}
              />
              <div className="grid min-w-0 grid-cols-2 gap-2">
                <SecondaryButton className="min-w-0 w-full" onClick={() => void handleMessageSeller()}>
                  <MessageCircle size={16} style={{ color: "#c0c0c8" }} />
                  Message
                </SecondaryButton>
                <PrimaryButton className="min-w-0 w-full" onClick={() => setShowOfferSheet(true)}>
                  Make Offer
                </PrimaryButton>
              </div>
            </div>
          </motion.div>
        ) : null}

      <BottomSheet open={showOfferSheet} onClose={() => setShowOfferSheet(false)}>
        <div className="px-5 pb-8 pt-4">
          <div className="mb-1">
            <h2 className="text-[18px] text-white" style={{ fontWeight: 600 }}>
              Make an Offer
            </h2>
            <p className="mt-1 text-[12px]" style={{ color: "#5e5e66", fontWeight: 400 }}>
              Listed at {formatPrice(priceValue, listing.priceCurrency || "CAD")}
              {marketPrice ? ` · Market value ${formatPrice(marketPrice, "CAD")}` : ""}
            </p>
          </div>

          <div className="mb-4 mt-5 flex items-center gap-2 rounded-2xl border px-4 py-3" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="text-[22px]" style={{ color: "#4a4a52", fontWeight: 700 }}>
              $
            </span>
            <input
              autoFocus
              className="flex-1 bg-transparent text-[24px] text-[var(--text)] outline-none placeholder:text-[#2e2e36]"
              placeholder="0"
              style={{ "--text": "#f0f0f2", fontWeight: 700 }}
              type="number"
              value={offerAmount}
              onChange={(event) => setOfferAmount(event.target.value)}
            />
          </div>

          <div className="mb-5 flex gap-2">
            {[0.8, 0.85, 0.9, 1].map((ratio) => {
              const amount = Math.round(priceValue * ratio);
              const selected = offerAmount === String(amount);
              return (
                <motion.button
                  key={ratio}
                  className="flex-1 rounded-xl py-[7px] text-center"
                  style={{
                    background: selected ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selected ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)"}`,
                  }}
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setOfferAmount(String(amount))}
                >
                  <span className="text-[12px] tabular-nums" style={{ color: selected ? "#fca5a5" : "#6a6a72", fontWeight: 600 }}>
                    ${amount}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <PrimaryButton
            className="w-full"
            onClick={() => navigate(`/offer/${listing.id}`, { state: { quickCashAmount: offerAmount || null } })}
          >
            Continue to Offer
          </PrimaryButton>
        </div>
      </BottomSheet>

      <BottomSheet open={showAdminSheet} onClose={() => setShowAdminSheet(false)}>
        <div className="px-5 pb-8 pt-4">
          <div className="mb-1">
            <h2 className="text-[18px] text-white" style={{ fontWeight: 700 }}>
              Listing admin controls
            </h2>
            <p className="mt-1 text-[12px]" style={{ color: "#5e5e66", fontWeight: 400 }}>
              Moderate this listing and keep notes without leaving the page.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              className="rounded-[16px] px-4 py-3 text-left"
              style={{
                background: listing.flagged ? "rgba(248,113,113,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${listing.flagged ? "rgba(248,113,113,0.18)" : "rgba(255,255,255,0.05)"}`,
              }}
              type="button"
              onClick={() => void toggleListingFlag(listing.id)}
            >
              <Flag size={14} style={{ color: listing.flagged ? "#fca5a5" : "#9aa0ab" }} />
              <p className="mt-2 text-[12px] text-white" style={{ fontWeight: 700 }}>
                {listing.flagged ? "Unflag" : "Flag"}
              </p>
            </button>
            <button
              className="rounded-[16px] px-4 py-3 text-left"
              style={{
                background: listing.featured ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${listing.featured ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.05)"}`,
              }}
              type="button"
              onClick={() => void toggleListingFeatured(listing.id)}
            >
              <Star size={14} style={{ color: listing.featured ? "#fbbf24" : "#9aa0ab" }} />
              <p className="mt-2 text-[12px] text-white" style={{ fontWeight: 700 }}>
                {listing.featured ? "Unfeature" : "Feature"}
              </p>
            </button>
            <button
              className="rounded-[16px] px-4 py-3 text-left"
              style={{
                background: listing.status === "removed" ? "rgba(248,113,113,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${listing.status === "removed" ? "rgba(248,113,113,0.18)" : "rgba(255,255,255,0.05)"}`,
              }}
              type="button"
              onClick={() => void toggleListingRemoved(listing.id)}
            >
              <ShieldX size={14} style={{ color: listing.status === "removed" ? "#f87171" : "#9aa0ab" }} />
              <p className="mt-2 text-[12px] text-white" style={{ fontWeight: 700 }}>
                {listing.status === "removed" ? "Restore" : "Remove"}
              </p>
            </button>
            <div
              className="rounded-[16px] px-4 py-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <p className="text-[10px]" style={{ color: "#5e5e66", fontWeight: 700 }}>
                STATUS
              </p>
              <p className="mt-2 text-[12px] text-white" style={{ fontWeight: 700 }}>
                {listing.status === "removed" ? "Removed" : listing.flagged ? "Flagged" : "Active"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] text-white" style={{ fontWeight: 700 }}>
              Admin note
            </p>
            <textarea
              className="min-h-[120px] w-full rounded-[18px] px-4 py-3 text-[12px] outline-none"
              placeholder="Internal admin note"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.05)",
                color: "#ffffff",
                resize: "none",
              }}
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <SecondaryButton onClick={() => setShowAdminSheet(false)}>Close</SecondaryButton>
            <PrimaryButton disabled={adminSaving} onClick={() => void handleAdminNoteSave()}>
              {adminSaving ? "Saving..." : "Save note"}
            </PrimaryButton>
          </div>
        </div>
      </BottomSheet>

      {lightboxSrc ? (
        <Lightbox alt={listing.title} onClose={() => setLightboxSrc("")} src={lightboxSrc} />
      ) : null}
    </MobileScreen>
  );
}
