import { BadgeCheck, BellRing, Clock3, ShieldCheck, Store, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
import ReviewModal from "../components/modals/ReviewModal";
import UserAvatar from "../components/shared/UserAvatar";
import EmptyState from "../components/ui/EmptyState";
import PageSkeleton from "../components/ui/PageSkeleton";
import RatingStars from "../components/ui/RatingStars";
import { approvedMeetupSpots } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";

const bannerToneMap = {
  neutral: "from-[#551014]/96 via-[#7a181d]/94 to-[#30090b]/96",
  admin: "from-[#4d0d11]/96 via-[#74161b]/94 to-[#290708]/96",
  pokemon: "from-[#631216]/96 via-[#8c1c22]/94 to-[#3b0a0c]/96",
  magic: "from-[#4b0d10]/96 via-[#6d161a]/94 to-[#250607]/96",
  "one-piece": "from-[#6a1418]/96 via-[#911e24]/94 to-[#35080a]/96",
  "dragon-ball-fusion-world": "from-[#5a1013]/96 via-[#8d1f21]/94 to-[#2f0809]/96",
  "union-arena": "from-[#47101b]/96 via-[#6a1828]/94 to-[#26070e]/96",
};

const sellerBannerArtMap = {
  pokemon:
    "https://bouncycastlenetwork-res.cloudinary.com/image/upload/f_auto,q_auto,c_limit,w_1000/ff36cb86b0aefad50ddd401ff138fde5",
  magic:
    "https://shikdartrading.com/cdn/shop/files/MTG_Banner_2.jpg?v=1730184513&width=3840",
  "one-piece":
    "https://www.toei-animation.com/wp-content/uploads/2019/02/collage-1920x595.png",
  "dragon-ball-fusion-world":
    "https://www.dbs-cardgame.com/fw/renewal01/images/ogp.png",
  "union-arena":
    "https://www.unionarena-tcg.com/na/ogp.png?v0",
};

export default function SellerProfilePage() {
  const { sellerId } = useParams();
  const {
    activeListings,
    currentUser,
    deleteReview,
    loading,
    reviewBadgeCatalog,
    reviews,
    sellerMap,
    sellers,
    toggleSellerFollow,
  } = useMarketplace();
  const [isReviewModalOpen, setReviewModalOpen] = useState(false);
  const [deleteReviewError, setDeleteReviewError] = useState("");
  const [followMessage, setFollowMessage] = useState("");

  const seller = sellerMap[sellerId];
  const sellerReviews = useMemo(
    () => reviews.filter((review) => review.sellerId === sellerId),
    [reviews, sellerId],
  );
  const sellerListings = useMemo(
    () => activeListings.filter((listing) => listing.sellerId === sellerId),
    [activeListings, sellerId],
  );
  const followerCount = useMemo(
    () =>
      sellers.filter((candidate) =>
        Array.isArray(candidate.followedSellerIds)
          ? candidate.followedSellerIds.includes(sellerId)
          : false,
      ).length,
    [sellerId, sellers],
  );
  const isOwnProfile = String(currentUser?.id || "") === String(sellerId || "");
  const isAdmin = currentUser?.role === "admin";
  const trustedSpots = approvedMeetupSpots.filter((spot) =>
    Array.isArray(seller?.trustedMeetupSpots) ? seller.trustedMeetupSpots.includes(spot.id) : false,
  );
  const sellerBannerArt = seller ? sellerBannerArtMap[seller.bannerStyle] : "";

  if (loading && !seller) {
    return <PageSkeleton cards={4} titleWidth="w-72" />;
  }

  if (!seller) {
    return (
      <EmptyState
        description="The seller profile may not exist yet in local storage."
        title="Seller Not Found"
      />
    );
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      <section className="console-panel overflow-hidden">
        <div
          className={`relative overflow-hidden bg-gradient-to-r ${bannerToneMap[seller.bannerStyle] || bannerToneMap.neutral} p-4 text-white sm:p-8`}
        >
          {sellerBannerArt ? (
            <img
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-28"
              src={sellerBannerArt}
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(6,17,27,0.9),rgba(16,39,57,0.78)_44%,rgba(6,17,27,0.84))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.1),transparent_16%),radial-gradient(circle_at_82%_20%,rgba(239,59,51,0.16),transparent_14%),radial-gradient(circle_at_75%_78%,rgba(177,29,35,0.16),transparent_18%),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:auto,auto,auto,42px_42px,42px_42px]" />

          <div className="relative z-10">
            <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-start gap-3.5 sm:gap-5">
                <UserAvatar
                  className="h-16 w-16 border border-white/15 bg-white/10 text-xl sm:h-24 sm:w-24 sm:text-3xl"
                  imageClassName="border border-white/15"
                  textClassName="text-xl font-bold sm:text-3xl"
                  user={seller}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <h1 className="font-display text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl">
                      {seller.publicName || seller.name}
                    </h1>
                    {seller.verified ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white sm:px-3 sm:text-xs sm:tracking-[0.18em]">
                        <ShieldCheck size={14} />
                        Verified seller
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2.5 max-w-3xl text-[0.88rem] leading-6 text-white/82 sm:mt-3 sm:text-base sm:leading-8">{seller.bio}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2.5 sm:mt-4 sm:gap-3">
                    <RatingStars size={18} value={seller.overallRating} />
                    <span className="text-[0.8rem] text-white/80 sm:text-sm">
                      {seller.overallRating.toFixed(1)} overall from {seller.reviewCount} reviews
                    </span>
                    <span className="text-[0.8rem] text-white/80 sm:text-sm">
                      {followerCount} follower{followerCount === 1 ? "" : "s"}
                    </span>
                    <span className="text-[0.8rem] text-white/80 sm:text-sm">
                      {seller.neighborhood}
                      {seller.postalCode ? ` | ${seller.postalCode}` : ""}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 sm:gap-3">
                {isOwnProfile ? (
                  <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-[0.82rem] font-semibold text-white/78 sm:px-5 sm:py-3 sm:text-sm">
                    Reviews from other local buyers only
                  </div>
                ) : (
                  <>
                    <button
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[0.82rem] font-semibold sm:px-5 sm:py-3 sm:text-sm ${
                        seller.followedByCurrentUser
                          ? "border border-white/20 bg-white/10 text-white"
                          : "bg-white text-ink"
                      }`}
                        type="button"
                        onClick={async () => {
                          const result = await toggleSellerFollow(seller.id);
                          setFollowMessage(
                            result?.error ||
                              (result?.followed
                                ? "You will get alerts when this seller posts new listings."
                                : "Seller notifications turned off."),
                          );
                      }}
                    >
                      <BellRing size={15} />
                      {seller.followedByCurrentUser ? "Following seller" : "Follow seller"}
                    </button>
                    <button
                      className="rounded-full bg-white px-4 py-2.5 text-[0.82rem] font-semibold text-ink sm:px-5 sm:py-3 sm:text-sm"
                      type="button"
                      onClick={() => setReviewModalOpen(true)}
                    >
                      Leave review
                    </button>
                  </>
                )}
              </div>
            </div>
            {followMessage ? (
              <div className="mt-4 text-[0.82rem] font-semibold text-white/82 sm:mt-5 sm:text-sm">{followMessage}</div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:gap-4 sm:p-6 md:grid-cols-2 lg:grid-cols-5">
          <div className="console-well p-3 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-xs sm:tracking-[0.18em]">
              Favorite games
            </p>
            <p className="mt-1.5 text-[0.95rem] font-semibold text-ink sm:mt-2 sm:text-lg">
              {seller.favoriteGames.join(", ") || "Not set"}
            </p>
          </div>
          <div className="console-well p-3 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-xs sm:tracking-[0.18em]">
              Meetup style
            </p>
            <p className="mt-1.5 text-[0.82rem] leading-6 text-steel sm:mt-2 sm:text-sm sm:leading-7">{seller.meetupPreferences}</p>
          </div>
          <div className="console-well p-3 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-xs sm:tracking-[0.18em]">
              Response time
            </p>
            <p className="mt-1.5 inline-flex items-center gap-2 text-[0.95rem] font-semibold text-ink sm:mt-2 sm:text-lg">
              <Clock3 size={16} className="text-orange" />
              {seller.responseTime}
            </p>
          </div>
          <div className="console-well p-3 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-xs sm:tracking-[0.18em]">
              Completed deals
            </p>
            <p className="mt-1.5 inline-flex items-center gap-2 text-[0.95rem] font-semibold text-ink sm:mt-2 sm:text-lg">
              <Store size={16} className="text-navy" />
              {seller.completedDeals}
            </p>
          </div>
          <div className="console-well p-3 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-xs sm:tracking-[0.18em]">
              Followers
            </p>
            <p className="mt-1.5 inline-flex items-center gap-2 text-[0.95rem] font-semibold text-ink sm:mt-2 sm:text-lg">
              <BellRing size={16} className="text-navy" />
              {followerCount}
            </p>
          </div>
          <div className="console-well p-3 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-xs sm:tracking-[0.18em]">
              Risk signals
            </p>
            <p className="mt-1.5 text-[0.95rem] font-semibold text-ink sm:mt-2 sm:text-lg">{seller.riskLabel}</p>
            <div className="mt-2.5 space-y-1 text-[0.8rem] text-steel sm:mt-3 sm:text-sm">
              <p>Account age: {seller.accountAgeLabel}</p>
              <p>Response rate: {seller.responseRate}%</p>
              <p>Moderation actions: {seller.moderationActions}</p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          {trustedSpots.length ? (
            <div className="mb-3 flex flex-wrap gap-2 sm:mb-4">
              {trustedSpots.map((spot) => (
                <span
                  key={spot.id}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(203,220,231,0.88)] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy sm:px-3 sm:text-xs sm:tracking-[0.18em]"
                >
                  <Store size={14} />
                  {spot.label}
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {seller.badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(203,220,231,0.88)] bg-[rgba(235,242,247,0.92)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink sm:px-3 sm:text-xs sm:tracking-[0.18em]"
              >
                <BadgeCheck size={14} />
                {reviewBadgeCatalog[badge]?.label || badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4 sm:space-y-5">
        <div>
          <p className="section-kicker">Storefront</p>
          <h2 className="section-title mt-2">Active listings</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {sellerListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      <section className="space-y-4 sm:space-y-5">
        <div>
          <p className="section-kicker">Buyer reviews</p>
          <h2 className="section-title mt-2">Recent feedback</h2>
        </div>
        {deleteReviewError ? (
          <p className="text-sm font-semibold text-rose-700">{deleteReviewError}</p>
        ) : null}
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          {sellerReviews.map((review) => (
            <article
              key={review.id}
              className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-soft sm:rounded-[28px] sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-[1.05rem] font-semibold tracking-[-0.03em] text-ink sm:text-xl">
                    {review.author}
                  </p>
                  <p className="mt-1 text-[0.8rem] text-steel sm:text-sm">{review.createdAt}</p>
                </div>
                <div className="flex items-center gap-3">
                  <RatingStars value={review.rating} />
                  {isAdmin ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-700 sm:px-3 sm:text-xs sm:tracking-[0.18em]"
                      type="button"
                      onClick={async () => {
                        setDeleteReviewError("");
                        const result = await deleteReview(review.id);
                        if (!result?.ok) {
                          setDeleteReviewError(result?.error || "Review could not be removed.");
                        }
                      }}
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-[0.92rem] text-steel sm:mt-4 sm:text-base">{review.comment}</p>
              {review.imageUrl ? (
                <img
                  alt={`Review from ${review.author}`}
                  className="mt-3 h-44 w-full rounded-[18px] border border-slate-200 object-cover sm:mt-4 sm:h-56 sm:rounded-[22px]"
                  src={review.imageUrl}
                />
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {isReviewModalOpen && !isOwnProfile ? (
        <ReviewModal seller={seller} onClose={() => setReviewModalOpen(false)} />
      ) : null}
    </div>
  );
}
