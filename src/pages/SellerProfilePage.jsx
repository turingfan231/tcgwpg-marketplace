import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Shield,
  Star,
  ThumbsUp,
  UserPlus,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import UserAvatar from "../components/shared/UserAvatar";
import ReviewModal from "../components/modals/ReviewModal";
import SeoHead from "../components/seo/SeoHead";
import { approvedMeetupSpots } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import { compactTimeLabel, sellerInitial, sellerLabel } from "../mobile/helpers";
import { slugify } from "../utils/formatters";
import { BottomSheet, EmptyBlock, ListingTile, MobileScreen, PrimaryButton, SecondaryButton } from "../mobile/primitives";

const tabs = [
  { id: "listings", label: "Listings" },
  { id: "reviews", label: "Reviews" },
  { id: "sold", label: "Sold" },
];

function ProfileMenu({ onClose }) {
  const actions = [
    { label: "Share Profile", icon: Copy, color: "#8a8a92" },
    { label: "Copy Link", icon: Copy, color: "#8a8a92" },
    { label: "Report Seller", icon: Flag, color: "#f87171" },
  ];

  return (
    <>
      <motion.button
        className="fixed inset-0 z-[55]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        type="button"
        onClick={onClose}
      />
      <motion.div
        className="absolute right-3 top-12 z-[56] overflow-hidden rounded-xl"
        initial={{ opacity: 0, scale: 0.9, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -5 }}
        style={{
          background: "rgba(28,28,34,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
        transition={{ type: "spring", damping: 22, stiffness: 350 }}
      >
        {actions.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left active:bg-white/[0.03]"
              style={{ borderBottom: index < actions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              type="button"
              onClick={onClose}
            >
              <Icon size={13} style={{ color: item.color }} />
              <span className="text-[12px]" style={{ color: item.color === "#f87171" ? "#f87171" : "#c0c0c8", fontWeight: 500 }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </motion.div>
    </>
  );
}

function BadgePill({ color, icon: Icon, label }) {
  return (
    <div
      className="flex items-center gap-1 rounded-lg px-2 py-[4px]"
      style={{ background: `${color}08`, border: `1px solid ${color}0d` }}
    >
      <Icon size={9} style={{ color }} />
      <span className="text-[9px]" style={{ color, fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      className="rounded-xl py-2 text-center"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}
    >
      <p className="text-[15px] tabular-nums" style={{ color: "#e8e8eb", fontWeight: 700, lineHeight: 1 }}>
        {value}
      </p>
      <p className="mt-[3px] text-[9px]" style={{ color: "#4e4e56", fontWeight: 500 }}>
        {label}
      </p>
    </div>
  );
}

function FollowerRow({ seller }) {
  return (
    <Link
      className="flex items-center gap-3 rounded-[16px] px-3 py-2"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}
      to={`/seller/${seller.id}`}
    >
      <UserAvatar className="h-10 w-10 text-[12px]" user={seller} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] text-white" style={{ fontWeight: 700 }}>
          {seller.publicName || seller.name}
        </p>
        <p className="mt-0.5 text-[10px]" style={{ color: "#5e5e66" }}>
          {seller.neighborhood || "Winnipeg"}
        </p>
      </div>
    </Link>
  );
}

function ReviewCard({ canDelete, onDelete, review }) {
  const reviewer = review.reviewer || {};
  return (
    <article
      className="rounded-xl p-3"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
            {reviewer.publicName || reviewer.name || "Local buyer"}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex items-center gap-[2px]">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={`${review.id}-star-${index}`}
                  fill={index < Number(review.rating || 0) ? "#fbbf24" : "none"}
                  size={10}
                  style={{ color: index < Number(review.rating || 0) ? "#fbbf24" : "#3e3e46" }}
                />
              ))}
            </div>
            <span className="text-[10px]" style={{ color: "#4a4a52" }}>
              {review.createdAt
                ? new Date(review.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
                : "Recently"}
            </span>
          </div>
        </div>
        {canDelete ? (
          <button className="text-[10px]" style={{ color: "#fca5a5", fontWeight: 700 }} type="button" onClick={onDelete}>
            Delete
          </button>
        ) : null}
      </div>
      <p className="mt-3 text-[11px]" style={{ color: "#8a8a92", fontWeight: 400, lineHeight: 1.5 }}>
        {review.comment}
      </p>
      {review.imageUrl ? (
        <img alt="Review attachment" className="mt-3 h-40 w-full rounded-[14px] object-cover" src={review.imageUrl} />
      ) : null}
    </article>
  );
}

export default function SellerProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sellerId } = useParams();
  const {
    activeListings,
    currentUser,
    deleteReview,
    findOrCreateThread,
    reviews,
    sellerMap,
    sellers,
    toggleSellerFollow,
  } = useMarketplace();

  const [tab, setTab] = useState("listings");
  const [showMenu, setShowMenu] = useState(false);
  const [followMessage, setFollowMessage] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);

  const seller = useMemo(() => {
    if (sellerMap?.[sellerId]) return sellerMap[sellerId];

    const normalizedSellerId = String(sellerId || "").toLowerCase();
    return (
      (Array.isArray(sellers) ? sellers : []).find((candidate) => {
        const candidateId = String(candidate.id || "").toLowerCase();
        const candidateSlug = slugify(candidate.publicName || candidate.username || candidate.name || "");
        return candidateId === normalizedSellerId || candidateSlug === normalizedSellerId;
      }) || null
    );
  }, [sellerId, sellerMap, sellers]);

  const isOwnProfile = String(currentUser?.id || "") === String(seller?.id || sellerId || "");
  const canReview = currentUser && !isOwnProfile;
  const canModerateReviews = currentUser?.role === "admin";
  const resolvedSellerId = String(seller?.id || sellerId || "");
  const normalizedSellerSlug = slugify(seller?.publicName || seller?.username || seller?.name || "");

  const sellerListings = useMemo(
    () =>
      activeListings
        .filter((listing) => {
          const listingSellerId = String(listing.sellerId || "").toLowerCase();
          const listingSellerSlug = slugify(
            listing.sellerName || listing.sellerPublicName || listing.sellerUsername || "",
          );
          return (
            listingSellerId === resolvedSellerId.toLowerCase() ||
            listingSellerSlug === normalizedSellerSlug ||
            listingSellerId === String(sellerId || "").toLowerCase()
          );
        })
        .sort((left, right) => Number(right.sortTimestamp || 0) - Number(left.sortTimestamp || 0)),
    [activeListings, normalizedSellerSlug, resolvedSellerId, sellerId],
  );

  const sellerReviews = useMemo(
    () =>
      reviews
        .filter((review) => String(review.sellerId || "") === resolvedSellerId)
        .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)),
    [resolvedSellerId, reviews],
  );

  const followerCount = useMemo(
    () =>
      (Array.isArray(sellers) ? sellers : []).filter((candidate) =>
        Array.isArray(candidate.followedSellerIds) ? candidate.followedSellerIds.includes(resolvedSellerId) : false,
      ).length,
    [resolvedSellerId, sellers],
  );
  const followerUsers = useMemo(
    () =>
      (Array.isArray(sellers) ? sellers : []).filter((candidate) =>
        Array.isArray(candidate.followedSellerIds) ? candidate.followedSellerIds.includes(resolvedSellerId) : false,
      ),
    [resolvedSellerId, sellers],
  );

  const trustedSpots = useMemo(
    () =>
      approvedMeetupSpots.filter((spot) =>
        Array.isArray(seller?.trustedMeetupSpots)
          ? seller.trustedMeetupSpots.includes(spot.id) || seller.trustedMeetupSpots.includes(spot.slug)
          : false,
      ),
    [seller],
  );

  if (!seller) {
    return (
      <MobileScreen>
        <SeoHead canonicalPath={`/seller/${sellerId}`} description="Seller profile" title="Seller not found" />
        <div className="px-4 pt-[max(0.9rem,env(safe-area-inset-top))]">
          <h1 className="text-[22px] text-white" style={{ fontWeight: 700 }}>Seller</h1>
          <p className="mt-1 text-[11px]" style={{ color: m.textSecondary }}>Local seller</p>
        </div>
        <div className="px-4 pt-4">
          <EmptyBlock description="That seller profile could not be found in the current marketplace snapshot." title="Seller not found" />
        </div>
      </MobileScreen>
    );
  }

  const badgeSpecs = [
    ...(seller.verified ? [{ label: "Verified", icon: Shield, color: "#60a5fa" }] : []),
    ...(Array.isArray(seller.badges)
      ? seller.badges.slice(0, 2).map((badge) => ({
          label: badge,
          icon: badge.toLowerCase().includes("fast") ? Zap : Award,
          color: badge.toLowerCase().includes("fast") ? "#6ee7b7" : "#fbbf24",
        }))
      : []),
    { label: seller.responseTime || "Fast responder", icon: Zap, color: "#6ee7b7" },
  ].slice(0, 3);

  const salesValue = seller.completedDeals || 0;
  const reviewValue = seller.reviewCount || sellerReviews.length;
  const ratingValue = Number(seller.overallRating || seller.rating || 0);
  const recentSoldCount = Math.min(Math.max(salesValue, 0), 6);
  const followActive = Boolean(seller.followedByCurrentUser);

  async function handleMessage() {
    const result = await findOrCreateThread({ otherUserId: seller.id });
    if (!result?.ok) {
      navigate("/auth", { state: { from: `/seller/${seller.id}` } });
      return;
    }
    navigate(`/inbox/${result.thread.id}`);
  }

  async function handleFollow() {
    const result = await toggleSellerFollow(seller.id);
    setFollowMessage(result?.error || (result?.followed ? "Seller alerts turned on." : "Seller alerts turned off."));
  }

  function handleBack() {
    if (location.state?.backTo) {
      navigate(location.state.backTo);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(isOwnProfile ? "/account" : "/sellers");
  }

  return (
    <MobileScreen>
      <SeoHead
        canonicalPath={`/seller/${seller.id}`}
        description={`${seller.publicName || seller.name} is a local Winnipeg seller with ${salesValue} completed deals and ${reviewValue} reviews.`}
        title={seller.publicName || seller.name}
      />

      <motion.header
        className="sticky top-0 z-50 flex items-center justify-between px-3 py-2 lg:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: "rgba(12,12,14,0.75)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <motion.button
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.06)" }}
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={handleBack}
        >
          <ArrowLeft size={18} style={{ color: "#c0c0c8" }} />
        </motion.button>
        <span className="text-[13px]" style={{ color: "#a0a0a8", fontWeight: 600 }}>Seller Profile</span>
        <motion.button
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.06)" }}
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={() => setShowMenu((current) => !current)}
        >
          <MoreHorizontal size={16} style={{ color: "#808088" }} />
        </motion.button>

        <AnimatePresence>{showMenu ? <ProfileMenu onClose={() => setShowMenu(false)} /> : null}</AnimatePresence>
      </motion.header>

      <main className="flex-1 overflow-y-auto pb-4 lg:px-8 lg:py-8">
        <div className="mx-auto lg:max-w-[1380px]">
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <div className="rounded-[28px] border p-6" style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <UserAvatar className="h-20 w-20 rounded-[24px] text-[24px]" user={seller} />
                <div>
                  <h1 className="text-[30px] text-white" style={{ fontWeight: 800, lineHeight: 1.05 }}>
                    {seller.publicName || seller.name}
                  </h1>
                  <div className="mt-2 flex items-center gap-2 text-[12px]" style={{ color: "#7a7a82" }}>
                    <MapPin size={12} />
                    <span>{seller.neighborhood || "Winnipeg, MB"}</span>
                    <span>•</span>
                    <span>Since {seller.createdAt ? new Date(seller.createdAt).toLocaleDateString("en-CA", { month: "short", year: "numeric" }) : "recently"}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Star size={12} fill="#fbbf24" style={{ color: "#fbbf24" }} />
                    <span className="text-[13px] text-white" style={{ fontWeight: 700 }}>{ratingValue.toFixed(1)}</span>
                    <span className="text-[12px]" style={{ color: "#7a7a82" }}>{reviewValue} reviews</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {badgeSpecs.map((badge) => (
                      <BadgePill key={`desktop-${badge.label}`} color={badge.color} icon={badge.icon} label={badge.label} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {isOwnProfile ? (
                  <PrimaryButton className="!rounded-[16px] !px-5" onClick={() => navigate("/dashboard")}>Open dashboard</PrimaryButton>
                ) : (
                  <>
                    <SecondaryButton className="!rounded-[16px] !px-5" onClick={() => void handleMessage()}>
                      <MessageCircle size={15} style={{ color: "#b0b0b8" }} />
                      Message
                    </SecondaryButton>
                    <PrimaryButton className="!rounded-[16px] !px-5" onClick={() => void handleFollow()}>
                      {followActive ? "Following" : "Follow"}
                    </PrimaryButton>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-[28px] border p-5" style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Sales" value={String(salesValue)} />
              <StatCard label="Active" value={String(sellerListings.length)} />
              <StatCard label="Response" value={seller.responseTime || "~1h"} />
              <button type="button" onClick={() => setShowFollowers(true)}>
                <StatCard label="Followers" value={String(followerCount)} />
              </button>
            </div>
            <div className="mt-4 rounded-[22px] p-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>Seller Summary</p>
              <p className="mt-3 text-[12px]" style={{ color: "#8a8a92", lineHeight: 1.6 }}>
                {seller.bio || "Collector and seller based in Winnipeg. Open to local meetup and reasonable offers."}
              </p>
            </div>
          </div>
        </div>

        <motion.section
          className="relative lg:hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24"
            style={{ background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${m.redGlow} 0%, transparent 70%)` }}
          />

          <div className="relative px-4 pb-3 pt-4">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                {seller.avatarUrl ? (
                  <img
                    alt={sellerLabel(seller)}
                    className="h-[56px] w-[56px] rounded-[18px] object-cover"
                    src={seller.avatarUrl}
                    style={{ boxShadow: `0 4px 20px ${m.redGlow}` }}
                  />
                ) : (
                  <div
                    className="flex h-[56px] w-[56px] items-center justify-center rounded-[18px] text-[22px] text-white"
                    style={{ background: m.redGradient, boxShadow: `0 4px 20px ${m.redGlow}`, fontWeight: 700 }}
                  >
                    {sellerInitial(seller)}
                  </div>
                )}
                {seller.verified ? (
                  <div
                    className="absolute -bottom-[2px] -right-[2px] flex h-[19px] w-[19px] items-center justify-center rounded-full"
                    style={{ background: m.bg, border: "2px solid #0c0c0e" }}
                  >
                    <CheckCircle2 size={15} fill="#3b82f6" style={{ color: "#fff" }} />
                  </div>
                ) : null}
                <div
                  className="absolute right-0 top-0 flex h-[12px] w-[12px] items-center justify-center rounded-full"
                  style={{ background: m.bg, border: "2px solid #0c0c0e" }}
                >
                  <div
                    className="h-[7px] w-[7px] rounded-full"
                    style={{ background: "#34d399", boxShadow: "0 0 5px rgba(52,211,153,0.5)" }}
                  />
                </div>
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <h1 className="truncate text-[19px] text-white" style={{ fontWeight: 700, lineHeight: 1.15 }}>
                  {seller.publicName || seller.name}
                </h1>
                <div className="mt-[3px] flex items-center gap-1.5">
                  <MapPin size={10} style={{ color: "#4e4e56" }} />
                  <span className="text-[11px]" style={{ color: "#5e5e66", fontWeight: 400 }}>
                    {seller.neighborhood || "Winnipeg, MB"}
                  </span>
                  <span className="text-[10px]" style={{ color: "#2a2a32" }}>/</span>
                  <Clock size={10} style={{ color: "#4e4e56" }} />
                  <span className="text-[11px]" style={{ color: "#5e5e66", fontWeight: 400 }}>
                    {seller.lastActiveAt ? compactTimeLabel(seller.lastActiveAt) : seller.responseTime || "Active recently"}
                  </span>
                </div>
                <div className="mt-[4px] flex items-center gap-1.5">
                  <Star size={10} fill="#fbbf24" style={{ color: "#fbbf24" }} />
                  <span className="text-[12px]" style={{ color: "#d0d0d4", fontWeight: 600 }}>{ratingValue.toFixed(1)}</span>
                  <span className="text-[10px]" style={{ color: "#4a4a52", fontWeight: 400 }}>({reviewValue} reviews)</span>
                  <span className="text-[10px]" style={{ color: "#2a2a32" }}>/</span>
                  <span className="text-[10px]" style={{ color: "#5e5e66", fontWeight: 500 }}>
                    Since {seller.createdAt ? new Date(seller.createdAt).toLocaleDateString("en-CA", { month: "short", year: "numeric" }) : "recently"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3.5 grid grid-cols-4 gap-2">
              <StatCard label="Sales" value={String(salesValue)} />
              <StatCard label="Active" value={String(sellerListings.length)} />
              <StatCard label="Response" value={seller.responseTime || "~1h"} />
              <button type="button" onClick={() => setShowFollowers(true)}>
                <StatCard label="Followers" value={String(followerCount)} />
              </button>
            </div>
          </div>
        </motion.section>

        <motion.section className="px-4 pb-3 lg:hidden" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 }}>
          <div className="flex gap-1.5">
            {badgeSpecs.map((badge) => (
              <BadgePill key={badge.label} color={badge.color} icon={badge.icon} label={badge.label} />
            ))}
          </div>
        </motion.section>

        <motion.section className="px-4 pb-3 lg:hidden" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
          {isOwnProfile ? (
            <PrimaryButton className="w-full !rounded-xl !py-[11px]" onClick={() => navigate("/dashboard")}>
              Open dashboard
            </PrimaryButton>
          ) : (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <SecondaryButton className="w-full !rounded-xl !py-[11px]" onClick={() => void handleMessage()}>
                <MessageCircle size={15} style={{ color: "#b0b0b8" }} />
                Message
              </SecondaryButton>
              <motion.button
                className="flex items-center justify-center gap-1.5 rounded-xl px-5 py-[11px]"
                style={{
                  background: followActive ? "rgba(239,68,68,0.1)" : m.redGradient,
                  boxShadow: followActive ? "none" : "0 3px 14px rgba(239,68,68,0.25)",
                  border: followActive ? "1px solid rgba(239,68,68,0.12)" : "none",
                }}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => void handleFollow()}
              >
                {followActive ? (
                  <span className="text-[13px]" style={{ color: "#fca5a5", fontWeight: 600 }}>Following</span>
                ) : (
                  <>
                    <UserPlus size={14} className="text-white" />
                    <span className="text-[13px] text-white" style={{ fontWeight: 600 }}>Follow</span>
                  </>
                )}
              </motion.button>
            </div>
          )}
        </motion.section>

        <motion.section className="px-4 pb-3 lg:hidden" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <div
            className="rounded-[14px] p-3"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}
          >
            <p className="mb-3 text-[12px]" style={{ color: "#8a8a92", fontWeight: 400, lineHeight: 1.5 }}>
              {seller.bio || "Collector and seller based in Winnipeg. Open to local meetup and reasonable offers."}
            </p>
            <div className="mb-2.5 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />

            <div className="flex flex-col gap-[10px]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(52,211,153,0.08)" }}>
                  <ThumbsUp size={11} style={{ color: "#6ee7b7" }} />
                </div>
                <div className="flex-1"><span className="text-[11px]" style={{ color: "#b0b0b8", fontWeight: 500 }}>Completion Rate</span></div>
                <span className="text-[12px] tabular-nums" style={{ color: "#6ee7b7", fontWeight: 600 }}>{salesValue ? "99%" : "New"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(251,191,36,0.08)" }}>
                  <MapPin size={11} style={{ color: "#fbbf24" }} />
                </div>
                <div className="min-w-0 flex-1"><span className="text-[11px]" style={{ color: "#b0b0b8", fontWeight: 500 }}>Local Meetups</span></div>
                <span className="max-w-[140px] truncate text-[11px]" style={{ color: "#5e5e66", fontWeight: 400 }}>
                  {(trustedSpots.length ? trustedSpots.map((spot) => spot.label || spot.name) : [seller.neighborhood || "Winnipeg"]).join(", ")}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(167,139,250,0.08)" }}>
                  <Heart size={11} style={{ color: "#a78bfa" }} />
                </div>
                <div className="flex-1"><span className="text-[11px]" style={{ color: "#b0b0b8", fontWeight: 500 }}>Focus</span></div>
                <div className="flex gap-1">
                  {(seller.favoriteGames || []).slice(0, 3).map((game) => (
                    <span key={game} className="rounded-md px-[5px] py-[2px] text-[9px]" style={{ background: "rgba(255,255,255,0.04)", color: "#7a7a82", fontWeight: 500 }}>
                      {game}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {followMessage ? <div className="px-4 pb-2 lg:px-0 lg:pb-4"><p className="text-[10px] lg:text-[12px]" style={{ color: "#6a6a72" }}>{followMessage}</p></div> : null}

        <motion.section className="mb-3 px-4 lg:mt-8 lg:px-0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.14 }}>
          <div className="flex gap-0 rounded-xl p-[3px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
            {tabs.map((item) => {
              const active = tab === item.id;
              const count = item.id === "listings" ? sellerListings.length : item.id === "reviews" ? sellerReviews.length : recentSoldCount;
              return (
                <motion.button
                  key={item.id}
                  className="relative flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-[8px]"
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setTab(item.id)}
                >
                  {active ? (
                    <motion.div
                      layoutId="seller-profile-tab"
                      className="absolute inset-0 rounded-[10px]"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.04)" }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    />
                  ) : null}
                  <span className="relative text-[12px]" style={{ color: active ? "#e0e0e4" : "#4e4e56", fontWeight: active ? 600 : 400 }}>{item.label}</span>
                  <span className="relative rounded-md px-[4px] py-[1px] text-[10px] tabular-nums" style={{ background: active ? "rgba(255,255,255,0.06)" : "transparent", color: active ? "#a0a0a8" : "#3a3a42", fontWeight: 600 }}>{count}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        <AnimatePresence mode="wait">
          {tab === "listings" ? (
            <motion.section key="listings" className="px-4 lg:px-0" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
              {sellerListings.length ? (
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
                  {sellerListings.slice(0, 8).map((listing) => (
                    <ListingTile key={listing.id} favorite={false} listing={listing} />
                  ))}
                </div>
              ) : (
                <EmptyBlock description="This seller does not have active listings right now." title="No listings" />
              )}
            </motion.section>
          ) : null}

          {tab === "reviews" ? (
            <motion.section key="reviews" className="px-4 lg:px-0" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
              <div className="mb-3 flex items-center gap-4 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="text-center">
                  <p className="text-[30px] tabular-nums" style={{ color: "#f0f0f2", fontWeight: 700, lineHeight: 1 }}>{ratingValue.toFixed(1)}</p>
                  <div className="mt-1 flex items-center justify-center gap-[2px]">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={`summary-star-${index}`} fill={index < Math.round(ratingValue) ? "#fbbf24" : "none"} size={10} style={{ color: index < Math.round(ratingValue) ? "#fbbf24" : "#3e3e46" }} />
                    ))}
                  </div>
                </div>
                <div className="h-10 w-px" style={{ background: "rgba(255,255,255,0.04)" }} />
                <div className="flex-1">
                  <p className="text-[12px] text-white" style={{ fontWeight: 600 }}>{reviewValue} local reviews</p>
                  <p className="mt-[2px] text-[10px]" style={{ color: "#5e5e66" }}>
                    {salesValue} completed deals / {followerCount} followers
                  </p>
                </div>
                {canReview ? (
                  <button className="rounded-lg px-3 py-[7px] text-[11px]" style={{ background: "rgba(239,68,68,0.08)", color: "#fca5a5", fontWeight: 600 }} type="button" onClick={() => setReviewOpen(true)}>
                    Leave review
                  </button>
                ) : null}
              </div>
              {sellerReviews.length ? (
                <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-4">
                  {sellerReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      canDelete={canModerateReviews}
                      onDelete={() => deleteReview(review.id)}
                      review={review}
                    />
                  ))}
                </div>
              ) : (
                <EmptyBlock description="No seller reviews have been posted yet." title="No reviews yet" />
              )}
            </motion.section>
          ) : null}

          {tab === "sold" ? (
            <motion.section key="sold" className="px-4 lg:px-0" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-[12px] text-white" style={{ fontWeight: 600 }}>Completed sales</p>
                  <div className="flex items-center gap-1">
                    <Eye size={10} style={{ color: "#4e4e56" }} />
                    <span className="text-[10px]" style={{ color: "#5e5e66", fontWeight: 500 }}>{salesValue} total</span>
                  </div>
                </div>
                <p className="mt-2 text-[11px]" style={{ color: "#8a8a92", lineHeight: 1.5, fontWeight: 400 }}>
                  This seller has completed {salesValue} marketplace transactions. Sold history is reflected in review and dashboard activity.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-[10px]" style={{ color: "#4e4e56", fontWeight: 500 }}>Trust level</p>
                    <p className="mt-1 text-[13px] text-white" style={{ fontWeight: 700 }}>{seller.verified ? "Verified seller" : "Community seller"}</p>
                  </div>
                  <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-[10px]" style={{ color: "#4e4e56", fontWeight: 500 }}>Response</p>
                    <p className="mt-1 text-[13px] text-white" style={{ fontWeight: 700 }}>{seller.responseTime || "~1 hour"}</p>
                  </div>
                </div>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
        </div>
      </main>

      {reviewOpen ? <ReviewModal seller={seller} onClose={() => setReviewOpen(false)} /> : null}
      <BottomSheet open={showFollowers} onClose={() => setShowFollowers(false)}>
        <div className="px-4 pb-6 pt-4">
          <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>
            Followers
          </p>
          <div className="mt-4 grid gap-2">
            {followerUsers.length ? (
              followerUsers.map((person) => <FollowerRow key={`${resolvedSellerId}-${person.id}`} seller={person} />)
            ) : (
              <p className="text-[11px]" style={{ color: "#8a8a92" }}>
                No followers yet.
              </p>
            )}
          </div>
        </div>
      </BottomSheet>
    </MobileScreen>
  );
}
