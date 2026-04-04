import { ArrowLeft, Heart, MapPin, RotateCw, Search, Star, X } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { m, conditionStyle } from "./design";
import {
  compactTimeLabel,
  formatPrice,
  inboxHref,
  listingArtwork,
  listingHref,
  rememberAndNavigateToListing,
  sellerHref,
  sellerInitial,
  sellerLabel,
  storeHref,
} from "./helpers";

export function MobileScreen({ children, className = "" }) {
  return (
    <div
      role="main"
      className={`flex h-full min-h-0 w-full flex-1 flex-col overflow-x-hidden lg:w-full ${className}`}
      style={{
        background: m.bg,
        WebkitTapHighlightColor: "transparent",
        overscrollBehaviorY: "none",
      }}
    >
      {children}
    </div>
  );
}

export function ScreenSection({ children, className = "" }) {
  return <section className={`px-4 lg:px-6 ${className}`}>{children}</section>;
}

export function ScreenHeader({ title, subtitle, right, className = "" }) {
  return (
    <div className={`px-4 pb-2 pt-[max(0.85rem,env(safe-area-inset-top))] lg:px-6 lg:pb-4 lg:pt-8 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] tracking-tight text-white lg:text-[30px]" style={{ fontWeight: 700, lineHeight: 1 }}>
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-[11px] lg:text-[12px]" style={{ color: m.textTertiary, fontWeight: 500 }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {right}
      </div>
    </div>
  );
}

export function DetailHeader({ title, subtitle, onBack, right, className = "" }) {
  return (
    <div
      className={`sticky top-0 z-40 px-4 pb-2 pt-[max(0.8rem,env(safe-area-inset-top))] lg:px-6 lg:pb-4 lg:pt-6 ${className}`}
      style={{
        background: "rgba(12,12,14,0.88)",
        backdropFilter: "blur(28px) saturate(160%)",
        WebkitBackdropFilter: "blur(28px) saturate(160%)",
        borderBottom: `1px solid ${m.border}`,
      }}
    >
      <div className="flex items-center gap-3">
        <motion.button
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
          style={{ background: m.surfaceStrong, border: `1px solid ${m.border}` }}
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
        >
          <ArrowLeft size={16} style={{ color: m.text }} />
        </motion.button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] text-white" style={{ fontWeight: 700 }}>
            {title}
          </p>
          {subtitle ? (
            <p className="mt-[2px] truncate text-[10px]" style={{ color: m.textSecondary, fontWeight: 500 }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {right}
      </div>
    </div>
  );
}

export function InlineSearch({ value, onChange, placeholder = "Search", className = "", readOnly = false, onClick }) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded-[14px] px-3 py-[9px] text-left ${className}`}
      style={{ background: m.surfaceStrong, border: `1px solid ${m.border}` }}
      type="button"
      onClick={onClick}
    >
      <Search size={14} style={{ color: m.textMuted }} />
      {readOnly ? (
        <span className="text-[12.5px]" style={{ color: m.textMuted }}>
          {placeholder}
        </span>
      ) : (
        <input
          className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-[color:var(--placeholder)]"
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          style={{ "--placeholder": m.textMuted, color: m.text }}
          value={value || ""}
        />
      )}
    </button>
  );
}

