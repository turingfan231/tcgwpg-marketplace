import { BadgeCheck, Clock3, ShieldCheck, Store, Trash2 } from "lucide-react";
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
  neutral: "from-[#1e3f4f] via-[#214a5f] to-[#102734]",
  admin: "from-[#17394a] via-[#1a5b78] to-[#102734]",
  pokemon: "from-[#17495e] via-[#1a5b78] to-[#ff9900]",
  magic: "from-[#132e3d] via-[#1a5b78] to-[#6e7b85]",
  "one-piece": "from-[#17394a] via-[#245f7d] to-[#5db4e5]",
};

export default function SellerProfilePage() {
  const { sellerId } = useParams();
  const { activeListings, currentUser, deleteReview, loading, reviewBadgeCatalog, reviews, sellerMap } =
    useMarketplace();
  const [isReviewModalOpen, setReviewModalOpen] = useState(false);
  const [deleteReviewError, setDeleteReviewError] = useState("");

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
      <section className="overflow-hidden rounded-[34px] bg-white shadow-soft">
        <div
          className={`bg-gradient-to-r ${bannerToneMap[seller.bannerStyle] || bannerToneMap.neutral} p-8 text-white`}
        >
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

            {isOwnProfile ? (
              <div className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/78">
                Reviews from other local buyers only
              </div>
            ) : (
              <button
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink"
                type="button"
                onClick={() => setReviewModalOpen(true)}
              >
                Leave review
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 p-6 lg:grid-cols-4">
          <div className="rounded-[24px] bg-[#f8f5ee] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
              Favorite games
            </p>
            <p className="mt-2 text-lg font-semibold text-ink">
              {seller.favoriteGames.join(", ") || "Not set"}
            </p>
          </div>
          <div className="rounded-[24px] bg-[#f8f5ee] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
              Meetup style
            </p>
            <p className="mt-2 text-sm leading-7 text-steel">{seller.meetupPreferences}</p>
          </div>
          <div className="rounded-[24px] bg-[#f8f5ee] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
              Response time
            </p>
            <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-ink">
              <Clock3 size={16} className="text-orange" />
              {seller.responseTime}
            </p>
          </div>
          <div className="rounded-[24px] bg-[#f8f5ee] p-5">
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
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700"
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
