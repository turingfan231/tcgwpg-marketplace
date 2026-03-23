import { BadgeCheck, BellRing, Clock3, ShieldCheck, Store, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
import ReviewModal from "../components/modals/ReviewModal";
import UserAvatar from "../components/shared/UserAvatar";
import EmptyState from "../components/ui/EmptyState";
import PageSkeleton from "../components/ui/PageSkeleton";
import RatingStars from "../components/ui/RatingStars";
import { useMarketplace } from "../hooks/useMarketplace";

const bannerToneMap = {
  neutral: "from-[#102739]/96 via-[#17384c]/94 to-[#0b1d2a]/96",
  admin: "from-[#0f2637]/96 via-[#17384c]/94 to-[#091825]/96",
  pokemon: "from-[#102739]/96 via-[#17384c]/94 to-[#1b4460]/96",
  magic: "from-[#102739]/96 via-[#142f42]/94 to-[#091825]/96",
  "one-piece": "from-[#102739]/96 via-[#183f56]/94 to-[#0c2130]/96",
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
  const isOwnProfile = String(currentUser?.id || "") === String(sellerId || "");
  const isAdmin = currentUser?.role === "admin";

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
    <div className="space-y-8">
      <section className="console-panel overflow-hidden">
        <div
          className={`relative overflow-hidden bg-gradient-to-r ${bannerToneMap[seller.bannerStyle] || bannerToneMap.neutral} p-8 text-white`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(6,17,27,0.9),rgba(16,39,57,0.78)_44%,rgba(6,17,27,0.84))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.1),transparent_16%),radial-gradient(circle_at_82%_20%,rgba(255,153,0,0.16),transparent_14%),radial-gradient(circle_at_75%_78%,rgba(94,127,147,0.16),transparent_18%),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:auto,auto,auto,42px_42px,42px_42px]" />

          <div className="relative z-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-start gap-5">
                <UserAvatar
                  className="h-24 w-24 border border-white/15 bg-white/10 text-3xl"
                  imageClassName="border border-white/15"
                  textClassName="text-3xl font-bold"
                  user={seller}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-display text-4xl font-semibold tracking-[-0.05em]">
                      {seller.publicName || seller.name}
                    </h1>
                    {seller.verified ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                        <ShieldCheck size={14} />
                        Verified seller
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 max-w-3xl text-base leading-8 text-white/82">{seller.bio}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <RatingStars size={18} value={seller.overallRating} />
                    <span className="text-sm text-white/80">
                      {seller.overallRating.toFixed(1)} overall from {seller.reviewCount} reviews
                    </span>
                    <span className="text-sm text-white/80">
                      {seller.neighborhood}
                      {seller.postalCode ? ` | ${seller.postalCode}` : ""}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {isOwnProfile ? (
                  <div className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/78">
                    Reviews from other local buyers only
                  </div>
                ) : (
                  <>
                    <button
                      className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${
                        seller.followedByCurrentUser
                          ? "border border-white/20 bg-white/10 text-white"
                          : "bg-white text-ink"
                      }`}
                      type="button"
                      onClick={async () => {
                        const result = await toggleSellerFollow(seller.id);
                        setFollowMessage(
                          result?.warning ||
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
                      className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink"
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
              <div className="mt-5 text-sm font-semibold text-white/82">{followMessage}</div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 p-6 lg:grid-cols-4">
          <div className="console-well p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
              Favorite games
            </p>
            <p className="mt-2 text-lg font-semibold text-ink">
              {seller.favoriteGames.join(", ") || "Not set"}
            </p>
          </div>
          <div className="console-well p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
              Meetup style
            </p>
            <p className="mt-2 text-sm leading-7 text-steel">{seller.meetupPreferences}</p>
          </div>
          <div className="console-well p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
              Response time
            </p>
            <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-ink">
              <Clock3 size={16} className="text-orange" />
              {seller.responseTime}
            </p>
          </div>
          <div className="console-well p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
              Completed deals
            </p>
            <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-ink">
              <Store size={16} className="text-navy" />
              {seller.completedDeals}
            </p>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-wrap gap-2">
            {seller.badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(203,220,231,0.88)] bg-[rgba(235,242,247,0.92)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink"
              >
                <BadgeCheck size={14} />
                {reviewBadgeCatalog[badge]?.label || badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="section-kicker">Storefront</p>
          <h2 className="section-title mt-2">Active listings</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {sellerListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="section-kicker">Buyer reviews</p>
          <h2 className="section-title mt-2">Recent feedback</h2>
        </div>
        {deleteReviewError ? (
          <p className="text-sm font-semibold text-rose-700">{deleteReviewError}</p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {sellerReviews.map((review) => (
            <article
              key={review.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xl font-semibold tracking-[-0.03em] text-ink">
                    {review.author}
                  </p>
                  <p className="mt-1 text-sm text-steel">{review.createdAt}</p>
                </div>
                <div className="flex items-center gap-3">
                  <RatingStars value={review.rating} />
                  {isAdmin ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700"
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
              <p className="mt-4 text-base text-steel">{review.comment}</p>
              {review.imageUrl ? (
                <img
                  alt={`Review from ${review.author}`}
                  className="mt-4 h-56 w-full rounded-[22px] border border-slate-200 object-cover"
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