export function IconButton({ children, onClick, active = false, className = "", ariaLabel }) {
  return (
    <motion.button
      aria-label={ariaLabel}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[12px] ${className}`}
      style={{
        background: active ? "rgba(239,68,68,0.12)" : m.surfaceStrong,
        border: `1px solid ${active ? "rgba(239,68,68,0.15)" : m.border}`,
      }}
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

export function PrimaryButton({ children, onClick, type = "button", disabled = false, className = "" }) {
  return (
    <motion.button
      className={`inline-flex h-[44px] items-center justify-center gap-2 rounded-[14px] px-4 text-[13px] text-white ${className}`}
      style={{
        background: disabled ? m.surfaceStrong : m.redGradient,
        color: disabled ? m.textTertiary : "#fff",
        fontWeight: 700,
        boxShadow: disabled ? "none" : "0 8px 24px rgba(185,28,28,0.26)",
      }}
      disabled={disabled}
      type={type}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

export function SecondaryButton({ children, onClick, type = "button", className = "", disabled = false }) {
  return (
    <motion.button
      className={`inline-flex h-[44px] items-center justify-center gap-2 rounded-[14px] px-4 text-[12px] ${className}`}
      style={{
        background: m.surfaceStrong,
        border: `1px solid ${m.border}`,
        color: disabled ? m.textTertiary : m.text,
        fontWeight: 600,
      }}
      disabled={disabled}
      type={type}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  prefix,
  type = "text",
  inputMode,
  className = "",
  readOnly = false,
}) {
  return (
    <div className={`relative ${className}`}>
      {prefix ? (
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px]"
          style={{ color: m.textSecondary, fontWeight: 700 }}
        >
          {prefix}
        </span>
      ) : null}
      <input
        className={`h-[42px] w-full rounded-[14px] border px-3 text-[12.5px] outline-none ${prefix ? "pl-7" : ""}`}
        style={{
          background: m.surfaceStrong,
          borderColor: m.border,
          color: m.text,
          fontWeight: 500,
        }}
        inputMode={inputMode}
        placeholder={placeholder}
        readOnly={readOnly}
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </div>
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3, className = "" }) {
  return (
    <textarea
      className={`w-full rounded-[14px] border px-3 py-3 text-[12.5px] outline-none ${className}`}
      rows={rows}
      style={{
        background: m.surfaceStrong,
        borderColor: m.border,
        color: m.text,
        fontWeight: 400,
        resize: "none",
      }}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

export function ChoicePill({ active, children, onClick, className = "" }) {
  return (
    <motion.button
      className={`rounded-full px-3 py-[7px] text-[11px] ${className}`}
      style={{
        background: active ? m.redGradient : m.surfaceStrong,
        color: active ? "#fff" : m.textSecondary,
        border: active ? "none" : `1px solid ${m.border}`,
        fontWeight: active ? 700 : 500,
      }}
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

export function BottomActionBar({ children }) {
  return (
    <div
      className="fixed bottom-[max(0.45rem,env(safe-area-inset-bottom))] inset-x-0 z-50 mx-auto w-[min(calc(100vw-1rem),406px)] pt-2.5"
      style={{ pointerEvents: "none" }}
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
          pointerEvents: "auto",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-4 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)" }}
        />
        {children}
      </div>
    </div>
  );
}

export function BottomSheet({ children, open, onClose }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            className="fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)" }}
            type="button"
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto w-full max-w-[430px] px-2 lg:max-w-[640px]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            style={{ pointerEvents: "none" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            <div
              className="max-h-[min(76dvh,620px)] overflow-y-auto rounded-t-[24px]"
              style={{
                background: "#16161a",
                border: `1px solid ${m.borderStrong}`,
                borderBottom: "none",
                boxShadow: "0 -18px 40px rgba(0,0,0,0.42)",
                pointerEvents: "auto",
              }}
            >
              <div className="flex justify-center pt-2">
                <div className="h-1 w-10 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
              </div>
              {children}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function PullToRefresh({ children, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const containerRef = useRef(null);
  const startYRef = useRef(0);
  const pullY = useMotionValue(0);
  const threshold = 70;
  const spinnerOpacity = useTransform(pullY, [0, threshold * 0.5, threshold], [0, 0.5, 1]);
  const spinnerScale = useTransform(pullY, [0, threshold], [0.5, 1]);
  const spinnerRotate = useTransform(pullY, [0, threshold * 2], [0, 360]);

  const handleTouchStart = useCallback((event) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startYRef.current = event.touches[0].clientY;
      setPulling(true);
    }
  }, [containerRef]);

  const handleTouchMove = useCallback((event) => {
    if (!pulling || refreshing) {
      return;
    }
    const nextDelta = Math.max(0, (event.touches[0].clientY - startYRef.current) * 0.45);
    pullY.set(Math.min(nextDelta, threshold * 1.5));
  }, [pullY, pulling, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) {
      return;
    }
    if (pullY.get() >= threshold && !refreshing) {
      setRefreshing(true);
      pullY.set(threshold * 0.7);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
      }
    }
    pullY.set(0);
    setPulling(false);
  }, [onRefresh, pullY, pulling, refreshing]);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <motion.div
        className="pointer-events-none absolute left-1/2 top-0 z-30 flex -translate-x-1/2 items-center justify-center"
        style={{
          opacity: spinnerOpacity,
          scale: spinnerScale,
          y: useTransform(pullY, [0, threshold], [-20, 12]),
        }}
      >
        <motion.div
          className="flex h-[32px] w-[32px] items-center justify-center rounded-full"
          style={{
            background: "rgba(20,20,24,0.9)",
            border: `1px solid ${m.borderStrong}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            rotate: refreshing ? undefined : spinnerRotate,
          }}
          animate={refreshing ? { rotate: 360 } : {}}
          transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : {}}
        >
          <RotateCw size={14} style={{ color: m.redLight }} />
        </motion.div>
      </motion.div>

      <motion.div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{ y: useTransform(pullY, (value) => Math.min(value * 0.3, 25)) }}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function Lightbox({ alt = "", onClose, src }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: "rgba(0,0,0,0.92)" }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      >
        <motion.button
          aria-label="Close image preview"
          className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.1)" }}
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={onClose}
        >
          <X size={18} className="text-white" />
        </motion.button>
        <motion.img
          alt={alt}
          className="max-h-[85vh] max-w-[95vw] rounded-xl object-contain"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          src={src}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(event) => event.stopPropagation()}
        />
      </motion.div>
    </AnimatePresence>
  );
}

