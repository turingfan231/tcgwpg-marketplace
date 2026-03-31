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
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
import OfferModal from "../components/modals/OfferModal";
import ReportModal from "../components/modals/ReportModal";
import SeoHead from "../components/seo/SeoHead";
import CardArtwork from "../components/shared/CardArtwork";
import UserAvatar from "../components/shared/UserAvatar";
import EmptyState from "../components/ui/EmptyState";
import InlineSpinner from "../components/ui/InlineSpinner";
import RatingStars from "../components/ui/RatingStars";
import { approvedMeetupSpots } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";
import { fetchSourceSalesForPrinting } from "../services/cardDatabase";
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

function parseListingSourceMetadata(listing) {
  const descriptionPrefix = String(listing?.description || "").split(". Source:")[0];
  const parts = descriptionPrefix
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const setName = parts[0] || "";
  const printLabel =
    parts.find((part) => /[A-Z]{2,}\d{2}-\d+/i.test(part)) ||
    parts.find((part) => /#\s*[A-Z0-9-]+/i.test(part)) ||
    "";
  const rarity =
    parts.find((part) =>
      /(sp|secret|rare|super rare|ultra rare|common|uncommon|mythic|foil|parallel)/i.test(part),
    ) || "";
  const sourceSection = String(listing?.description || "").split("Source:")[1] || "";
  const language = /japanese/i.test(sourceSection) ? "japanese" : "english";
  const sourceProvider = sourceSection.split(".")[0]?.trim() || "";

  return {
    setName,
    printLabel,
    rarity,
    language,
    sourceProvider,
  };
}

function mapConditionToSchema(condition) {
  const conditionMap = {
    NM: "https://schema.org/NewCondition",
    LP: "https://schema.org/UsedCondition",
    MP: "https://schema.org/UsedCondition",
    HP: "https://schema.org/UsedCondition",
    DMG: "https://schema.org/DamagedCondition",
  };

  return conditionMap[condition] || "https://schema.org/UsedCondition";
}

function buildListingStructuredData(listing, pathname) {
  if (!listing) {
    return null;
  }

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://tcgwpg.com";
  const url = `${baseUrl}${pathname}`;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    image: listing.imageGallery?.length
      ? listing.imageGallery
      : listing.primaryImage || listing.imageUrl
        ? [listing.primaryImage || listing.imageUrl]
        : undefined,
    description: listing.description,
    category: listing.game,
    sku: listing.id,
    brand: {
      "@type": "Brand",
      name: "TCG WPG Marketplace",
    },
    itemCondition: mapConditionToSchema(listing.condition),
    offers: {
      "@type": "Offer",
      priceCurrency: listing.priceCurrency || "CAD",
      price: Number(listing.price || 0),
      availability:
        listing.status === "sold"
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
      url,
      seller: {
        "@type": listing.seller?.verified ? "Organization" : "Person",
        name: listing.seller?.publicName || listing.seller?.name || "Marketplace seller",
      },
    },
  };
}

