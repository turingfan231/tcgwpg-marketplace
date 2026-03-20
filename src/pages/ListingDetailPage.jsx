import {
  BadgeCheck,
  Camera,
  ChevronRight,
  Flag,
  MessageSquare,
  Repeat2,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
import OfferModal from "../components/modals/OfferModal";
import ReportModal from "../components/modals/ReportModal";
import CardArtwork from "../components/shared/CardArtwork";
import UserAvatar from "../components/shared/UserAvatar";
import EmptyState from "../components/ui/EmptyState";
import RatingStars from "../components/ui/RatingStars";
import { useMarketplace } from "../hooks/useMarketplace";
import { getConditionClasses, getListingTypeClasses } from "../utils/formatters";

function formatChangeLabel(change) {
  if (change.field === "price") {
    return `Price updated from ${change.from} to ${change.to}`;
  }

  if (change.field === "condition") {
    return `Condition changed from ${change.from} to ${change.to}`;
  }

  if (change.field === "quantity") {
    return `Quantity changed from ${change.from}x to ${change.to}x`;
  }

  return "Description updated";
}

function formatOfferTypeLabel(type) {
  if (type === "cash-trade") {
    return "Cash + Trade";
  }

  return type[0].toUpperCase() + type.slice(1);
}

export default function ListingDetailPage() {
  const navigate = useNavigate();
  const { listingId } = useParams();
  const {
    activeListings,
    currentUser,
    findOrCreateThread,
    formatCadPrice,
    offersByListingId,
    recordListingView,
    respondToOffer,
    reviewBadgeCatalog,
    toggleListingFeatured,
    toggleListingFlag,
    toggleListingRemoved,
    updateListingAdminNote,
  } = useMarketplace();
  const viewRecorded = useRef(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [lightboxImage, setLightboxImage] = useState("");
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [adminNoteDraft, setAdminNoteDraft] = useState("");
  const [adminFeedback, setAdminFeedback] = useState("");
  const [isSavingAdminNote, setIsSavingAdminNote] = useState(false);

  const listing = useMemo(
    () => activeListings.find((item) => item.id === listingId),
    [activeListings, listingId],
  );

  useEffect(() => {
    viewRecorded.current = false;
    setShowOfferModal(false);
    setShowReportModal(false);
    setLightboxImage("");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [listingId]);

  useEffect(() => {
    if (!listing || viewRecorded.current) {
      return;
    }

    viewRecorded.current = true;
    recordListingView(listing.id);
  }, [listing, recordListingView]);

  useEffect(() => {
    if (!listing) {
      return;
    }

    setSelectedImage(listing.primaryImage || listing.imageUrl || "");
    setAdminNoteDraft(listing.adminNotes || "");
    setAdminFeedback("");
  }, [listing]);

  const relatedListings = useMemo(() => {
    if (!listing) {
      return [];
    }

    return activeListings
      .filter(
        (candidate) =>
          candidate.id !== listing.id &&
          candidate.gameSlug === listing.gameSlug &&
          candidate.type === listing.type,
      )
      .slice(0, 4);
  }, [activeListings, listing]);

  const listingOffers = useMemo(
    () => (listing ? offersByListingId[listing.id] || [] : []),
    [listing, offersByListingId],
  );

  const sourcePriceHistory = useMemo(() => {
    if (!listing) {
      return [];
    }

    return (listing.priceHistory || []).filter(
      (item) => item && (item.sourceLabel || item.source || item.originalPriceUsd != null),
    );
  }, [listing]);

  const priceHistorySourceLabel =
    sourcePriceHistory[0]?.sourceLabel || sourcePriceHistory[0]?.source || "";

  const isOwner = currentUser && listing && currentUser.id === listing.sellerId;
  const isAdmin = currentUser?.role === "admin";

  async function handleSaveAdminNote() {
    if (!listing || !isAdmin) {
      return;
    }

    setIsSavingAdminNote(true);
    setAdminFeedback("");
    const result = await updateListingAdminNote(listing.id, adminNoteDraft);
    setIsSavingAdminNote(false);

    if (!result?.ok) {
      setAdminFeedback(result?.error || "Could not save the admin note.");
      return;
    }

    setAdminFeedback("Admin note saved.");
  }

  if (!listing) {
    return (
      <EmptyState
        description="The listing may have sold, been removed, or not exist in local storage yet."
        title="Listing Not Found"
      />
    );
  }

  return (
    <div className="space-y-10">
      <section className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <div className="space-y-5">
          <div className="rounded-[36px] bg-white p-4 shadow-soft sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(290px,380px)_minmax(0,1fr)]">
              <div className="mx-auto w-full max-w-[380px]">
                <button
                  className="block w-full"
                  type="button"
                  onClick={() =>
                    setLightboxImage(selectedImage || listing.primaryImage || listing.imageUrl)
                  }
                >
                  <CardArtwork
                    className="aspect-[63/88] w-full rounded-[30px] object-cover"
                    game={listing.game}
                    src={selectedImage || listing.primaryImage || listing.imageUrl}
                    title={listing.title}
                  />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-steel">
                      Listing photos
                    </p>
                    <p className="mt-2 text-sm leading-7 text-steel">
                      Tap any photo to zoom. Condition shots stay attached to the listing.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                    <Camera size={14} />
                    {listing.imageGallery.length} photos
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {listing.imageGallery.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      className={`overflow-hidden rounded-[22px] border transition ${
                        selectedImage === image
                          ? "border-navy ring-2 ring-navy/10"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      type="button"
                      onClick={() => setSelectedImage(image)}
                    >
                      <img
                        alt={`${listing.title} media ${index + 1}`}
                        className="aspect-[4/5] h-full w-full object-cover"
                        src={image}
                      />
                    </button>
                  ))}
                </div>

                {listing.bundleItems?.length ? (
                  <div className="rounded-[24px] border border-slate-200 bg-[#f8f5ee] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                      Bundle contents
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {listing.bundleItems.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {sourcePriceHistory.length ? (
            <div className="rounded-[36px] bg-white p-4 shadow-soft sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="section-kicker">Source Price History</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                    Recent source prices
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-steel">
                    {priceHistorySourceLabel || "Source-backed"} pricing is shown in CAD and only
                    appears when the selected autofill source exposes recent price points.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  {sourcePriceHistory.length} points
                </span>
              </div>

              <div className="mt-5 rounded-[28px] border border-slate-200 bg-[#fbf8f1] p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {sourcePriceHistory.map((point) => (
                    <div
                      key={point.id || point.createdAt}
                      className="rounded-[20px] border border-slate-200 bg-white px-4 py-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                        {point.label}
                      </p>
                      <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                        {formatCadPrice(point.price, point.currency || "CAD")}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
                    {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
                  </span>
                  {listing.marketPrice ? (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-700">
                      Market {formatCadPrice(listing.marketPrice, listing.marketPriceCurrency || "CAD")}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {sourcePriceHistory[sourcePriceHistory.length - 1]?.rangeLabel ||
                      "Recent source window"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="rounded-[36px] bg-white p-5 shadow-soft sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getListingTypeClasses(
                  listing.type,
                )}`}
              >
                {listing.type}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getConditionClasses(
                  listing.condition,
                )}`}
              >
                {listing.condition}
              </span>
              {listing.acceptsTrade ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-navy/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-navy">
                  <Repeat2 size={13} />
                  Trades accepted
                </span>
              ) : null}
              {listing.quantity > 1 ? (
                <span className="rounded-full bg-orange/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange">
                  {listing.quantity}x available
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.05em] text-ink">
              {listing.title}
            </h1>
            <p className="mt-4 text-base leading-8 text-steel">{listing.description}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[26px] bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-steel">
                  Asking price
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  {listing.previousPrice && listing.previousPrice > listing.price ? (
                    <span className="text-xl font-semibold text-slate-400 line-through">
                      {formatCadPrice(listing.previousPrice, listing.priceCurrency || "CAD")}
                    </span>
                  ) : null}
                  <span className="font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
                    {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-steel">
                  {listing.neighborhood}
                  {listing.postalCode ? ` | ${listing.postalCode}` : ""}
                </p>
              </div>
              <div className="rounded-[26px] bg-emerald-500/8 p-5">
                <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  <TrendingUp size={16} />
                  Market average
                </p>
                <p className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
                  {listing.marketPrice
                    ? formatCadPrice(listing.marketPrice, listing.marketPriceCurrency || "CAD")
                    : "Unavailable"}
                </p>
                <p className="mt-2 text-sm text-steel">
                  {sourcePriceHistory.length
                    ? `${priceHistorySourceLabel || "Source"} pricing is shown in CAD.`
                    : "Market references are shown in CAD."}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
              {[
                { label: "Views", value: listing.views },
                { label: "Offers", value: listing.offers },
                { label: "Posted", value: listing.timeAgo },
                { label: "Format", value: listing.listingFormat || "single" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[24px] border border-slate-200 px-4 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-steel">
                    {stat.label}
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
              {!isOwner ? (
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange px-5 py-4 text-sm font-semibold text-white shadow-soft sm:w-auto"
                  type="button"
                  onClick={() => setShowOfferModal(true)}
                >
                  Make offer
                </button>
              ) : null}
              {!isOwner ? (
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy px-5 py-4 text-sm font-semibold text-white shadow-soft sm:w-auto"
                  type="button"
                  onClick={async () => {
                    if (!currentUser) {
                      navigate("/auth", { state: { from: `/listing/${listing.id}` } });
                      return;
                    }

                    const result = await findOrCreateThread({
                      otherUserId: listing.seller.id,
                      listingId: listing.id,
                    });

                    if (result.ok) {
                      navigate(`/messages/${result.thread.id}`);
                    }
                  }}
                >
                  <MessageSquare size={18} />
                  Message seller
                </button>
              ) : (
                <div className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-steel sm:w-auto">
                  Your own listing
                </div>
              )}
              {!isOwner ? (
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700 sm:w-auto"
                  type="button"
                  onClick={() => setShowReportModal(true)}
                >
                  <Flag size={16} />
                  Report
                </button>
              ) : null}
            </div>
          </div>

          {isAdmin ? (
            <div className="rounded-[36px] border border-amber-200 bg-amber-50/70 p-5 shadow-soft sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="section-kicker text-amber-700">Admin Controls</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                    Listing moderation
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-steel">
                    Review listing health, leave internal notes, and take moderation actions
                    without leaving the listing.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      listing.flagged
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {listing.flagged ? "Flagged" : "Not flagged"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      listing.featured
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {listing.featured ? "Featured" : "Standard"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      listing.status === "removed"
                        ? "bg-amber-200 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {listing.status === "removed" ? "Removed" : "Live"}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <button
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${
                    listing.flagged
                      ? "border-rose-200 bg-white text-rose-700"
                      : "border-slate-200 bg-white text-steel hover:border-slate-300 hover:text-ink"
                  }`}
                  type="button"
                  onClick={() => void toggleListingFlag(listing.id)}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Safety</p>
                  <p className="mt-2 font-semibold">
                    {listing.flagged ? "Unflag listing" : "Flag listing"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-current/80">
                    Mark this listing for admin review or clear the flag state.
                  </p>
                </button>
                <button
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${
                    listing.featured
                      ? "border-emerald-200 bg-white text-emerald-700"
                      : "border-slate-200 bg-white text-steel hover:border-slate-300 hover:text-ink"
                  }`}
                  type="button"
                  onClick={() => void toggleListingFeatured(listing.id)}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Merchandising</p>
                  <p className="mt-2 font-semibold">
                    {listing.featured ? "Remove feature" : "Feature listing"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-current/80">
                    Control whether this listing appears in curated marketplace surfaces.
                  </p>
                </button>
                <button
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${
                    listing.status === "removed"
                      ? "border-emerald-200 bg-white text-emerald-700"
                      : "border-amber-200 bg-white text-amber-800"
                  }`}
                  type="button"
                  onClick={() => void toggleListingRemoved(listing.id)}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Moderation</p>
                  <p className="mt-2 font-semibold">
                    {listing.status === "removed" ? "Restore listing" : "Remove listing"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-current/80">
                    {listing.status === "removed"
                      ? "Put this listing back into the active marketplace."
                      : "Take this listing out of public browse surfaces."}
                  </p>
                </button>
                <Link
                  className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left text-steel transition hover:border-slate-300 hover:text-ink"
                  to={`/seller/${listing.seller.id}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Seller</p>
                  <p className="mt-2 font-semibold">Open seller profile</p>
                  <p className="mt-2 text-sm leading-6 text-current/80">
                    Review seller badges, ratings, and the rest of their active listings.
                  </p>
                </Link>
              </div>

              <div className="mt-5 rounded-[24px] border border-amber-200/70 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                      Internal note
                    </p>
                    <p className="mt-2 text-sm leading-7 text-steel">
                      Only admins can see this note. Use it for moderation context, seller history,
                      or follow-up reminders.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    Seller: {listing.seller.publicName || listing.seller.name}
                  </span>
                </div>
                <textarea
                  className="mt-4 min-h-[120px] w-full rounded-[20px] border border-slate-200 bg-[#fbf8f1] px-4 py-3 text-sm leading-7 text-ink outline-none transition focus:border-navy"
                  placeholder="Internal moderation note"
                  value={adminNoteDraft}
                  onChange={(event) => setAdminNoteDraft(event.target.value)}
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p
                    className={`text-sm ${
                      adminFeedback === "Admin note saved." ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {adminFeedback}
                  </p>
                  <button
                    className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSavingAdminNote}
                    type="button"
                    onClick={() => void handleSaveAdminNote()}
                  >
                    {isSavingAdminNote ? "Saving..." : "Save admin note"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <Link
            className="block rounded-[36px] bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift sm:p-6"
            to={`/seller/${listing.seller.id}`}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <UserAvatar className="h-16 w-16 text-xl font-bold" user={listing.seller} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
                      {listing.seller.publicName || listing.seller.name}
                    </h2>
                    {listing.seller.verified ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        <ShieldCheck size={14} />
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <RatingStars value={listing.seller.overallRating} />
                    <span className="text-sm text-steel">
                      {listing.seller.overallRating.toFixed(1)} rating
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-steel">
                    {listing.seller.neighborhood}
                    {listing.seller.postalCode ? ` | ${listing.seller.postalCode}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {listing.seller.badges.map((badge) => (
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
          </Link>

          {(isOwner || listingOffers.length) && (
            <div className="rounded-[36px] bg-white p-5 shadow-soft sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Offer Activity</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                    Structured offers
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {listingOffers.length} offers
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {listingOffers.length ? (
                  listingOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="rounded-[24px] border border-slate-200 bg-[#fbf8f1] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">
                            {formatOfferTypeLabel(offer.offerType)}
                            {offer.cashAmount ? ` | ${formatCadPrice(offer.cashAmount, "CAD")}` : ""}
                          </p>
                          {offer.tradeItems.length ? (
                            <p className="mt-2 text-sm text-steel">
                              Trade: {offer.tradeItems.join(", ")}
                            </p>
                          ) : null}
                          {offer.note ? (
                            <p className="mt-2 text-sm leading-7 text-steel">{offer.note}</p>
                          ) : null}
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                          {offer.status}
                        </span>
                      </div>

                      {isOwner && offer.status === "pending" ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                            type="button"
                            onClick={() => void respondToOffer(offer.id, "accept")}
                          >
                            Accept
                          </button>
                          <button
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                            type="button"
                            onClick={() => void respondToOffer(offer.id, "decline")}
                          >
                            Decline
                          </button>
                          <button
                            className="rounded-full border border-navy bg-navy/5 px-4 py-2 text-sm font-semibold text-navy"
                            type="button"
                            onClick={() =>
                              void respondToOffer(offer.id, "counter", {
                                cashAmount: offer.cashAmount
                                  ? Number(offer.cashAmount) + 10
                                  : listing.price,
                                note: "Counter from seller",
                              })
                            }
                          >
                            Counter +$10
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-steel">
                    No structured offers yet on this listing.
                  </p>
                )}
              </div>
            </div>
          )}

          {listing.editHistory?.length ? (
            <div className="rounded-[36px] bg-white p-5 shadow-soft sm:p-6">
              <p className="section-kicker">Edit History</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                Listing changes
              </h2>
              <div className="mt-5 space-y-3">
                {listing.editHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[24px] border border-slate-200 bg-[#fbf8f1] p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                      {new Date(entry.createdAt).toLocaleString("en-CA", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="mt-3 space-y-2">
                      {entry.changes.map((change, index) => (
                        <p key={`${entry.id}-${index}`} className="text-sm text-steel">
                          {formatChangeLabel(change)}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {relatedListings.length ? (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Same Game</p>
              <h2 className="section-title mt-2">More local listings</h2>
            </div>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
              to={`/market/${listing.gameSlug}`}
            >
              View more
              <ChevronRight size={15} />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {relatedListings.map((relatedListing) => (
              <ListingCard key={relatedListing.id} listing={relatedListing} />
            ))}
          </div>
        </section>
      ) : null}

      {showOfferModal ? (
        <OfferModal listing={listing} onClose={() => setShowOfferModal(false)} />
      ) : null}
      {showReportModal ? (
        <ReportModal listing={listing} onClose={() => setShowReportModal(false)} />
      ) : null}
      {lightboxImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6" onClick={() => setLightboxImage("")}>
          <img
            alt={listing.title}
            className="max-h-[92vh] max-w-[96vw] rounded-[20px] object-contain sm:max-w-[90vw] sm:rounded-[28px]"
            src={lightboxImage}
          />
        </div>
      ) : null}
    </div>
  );
}