export function SectionTitle({ title, action, className = "" }) {
  return (
    <div className={`mb-2 mt-4 flex items-center justify-between px-4 ${className}`}>
      <h2 className="text-[13px] text-white" style={{ fontWeight: 700 }}>
        {title}
      </h2>
      {action}
    </div>
  );
}

export function SmallAction({ children, onClick, to }) {
  const content = (
    <span className="text-[11px]" style={{ color: m.textSecondary, fontWeight: 500 }}>
      {children}
    </span>
  );
  if (to) {
    return <Link to={to}>{content}</Link>;
  }
  return (
    <button type="button" onClick={onClick}>
      {content}
    </button>
  );
}

export function ConditionPill({ condition }) {
  const tone = conditionStyle(condition);
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-[2px] text-[9px]"
      style={{ background: tone.bg, color: tone.color, fontWeight: 700 }}
    >
      {tone.label}
    </span>
  );
}

export function SellerChip({ seller, rating }) {
  return (
    <Link className="flex items-center gap-1.5" to={sellerHref(seller)}>
      <div
        className="flex h-[14px] w-[14px] items-center justify-center rounded-full text-[7px] text-white"
        style={{ background: "#2a2a32", fontWeight: 700 }}
      >
        {sellerInitial(seller)}
      </div>
      <span className="max-w-[8rem] truncate text-[9px]" style={{ color: m.textSecondary, fontWeight: 500 }}>
        {sellerLabel(seller)}
      </span>
      {rating ? (
        <>
          <Star size={8} fill="#fbbf24" style={{ color: "#fbbf24" }} />
          <span className="text-[8px]" style={{ color: m.textSecondary, fontWeight: 500 }}>
            {Number(rating).toFixed(1)}
          </span>
        </>
      ) : null}
    </Link>
  );
}