export default function ListingDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [sourceSales, setSourceSales] = useState([]);
  const [sourceSalesLoaded, setSourceSalesLoaded] = useState(false);
  const [loadingSourceSales, setLoadingSourceSales] = useState(false);
  const [sourceSalesError, setSourceSalesError] = useState("");

  const listing = useMemo(
    () => activeListings.find((item) => item.id === listingId),
    [activeListings, listingId],
  );

  useEffect(() => {
    viewRecorded.current = false;
    setShowOfferModal(false);
    setShowReportModal(false);
    setLightboxImage("");
    setSourceSales([]);
    setSourceSalesLoaded(false);
    setLoadingSourceSales(false);
    setSourceSalesError("");

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

  const storedSourceSales = useMemo(() => {
    if (!listing) {
      return [];
    }

    return (listing.priceHistory || []).filter(
      (item) =>
        item &&
        (item.sourceLabel || item.source) &&
        item.price != null &&
        (item.title || item.sourceUrl),
    );
  }, [listing]);

  const visibleSourceSales = sourceSalesLoaded ? sourceSales : [];
  const sourceMetadata = useMemo(() => parseListingSourceMetadata(listing), [listing]);
  const recentSalesSourceLabel =
    visibleSourceSales[0]?.sourceLabel ||
    visibleSourceSales[0]?.source ||
    storedSourceSales[0]?.sourceLabel ||
    storedSourceSales[0]?.source ||
    "";
  const canLookupSourceSales = Boolean(
    storedSourceSales.length ||
      sourceMetadata.sourceProvider ||
      sourceMetadata.printLabel ||
      sourceMetadata.setName,
  );

  const isOwner = currentUser && listing && currentUser.id === listing.sellerId;
  const isAdmin = currentUser?.role === "admin";
  const trustedMeetupSpots = approvedMeetupSpots.filter((spot) =>
    Array.isArray(listing?.seller?.trustedMeetupSpots)
      ? listing.seller.trustedMeetupSpots.includes(spot.id)
      : false,
  );
  const listingStructuredData = useMemo(
    () => buildListingStructuredData(listing, location.pathname),
    [listing, location.pathname],
  );

  async function handleMessageSeller() {
    if (!listing || !currentUser) {
      navigate("/auth", { state: { from: `/listing/${listing?.id || listingId}` } });
      return;
    }

    const result = await findOrCreateThread({
      otherUserId: listing.seller.id,
      listingId: listing.id,
    });

    if (result?.ok && result.thread?.id) {
      navigate("/messages", {
        state: {
          activeThreadId: result.thread.id,
        },
      });
    }
  }

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

  async function handleLoadSourceSales() {
    if (!listing || loadingSourceSales) {
      return;
    }

    if (storedSourceSales.length) {
      setSourceSales(storedSourceSales);
      setSourceSalesLoaded(true);
      setSourceSalesError("");
      return;
    }

    setLoadingSourceSales(true);
    setSourceSalesError("");

    try {
      const salesResult = await fetchSourceSalesForPrinting({
        game: listing.game,
        language: sourceMetadata.language,
        title: listing.title,
        setName: sourceMetadata.setName,
        printLabel: sourceMetadata.printLabel,
        rarity: sourceMetadata.rarity,
      });
      const recentSales = salesResult?.result?.priceHistory || [];
      setSourceSales(recentSales);
      setSourceSalesLoaded(true);
      if (!recentSales.length) {
        setSourceSalesError("No recent solds were found for this printing.");
      }
    } catch (error) {
      setSourceSales([]);
      setSourceSalesLoaded(true);
      setSourceSalesError(error.message || "Could not load recent solds.");
    } finally {
      setLoadingSourceSales(false);
    }
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
    <>
      <SeoHead
        canonicalPath={location.pathname}
        description={listing.description || `View ${listing.title} on TCG WPG Marketplace.`}
        image={listing.primaryImage || listing.imageUrl}
        jsonLd={listingStructuredData}
        title={listing.title}
        type="product"
      />
      <main className="space-y-4 pb-24 sm:space-y-7 sm:pb-0">
      <section className="grid gap-4 xl:grid-cols-[1.03fr_0.97fr] sm:gap-5">
        <div className="space-y-3.5 sm:space-y-4">
          <div className="console-shell p-3 sm:p-4.5">
            <div className="grid gap-3.5 lg:grid-cols-[minmax(270px,360px)_minmax(0,1fr)] sm:gap-4">
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

              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-sm sm:tracking-[0.18em]">
                      Listing photos
                    </p>
                    <p className="mt-1.5 text-[0.78rem] leading-5 text-steel sm:mt-2 sm:text-sm sm:leading-7">
                      Tap any photo to zoom. Condition shots stay attached to the listing.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700 sm:px-3 sm:text-xs sm:tracking-[0.18em]">
                    <Camera size={14} />
                    <span className="sm:hidden">{listing.imageGallery.length}</span>
                    <span className="hidden sm:inline">{listing.imageGallery.length} photos</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
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
                  <div className="rounded-[16px] border border-slate-200 bg-[var(--surface-alt)] p-3 sm:rounded-[18px] sm:p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-xs sm:tracking-[0.18em]">
                      Bundle contents
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                      {listing.bundleItems.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-[var(--surface-solid)] px-2.5 py-1 text-[0.78rem] font-semibold text-slate-700 sm:px-3 sm:text-sm"
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

          <div className="console-panel p-3 sm:p-4.5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="section-kicker">Recent Source Sales</p>
                <h2 className="mt-2 font-display text-[1.55rem] font-semibold tracking-[-0.04em] text-ink sm:text-3xl">
                  Last 3 solds
                </h2>
                <p className="mt-2.5 text-[0.82rem] leading-6 text-steel sm:mt-3 sm:text-sm sm:leading-7">
                  Load recent sold comps on demand from the source match for this printing. Results
                  are shown in CAD and only appear when the source exposes recent sale data.
                </p>
                {sourceMetadata.sourceProvider ? (
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-xs sm:tracking-[0.18em]">
                    Listing source: {sourceMetadata.sourceProvider}
                  </p>
                ) : null}
              </div>
              <button
                className="rounded-full bg-navy px-4 py-2.5 text-[0.82rem] font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:py-3 sm:text-sm"
                disabled={loadingSourceSales || !canLookupSourceSales}
                type="button"
                onClick={() => void handleLoadSourceSales()}
              >
                {loadingSourceSales ? (
                  <span className="inline-flex items-center gap-2">
                    <InlineSpinner size={14} />
                    Loading solds
                  </span>
                ) : visibleSourceSales.length ? (
                  "Refresh solds"
                ) : (
                  "Show last solds"
                )}
              </button>
            </div>

            {!canLookupSourceSales ? (
              <p className="mt-5 rounded-[20px] border border-slate-200 bg-[var(--surface-alt)] px-4 py-3 text-sm text-steel">
                Last solds are only available for listings that were autofilled from a supported
                source.
              </p>
            ) : null}

            {sourceSalesError && !visibleSourceSales.length ? (
              <p className="mt-5 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {sourceSalesError}
              </p>
            ) : null}

            {visibleSourceSales.length ? (
              <div className="mt-5 rounded-[28px] border border-[rgba(203,220,231,0.92)] bg-[linear-gradient(180deg,rgba(250,253,255,0.94),rgba(233,241,246,0.88))] p-5">
                <div className="mt-5 space-y-3">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm leading-7 text-steel">
                    {recentSalesSourceLabel || "Source-backed"} sold comps are shown in CAD.
                  </p>
                  <span className="rounded-full bg-navy/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-navy">
                    {visibleSourceSales.length} sales
                  </span>
                </div>
                {visibleSourceSales.map((sale) => {
                  const Wrapper = sale.sourceUrl ? "a" : "div";
                  return (
                    <Wrapper
                      key={sale.id || sale.createdAt}
                      {...(sale.sourceUrl
                        ? {
                            href: sale.sourceUrl,
                            rel: "noreferrer",
                            target: "_blank",
                          }
                        : {})}
                      className={`block rounded-[24px] border border-slate-200 bg-[var(--surface-alt)] p-4 transition ${
                        sale.sourceUrl ? "hover:border-slate-300 hover:bg-[var(--surface-solid)]" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                              Sold {sale.label}
                            </p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                sale.conditionType === "graded"
                                  ? "bg-orange/10 text-orange"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {sale.conditionLabel || "Raw"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-ink">
                            {sale.title || "Recent sold listing"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                            {formatCadPrice(sale.price, sale.currency || "CAD")}
                          </p>
                          {sale.sourceUrl ? (
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-navy">
                              Open sold listing
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </Wrapper>
                  );
                })}
              </div>
            </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3.5 sm:space-y-4">
          <div className="console-shell p-3.5 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:px-3 sm:text-[11px] sm:tracking-[0.18em] ${getListingTypeClasses(
                  listing.type,
                )}`}
              >
                {listing.type}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:px-3 sm:text-[11px] sm:tracking-[0.18em] ${getConditionClasses(
                  listing.condition,
                )}`}
              >
                {listing.condition}
              </span>
              {listing.acceptsTrade ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-navy/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy sm:px-3 sm:text-[11px] sm:tracking-[0.18em]">
                  <Repeat2 size={13} />
                  <span className="sm:hidden">Trades</span>
                  <span className="hidden sm:inline">Trades accepted</span>
                </span>
              ) : null}
              {listing.quantity > 1 ? (
                <span className="rounded-full bg-orange/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange sm:px-3 sm:text-[11px] sm:tracking-[0.18em]">
                  {listing.quantity}x available
                </span>
              ) : null}
            </div>

            <h1 className="mt-2.5 font-display text-[1.55rem] font-semibold tracking-[-0.05em] text-ink sm:mt-4 sm:text-4xl">
              {listing.title}
            </h1>
            <p className="mt-2 text-[0.84rem] leading-5 text-steel sm:mt-4 sm:text-base sm:leading-8">{listing.description}</p>

            <div className="mt-3 grid gap-2.5 sm:mt-4 sm:gap-3 sm:grid-cols-2">
              <div className="rounded-[14px] bg-slate-50 p-3 sm:rounded-[16px] sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700 sm:text-sm sm:tracking-[0.2em]">
                  Asking price
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-2 sm:mt-3 sm:gap-3">
                  {listing.previousPrice && listing.previousPrice > listing.price ? (
                    <span className="text-[1rem] font-semibold text-slate-400 line-through sm:text-xl">
                      {formatCadPrice(listing.previousPrice, listing.priceCurrency || "CAD")}
                    </span>
                  ) : null}
                  <span className="font-display text-[1.55rem] font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
                    {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
                  </span>
                </div>
                <p className="mt-1.5 text-[0.78rem] text-slate-700 sm:mt-2 sm:text-sm">
                  {listing.neighborhood}
                  {listing.postalCode ? ` | ${listing.postalCode}` : ""}
                </p>
              </div>
              <div className="rounded-[14px] bg-navy/8 p-3 sm:rounded-[16px] sm:p-4">
                <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy sm:text-sm sm:tracking-[0.2em]">
                  <TrendingUp size={16} />
                  Market average
                </p>
                <p className="mt-2 font-display text-[1.55rem] font-semibold tracking-[-0.04em] text-ink sm:mt-3 sm:text-4xl">
                  {listing.marketPrice
                    ? formatCadPrice(listing.marketPrice, listing.marketPriceCurrency || "CAD")
                    : "Unavailable"}
                </p>
                <p className="mt-1.5 text-[0.78rem] text-steel sm:mt-2 sm:text-sm">
                  {visibleSourceSales.length || storedSourceSales.length
                    ? `${recentSalesSourceLabel || "Source"} pricing is shown in CAD.`
                    : "Market references are shown in CAD."}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-2.5 sm:grid-cols-4">
              {[
                { label: "Views", value: listing.views },
                { label: "Offers", value: listing.offers },
                { label: "Posted", value: listing.timeAgo },
                { label: "Format", value: listing.listingFormat || "single" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[14px] border border-slate-200 px-3 py-2.5 sm:rounded-[16px] sm:px-3.5 sm:py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-steel sm:text-sm sm:tracking-[0.2em]">
                    {stat.label}
                  </p>
                  <p className="mt-1 font-display text-[1.02rem] font-semibold tracking-[-0.03em] text-ink sm:mt-2 sm:text-2xl">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:flex sm:flex-wrap sm:gap-2.5">
              {!isOwner ? (
                <button
                  aria-label="Make offer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange px-3 py-2.5 text-[0.8rem] font-semibold text-white shadow-soft sm:w-auto sm:px-5 sm:py-4 sm:text-sm"
                  type="button"
                  onClick={() => setShowOfferModal(true)}
                >
                  <TrendingUp size={16} className="sm:hidden" />
                  <span className="sm:hidden">Offer</span>
                  <span className="hidden sm:inline">Make offer</span>
                </button>
              ) : null}
                {!isOwner ? (
                  <button
                    aria-label="Message seller"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy px-3 py-2.5 text-[0.8rem] font-semibold text-white shadow-soft sm:w-auto sm:px-5 sm:py-4 sm:text-sm"
                    type="button"
                    onClick={() => void handleMessageSeller()}
                  >
                    <MessageSquare size={18} />
                    <span className="sm:hidden">Chat</span>
                    <span className="hidden sm:inline">Message seller</span>
                  </button>
              ) : (
                <div className="col-span-2 inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-[0.8rem] font-semibold text-steel sm:w-auto sm:px-5 sm:py-4 sm:text-sm">
                  <span className="sm:hidden">Your listing</span>
                  <span className="hidden sm:inline">Your own listing</span>
                </div>
              )}
              {!isOwner ? (
                <button
                  aria-label="Report listing"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2.5 text-[0.8rem] font-semibold text-rose-700 sm:w-auto sm:px-5 sm:py-4 sm:text-sm"
                  type="button"
                  onClick={() => setShowReportModal(true)}
                >
                  <Flag size={16} />
                  <span className="sm:hidden">Flag</span>
                  <span className="hidden sm:inline">Report</span>
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
                        ? "bg-navy/10 text-navy"
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
                      ? "border-rose-200 bg-[var(--surface-solid)] text-rose-700"
                      : "border-slate-200 bg-[var(--surface-solid)] text-steel hover:border-slate-300 hover:text-ink"
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
                      ? "border-navy/20 bg-[var(--surface-solid)] text-navy"
                      : "border-slate-200 bg-[var(--surface-solid)] text-steel hover:border-slate-300 hover:text-ink"
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
                      ? "border-navy/20 bg-[var(--surface-solid)] text-navy"
                      : "border-amber-200 bg-[var(--surface-solid)] text-amber-800"
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
                  className="rounded-[22px] border border-slate-200 bg-[var(--surface-solid)] px-4 py-4 text-left text-steel transition hover:border-slate-300 hover:text-ink"
                  to={`/seller/${listing.seller.id}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">Seller</p>
                  <p className="mt-2 font-semibold">Open seller profile</p>
                  <p className="mt-2 text-sm leading-6 text-current/80">
                    Review seller badges, ratings, and the rest of their active listings.
                  </p>
                </Link>
              </div>

              <div className="mt-5 rounded-[24px] border border-amber-200/70 bg-[var(--surface-solid)] p-4">
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
                  className="mt-4 min-h-[120px] w-full rounded-[20px] border border-slate-200 bg-[var(--surface-alt)] px-4 py-3 text-sm leading-7 text-ink outline-none transition focus:border-navy"
                  placeholder="Internal moderation note"
                  value={adminNoteDraft}
                  onChange={(event) => setAdminNoteDraft(event.target.value)}
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p
                    className={`text-sm ${
                      adminFeedback === "Admin note saved." ? "text-navy" : "text-rose-700"
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
            className="console-panel block p-5 transition hover:-translate-y-1 hover:shadow-lift sm:p-6"
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
                      <span className="inline-flex items-center gap-2 rounded-full bg-orange/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange">
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
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      Account age {listing.seller.accountAgeLabel}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      Response {listing.seller.responseRate}%
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      {listing.seller.moderationActions} moderation action{listing.seller.moderationActions === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      {listing.seller.riskLabel}
                    </span>
                  </div>
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
            {trustedMeetupSpots.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {trustedMeetupSpots.map((spot) => (
                  <span
                    key={spot.id}
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(203,220,231,0.88)] bg-[var(--surface-solid)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-navy"
                  >
                    <ShieldCheck size={13} />
                    {spot.label}
                  </span>
                ))}
              </div>
            ) : null}
          </Link>

          {(isOwner || listingOffers.length) && (
            <div className="console-panel p-5 sm:p-6">
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
                      className="rounded-[24px] border border-slate-200 bg-[var(--surface-alt)] p-4"
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
                        <span className="rounded-full bg-[var(--surface-solid)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                          {offer.status}
                        </span>
                      </div>

                      {isOwner && offer.status === "pending" ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            className="rounded-full bg-orange px-4 py-2 text-sm font-semibold text-white"
                            type="button"
                            onClick={() => void respondToOffer(offer.id, "accept")}
                          >
                            Accept
                          </button>
                          <button
                            className="rounded-full border border-slate-200 bg-[var(--surface-solid)] px-4 py-2 text-sm font-semibold text-steel"
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
            <div className="console-panel p-5 sm:p-6">
              <p className="section-kicker">Edit History</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                Listing changes
              </h2>
              <div className="mt-5 space-y-3">
                {listing.editHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[24px] border border-slate-200 bg-[var(--surface-alt)] p-4"
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
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[var(--surface-solid)] px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
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

      {!isOwner ? (
        <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] z-30 flex items-center gap-2 rounded-[18px] border border-[var(--line)] bg-[var(--surface-solid)] p-2 shadow-lift sm:hidden">
          <button
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--surface-hover)] px-3 py-3 text-sm font-semibold text-ink"
            type="button"
            onClick={() => void handleMessageSeller()}
          >
            <MessageSquare size={16} />
            Message
          </button>
          <button
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-orange px-3 py-3 text-sm font-semibold text-white"
            type="button"
            onClick={() => setShowOfferModal(true)}
          >
            <TrendingUp size={16} />
            Make offer
          </button>
        </div>
      ) : null}
      </main>

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
    </>
  );
}