export function ListingRow({
  listing,
  favorite,
  meta,
  onFavorite,
  trailing,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const seller = listing?.seller || listing;
  const rating = listing.seller?.overallRating || listing.seller?.rating || seller?.overallRating;
  return (
    <motion.div
      className="flex overflow-hidden rounded-xl"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.05)",
        contentVisibility: "auto",
        containIntrinsicSize: "86px 680px",
      }}
      whileTap={{ scale: 0.985 }}
    >
      <button
        className="relative w-[64px] shrink-0 overflow-hidden"
        data-listing-link={listing.id}
        type="button"
        onClick={() => rememberAndNavigateToListing(navigate, location, listing.id)}
      >
        <img
          alt={listing.title}
          className="h-full w-full object-cover"
          decoding="async"
          loading="lazy"
          src={listingArtwork(listing)}
          style={{ minHeight: 68, background: m.bgElevated }}
        />
        <div className="absolute left-1 top-1">
          <ConditionPill condition={listing.condition} />
        </div>
      </button>
      <button
        className="min-w-0 flex-1 px-2.5 py-2 text-left"
        data-listing-link={listing.id}
        type="button"
        onClick={() => rememberAndNavigateToListing(navigate, location, listing.id)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[12px] text-white" style={{ fontWeight: 600 }}>
              {listing.title}
            </p>
            <p className="mt-[1px] truncate text-[9.5px]" style={{ color: "#48484f", fontWeight: 400 }}>
              {meta || [listing.setName || listing.set, listing.game].filter(Boolean).join(" · ")}
            </p>
          </div>
          <span className="shrink-0 text-[13px] tabular-nums text-[#f4f4f6]" style={{ fontWeight: 700 }}>
            {formatPrice(listing.priceCad ?? listing.price, listing.priceCurrency || "CAD")}
          </span>
        </div>
        <div className="mt-[4px] flex items-center gap-1">
          <div
            className="flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-full text-[5px] text-white"
            style={{ background: "#2a2a32", fontWeight: 700 }}
          >
            {sellerInitial(seller)}
          </div>
          <span className="max-w-[7.5rem] truncate text-[9px]" style={{ color: "#505058", fontWeight: 500 }}>
            {sellerLabel(seller)}
          </span>
          {rating ? (
            <>
              <Star size={7} fill="#fbbf24" style={{ color: "#fbbf24" }} />
              <span className="text-[8px]" style={{ color: "#505058", fontWeight: 500 }}>
                {Number(rating).toFixed(1)}
              </span>
            </>
          ) : null}
          {listing.neighborhood ? (
            <>
              <span style={{ color: "#2a2a32", fontSize: 5 }}>•</span>
              <MapPin size={7} style={{ color: "#3e3e48" }} />
              <span className="truncate text-[8.5px]" style={{ color: "#4a4a52", fontWeight: 400 }}>
                {listing.neighborhood}
              </span>
            </>
          ) : null}
          <div className="flex-1" />
          <span className="text-[8px]" style={{ color: "#303038" }}>
            {compactTimeLabel(listing.sortTimestamp || listing.createdAt || listing.timeAgo)}
          </span>
        </div>
      </button>
      <div className="flex w-[28px] shrink-0 items-center justify-center pr-2">
        {trailing ? (
          trailing
        ) : (
          <button
            className="inline-flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: "transparent" }}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onFavorite?.();
            }}
          >
            <Heart
              fill={favorite ? m.red : "none"}
              size={12}
              strokeWidth={favorite ? 0 : 1.6}
              style={{ color: favorite ? m.red : "#4a4a52" }}
            />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function ListingTile({ listing, favorite, onFavorite }) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <motion.div
      className="overflow-hidden rounded-xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.05)",
        contentVisibility: "auto",
        containIntrinsicSize: "240px 220px",
      }}
      whileTap={{ scale: 0.975 }}
    >
      <div
        className="relative block aspect-[4/5] w-full cursor-pointer overflow-hidden"
        data-listing-link={listing.id}
        role="button"
        tabIndex={0}
        onClick={() => rememberAndNavigateToListing(navigate, location, listing.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            rememberAndNavigateToListing(navigate, location, listing.id);
          }
        }}
      >
        <img
          alt={listing.title}
          className="h-full w-full object-cover"
          decoding="async"
          loading="lazy"
          src={listingArtwork(listing)}
          style={{ background: m.bgElevated }}
        />
        <div className="absolute left-1.5 top-1.5">
          <ConditionPill condition={listing.condition} />
        </div>
        <button
          className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "#FFFCFC", boxShadow: "0 2px 7px rgba(0,0,0,0.08)" }}
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onFavorite?.();
          }}
        >
          <Heart
            fill={favorite ? m.red : "none"}
            size={16}
            strokeWidth={favorite ? 0 : 1.6}
            style={{ color: favorite ? m.red : "#281B1B" }}
          />
        </button>
      </div>
      <button
        className="block w-full px-2.5 py-2.5 text-left"
        data-listing-link={listing.id}
        type="button"
        onClick={() => rememberAndNavigateToListing(navigate, location, listing.id)}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-[11px] text-white" style={{ fontWeight: 600 }}>
            {listing.title}
          </p>
          <span className="shrink-0 text-[12px] text-white" style={{ fontWeight: 700 }}>
            {formatPrice(listing.priceCad ?? listing.price, listing.priceCurrency || "CAD")}
          </span>
        </div>
        <p className="mt-[2px] truncate text-[9px]" style={{ color: m.textTertiary }}>
          {[listing.setName || listing.set, listing.game].filter(Boolean).join(" · ")}
        </p>
      </button>
    </motion.div>
  );
}

export function EventRow({ event }) {
  const day = event.date
    ? new Date(event.date).toLocaleString("en-CA", { weekday: "short" }).toUpperCase()
    : event.day || "";
  const dateNum = event.date ? String(new Date(event.date).getDate()) : event.num || "";
  return (
    <motion.div
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}
      whileTap={{ scale: 0.985 }}
    >
      <div
        className="flex h-[34px] w-[34px] shrink-0 flex-col items-center justify-center rounded-[10px]"
        style={{ background: "rgba(239,68,68,0.08)" }}
      >
        <span className="text-[7px]" style={{ color: m.danger, fontWeight: 700, lineHeight: 1 }}>
          {day}
        </span>
        <span className="text-[14px] leading-none text-[#fca5a5]" style={{ fontWeight: 700 }}>
          {dateNum}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11.5px] text-white" style={{ fontWeight: 600 }}>
          {event.title}
        </p>
        <p className="mt-[2px] truncate text-[9px]" style={{ color: "#4a4a54", fontWeight: 400 }}>
          {[event.store, event.time].filter(Boolean).join(" · ")}
        </p>
      </div>
    </motion.div>
  );
}

export function MiniStoreRow({ store, followerCount }) {
  return (
    <Link
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}
      to={storeHref(store.slug)}
    >
      <div
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] text-[12px] text-white"
        style={{ background: "rgba(255,255,255,0.08)", fontWeight: 700 }}
      >
        {String(store.shortName || store.name || "?").charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] text-white" style={{ fontWeight: 600 }}>
          {store.name}
        </p>
        <p className="mt-[2px] truncate text-[9px]" style={{ color: "#4a4a54", fontWeight: 400 }}>
          {store.neighborhood}
          {typeof followerCount === "number" ? ` · ${followerCount} follows` : ""}
        </p>
      </div>
    </Link>
  );
}

export function ThreadRow({ thread, offerCount }) {
  return (
    <Link
      className="block rounded-[16px] px-3 py-3"
      style={{ background: m.surface, border: `1px solid ${m.border}` }}
      to={inboxHref(thread.id)}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-sm text-white"
          style={{ background: "rgba(255,255,255,0.08)", fontWeight: 700 }}
        >
          {sellerInitial(thread.otherParticipant || { name: thread.participantLabel })}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] text-white" style={{ fontWeight: 600 }}>
                {thread.otherParticipant?.publicName || thread.participantLabel || "Conversation"}
              </p>
              <p className="mt-[2px] truncate text-[10px]" style={{ color: m.textSecondary }}>
                {thread.listing?.title || "General thread"}
              </p>
            </div>
            <span className="shrink-0 text-[9px]" style={{ color: m.textMuted }}>
              {compactTimeLabel(thread.updatedAt)}
            </span>
          </div>
          <p className="mt-[6px] line-clamp-2 text-[11px]" style={{ color: m.textSecondary }}>
            {thread.lastMessage?.body || "No messages yet"}
          </p>
          <div className="mt-[6px] flex items-center gap-2">
            {thread.unreadCount ? (
              <span
                className="rounded-full px-1.5 py-[2px] text-[8px] text-white"
                style={{ background: m.redGradient, fontWeight: 700 }}
              >
                {thread.unreadCount} new
              </span>
            ) : null}
            {offerCount ? (
              <span className="text-[8px]" style={{ color: m.textTertiary, fontWeight: 600 }}>
                {offerCount} offers
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function EmptyBlock({ title, description, action }) {
  return (
    <div
      className="rounded-[18px] px-4 py-5 text-center"
      style={{ background: m.surface, border: `1px solid ${m.border}` }}
    >
      <p className="text-[14px] text-white" style={{ fontWeight: 600 }}>
        {title}
      </p>
      <p className="mt-2 text-[11px]" style={{ color: m.textSecondary }}>
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
