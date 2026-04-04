import { BarChart3, ChevronRight, Eye, FileText, Package, Plus, RefreshCcw, Tag, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ProfileWorkspaceNav from "../components/account/ProfileWorkspaceNav";
import SeoHead from "../components/seo/SeoHead";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import { compactTimeLabel, formatPrice, listingArtwork } from "../mobile/helpers";
import {
  BottomSheet,
  EmptyBlock,
  MobileScreen,
  PrimaryButton,
  ScreenHeader,
  ScreenSection,
  SecondaryButton,
  TextArea,
  TextField,
} from "../mobile/primitives";
import { formatNumber } from "../utils/formatters";

function DashboardStat({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-[18px] border p-3 lg:rounded-[22px] lg:p-4" style={{ background: m.surface, borderColor: m.border }}>
      <Icon size={15} style={{ color: tone }} />
      <p className="mt-3 text-[22px] text-white lg:text-[28px]" style={{ fontWeight: 700, lineHeight: 1 }}>
        {value}
      </p>
      <p className="mt-1 text-[10px] lg:text-[11px]" style={{ color: m.textSecondary, fontWeight: 600 }}>
        {label}
      </p>
    </div>
  );
}

function SellerListingCard({ formatCadPrice, listing, onBump, onEdit, onSold }) {
  return (
    <div className="rounded-[20px] border p-3 lg:rounded-[24px] lg:p-4" style={{ background: m.surface, borderColor: m.border, boxShadow: m.shadowPanel }}>
      <div className="flex gap-3 lg:items-center">
        <Link className="h-20 w-16 shrink-0 overflow-hidden rounded-[14px] lg:h-24 lg:w-20 lg:rounded-[16px]" to={`/listing/${listing.id}`}>
          <img alt={listing.title} className="h-full w-full object-cover" src={listingArtwork(listing)} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] text-white lg:text-[15px]" style={{ fontWeight: 700 }}>
                {listing.title}
              </p>
              <p className="mt-1 text-[10px] lg:text-[11px]" style={{ color: m.textSecondary }}>
                {[listing.game, listing.condition, listing.neighborhood].filter(Boolean).join(" / ")}
              </p>
            </div>
            <span className="text-[15px] text-white lg:text-[18px]" style={{ fontWeight: 700 }}>
              {formatCadPrice(listing.priceCad ?? listing.price, listing.priceCurrency || "CAD")}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-[9px] lg:text-[10px]" style={{ color: m.textTertiary, fontWeight: 600 }}>
            <span>{formatNumber(listing.views || 0)} views</span>
            <span>{formatNumber(listing.offers || 0)} offers</span>
            <span>{compactTimeLabel(listing.updatedAt || listing.createdAt || listing.timeAgo)}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 lg:max-w-[420px]">
            <SecondaryButton className="h-9 text-[10px] lg:h-10 lg:text-[11px]" onClick={() => onEdit(listing)}>
              Edit
            </SecondaryButton>
            <SecondaryButton className="h-9 text-[10px] lg:h-10 lg:text-[11px]" onClick={() => onBump(listing.id)}>
              <RefreshCcw size={12} />
              Bump
            </SecondaryButton>
            <PrimaryButton className="h-9 text-[10px] lg:h-10 lg:text-[11px]" onClick={() => onSold(listing.id)}>
              Mark Sold
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function OfferRow({ formatCadPrice, offer, onAccept, onDecline, onCounter, processing }) {
  return (
    <div className="rounded-[18px] border p-3 lg:rounded-[22px] lg:p-4" style={{ background: m.surface, borderColor: m.border }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] text-white" style={{ fontWeight: 700 }}>
            {offer.listing?.title || "Listing"}
          </p>
          <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
            From {offer.buyer?.publicName || offer.buyer?.name || "Buyer"} / {offer.offerType}
          </p>
        </div>
        <span className="text-[15px] text-white" style={{ fontWeight: 700 }}>
          {offer.offerType === "trade" ? "Trade" : formatCadPrice(offer.cashAmount || 0, "CAD")}
        </span>
      </div>
      {offer.note ? (
        <p className="mt-2 text-[11px]" style={{ color: m.textSecondary, lineHeight: 1.45 }}>
          {offer.note}
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <SecondaryButton className="h-9 text-[10px] lg:h-10 lg:text-[11px]" disabled={processing} onClick={() => onDecline(offer)}>
          Decline
        </SecondaryButton>
        <SecondaryButton className="h-9 text-[10px] lg:h-10 lg:text-[11px]" disabled={processing} onClick={() => onCounter(offer)}>
          Counter
        </SecondaryButton>
        <PrimaryButton className="h-9 text-[10px] lg:h-10 lg:text-[11px]" disabled={processing} onClick={() => onAccept(offer)}>
          Accept
        </PrimaryButton>
      </div>
    </div>
  );
}

function DraftCard({ draft, isActive, onDelete, onOpen, onSetActive }) {
  return (
    <div className="rounded-[18px] border p-3 lg:rounded-[22px] lg:p-4" style={{ background: isActive ? "rgba(239,68,68,0.08)" : m.surface, borderColor: isActive ? "rgba(239,68,68,0.12)" : m.border }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] text-white" style={{ fontWeight: 700 }}>
            {draft.title || draft.name || "Untitled draft"}
          </p>
          <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
            {[draft.game, draft.neighborhood].filter(Boolean).join(" / ") || "Needs more details"}
          </p>
        </div>
        {isActive ? (
          <span className="rounded-full px-2 py-[5px] text-[9px]" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", fontWeight: 700 }}>
            Active
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[11px]" style={{ color: m.textSecondary, lineHeight: 1.45 }}>
        {draft.description || "Draft saved in progress."}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <SecondaryButton className="h-9 text-[10px] lg:h-10 lg:text-[11px]" onClick={() => onOpen(draft.id)}>
          Open
        </SecondaryButton>
        <SecondaryButton className="h-9 text-[10px] lg:h-10 lg:text-[11px]" onClick={() => onSetActive(draft.id)}>
          Set Active
        </SecondaryButton>
        <SecondaryButton className="h-9 text-[10px] lg:h-10 lg:text-[11px]" onClick={() => onDelete(draft.id)}>
          Delete
        </SecondaryButton>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    bumpListing,
    clearListingDraft,
    currentUser,
    currentUserDrafts,
    currentUserListings,
    deleteListing,
    editListing,
    formatCadPrice,
    listingDraft,
    markListingSold,
    offersForCurrentUser,
    respondToOffer,
    selectListingDraft,
  } = useMarketplace();

  const [editingListing, setEditingListing] = useState(null);
  const [editForm, setEditForm] = useState({ price: "", condition: "NM", quantity: "1", description: "" });
  const [counterOffer, setCounterOffer] = useState(null);
  const [counterForm, setCounterForm] = useState({ offerType: "cash", cashAmount: "", tradeItems: "", note: "" });
  const [busyId, setBusyId] = useState("");
  const [offerError, setOfferError] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [resolvedOfferIds, setResolvedOfferIds] = useState([]);
  const draftsRef = useRef(null);

  const activeListings = useMemo(
    () => currentUserListings.filter((listing) => listing.status !== "sold"),
    [currentUserListings],
  );
  const soldListings = useMemo(
    () => currentUserListings.filter((listing) => listing.status === "sold"),
    [currentUserListings],
  );
  const sellerOffers = useMemo(
    () =>
      offersForCurrentUser
        .filter((offer) => String(offer.sellerId) === String(currentUser?.id) && (offer.status === "pending" || offer.status === "countered"))
        .filter((offer) => !resolvedOfferIds.includes(offer.id))
        .slice(0, 4),
    [currentUser?.id, offersForCurrentUser, resolvedOfferIds],
  );
  const totalViews = useMemo(
    () => currentUserListings.reduce((sum, listing) => sum + Number(listing.views || 0), 0),
    [currentUserListings],
  );

  useEffect(() => {
    if (location.hash !== "#drafts" || !draftsRef.current) {
      return;
    }
    requestAnimationFrame(() => {
      draftsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.hash, currentUserDrafts.length]);

  function startEdit(listing) {
    setEditingListing(listing);
    setEditForm({
      price: String(listing.priceCad ?? listing.price ?? ""),
      condition: listing.condition || "NM",
      quantity: String(listing.quantity || 1),
      description: listing.description || "",
    });
  }

  async function saveEdit() {
    if (!editingListing) {
      return;
    }
    setBusyId(editingListing.id);
    await editListing(editingListing.id, editForm);
    setBusyId("");
    setEditingListing(null);
  }

  async function handleDeleteEditing() {
    if (!editingListing) {
      return;
    }
    setBusyId(editingListing.id);
    await deleteListing(editingListing.id);
    setBusyId("");
    setEditingListing(null);
  }

  function startCounter(offer) {
    setOfferError("");
    setOfferMessage("");
    setCounterOffer(offer);
    setCounterForm({
      offerType: offer.offerType || "cash",
      cashAmount: String(offer.cashAmount || ""),
      tradeItems: Array.isArray(offer.tradeItems) ? offer.tradeItems.join("\n") : "",
      note: offer.note || "",
    });
  }

  async function handleOfferAction(offer, action, payload = undefined) {
    setOfferError("");
    setOfferMessage("");
    setBusyId(offer.id);
    const result = await respondToOffer(offer.id, action, payload);
    setBusyId("");
    if (!result?.ok) {
      setOfferError(result?.error || "Offer action failed.");
      return;
    }
    if (action === "counter") {
      setCounterOffer(null);
      setOfferMessage("Counter offer sent.");
      return;
    }
    setResolvedOfferIds((current) => [...new Set([...current, offer.id])]);
    setOfferMessage(action === "accept" ? "Offer accepted." : "Offer declined.");
  }

  function openDraft(draftId) {
    selectListingDraft(draftId);
    navigate("/sell");
  }

  return (
    <MobileScreen>
      <SeoHead canonicalPath="/dashboard" description="Manage active listings, incoming offers, drafts, and seller performance." title="Seller Dashboard" />
      <ScreenHeader
        className="lg:hidden"
        subtitle={currentUser?.publicName || currentUser?.name || "Seller workspace"}
        title="Dashboard"
        right={
          <button
            className="inline-flex h-10 items-center gap-2 rounded-[14px] px-3 text-[11px] text-white"
            style={{ background: m.redGradient, fontWeight: 700, boxShadow: "0 10px 24px rgba(185,28,28,0.22)" }}
            type="button"
            onClick={() => navigate("/sell")}
          >
            <Plus size={14} />
            New Listing
          </button>
        }
      />

      <div className="lg:hidden">
        <ProfileWorkspaceNav sellerId={currentUser?.id} />
      </div>

      <div className="hidden lg:block lg:px-6 lg:pt-8">
        <div className="mx-auto w-full max-w-[1400px] rounded-[28px] border p-6" style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-start justify-between gap-8">
            <div>
              <p className="text-[30px] text-white" style={{ fontWeight: 800, lineHeight: 1.05 }}>Seller Dashboard</p>
              <p className="mt-2 max-w-[42rem] text-[13px]" style={{ color: "#7a7a82", lineHeight: 1.6 }}>
                Monitor live listings, handle buyer offers, and manage drafts from a desktop-first seller workspace.
              </p>
            </div>
            <PrimaryButton className="!h-[46px] !rounded-[16px] !px-5" onClick={() => navigate("/sell")}>
              <Plus size={14} />
              New Listing
            </PrimaryButton>
          </div>
        </div>
      </div>

      <ScreenSection className="pt-3 lg:px-6 lg:pt-6">
        <div className="mx-auto grid w-full grid-cols-2 gap-2.5 lg:max-w-[1400px] lg:grid-cols-4 lg:gap-4">
          <DashboardStat icon={Package} label="Active" tone={m.blue} value={activeListings.length} />
          <DashboardStat icon={Tag} label="Pending offers" tone={m.warning} value={sellerOffers.length} />
          <DashboardStat icon={Eye} label="Views" tone={m.success} value={formatNumber(totalViews)} />
          <DashboardStat icon={BarChart3} label="Drafts" tone="#fca5a5" value={currentUserDrafts.length} />
        </div>
      </ScreenSection>

      <div className="lg:px-6 lg:pb-8">
      <div className="mx-auto lg:grid lg:max-w-[1400px] lg:grid-cols-[minmax(0,1.45fr)_390px] lg:gap-8">
        <div className="min-w-0">
          <ScreenSection className="pt-5 lg:px-0">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                Active listings
              </p>
              <span className="text-[10px]" style={{ color: m.textTertiary, fontWeight: 600 }}>
                {activeListings.length} live
              </span>
            </div>
            {activeListings.length ? (
              <div className="flex flex-col gap-2.5">
                {activeListings.map((listing) => (
                  <SellerListingCard
                    key={listing.id}
                    formatCadPrice={formatCadPrice}
                    listing={listing}
                    onBump={bumpListing}
                    onEdit={startEdit}
                    onSold={markListingSold}
                  />
                ))}
              </div>
            ) : (
              <EmptyBlock
                description="Post your first card to start getting views, offers, and messages."
                title="No active listings"
                action={<PrimaryButton onClick={() => navigate("/sell")}>Create listing</PrimaryButton>}
              />
            )}
          </ScreenSection>

          {soldListings.length ? (
            <ScreenSection className="pt-5 lg:px-0">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                  Sold
                </p>
                <span className="text-[10px]" style={{ color: m.textTertiary, fontWeight: 600 }}>
                  {soldListings.length} archived
                </span>
              </div>
              <div className="grid gap-2.5 lg:grid-cols-2">
                {soldListings.slice(0, 4).map((listing) => (
                  <div key={listing.id} className="rounded-[18px] border p-3" style={{ background: m.surface, borderColor: m.border }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] text-white" style={{ fontWeight: 700 }}>
                          {listing.title}
                        </p>
                        <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                          Sold {compactTimeLabel(listing.updatedAt || listing.timeAgo)}
                        </p>
                      </div>
                      <span className="text-[14px] text-white" style={{ fontWeight: 700 }}>
                        {formatPrice(listing.priceCad ?? listing.price, listing.priceCurrency || "CAD")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScreenSection>
          ) : null}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <ScreenSection className="pt-5 lg:px-0 lg:pt-0">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                Incoming offers
              </p>
              <Link className="inline-flex items-center gap-1 text-[10px]" style={{ color: m.textSecondary, fontWeight: 600 }} to="/inbox">
                Open inbox
                <ChevronRight size={12} />
              </Link>
            </div>
            {offerError ? (
              <div className="mb-2 rounded-[14px] px-3 py-2 text-[11px]" style={{ background: "rgba(248,113,113,0.08)", color: m.danger, fontWeight: 600 }}>
                {offerError}
              </div>
            ) : null}
            {offerMessage ? (
              <div className="mb-2 rounded-[14px] px-3 py-2 text-[11px]" style={{ background: "rgba(52,211,153,0.08)", color: m.success, fontWeight: 600 }}>
                {offerMessage}
              </div>
            ) : null}
            {sellerOffers.length ? (
              <div className="flex flex-col gap-2.5">
                {sellerOffers.map((offer) => (
                  <OfferRow
                    key={offer.id}
                    formatCadPrice={formatCadPrice}
                    offer={offer}
                    processing={busyId === offer.id}
                    onAccept={(target) => handleOfferAction(target, "accept")}
                    onCounter={startCounter}
                    onDecline={(target) => handleOfferAction(target, "decline")}
                  />
                ))}
              </div>
            ) : (
              <EmptyBlock description="New offers will surface here as buyers message and negotiate." title="No active offers" />
            )}
          </ScreenSection>

          {currentUserDrafts.length ? (
            <ScreenSection className="pt-5 lg:px-0" ref={undefined}>
              <div ref={draftsRef}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                    Drafts
                  </p>
                  <span className="text-[10px]" style={{ color: m.textTertiary, fontWeight: 600 }}>
                    {currentUserDrafts.length} saved
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {currentUserDrafts.map((draft) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      isActive={listingDraft?.id === draft.id}
                      onDelete={clearListingDraft}
                      onOpen={openDraft}
                      onSetActive={selectListingDraft}
                    />
                  ))}
                </div>
              </div>
            </ScreenSection>
          ) : null}
        </aside>
      </div>
      </div>

      <BottomSheet open={Boolean(editingListing)} onClose={() => setEditingListing(null)}>
        <div className="px-4 pb-6 pt-4">
          <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>
            Edit listing
          </p>
          <div className="mt-4 grid gap-3">
            <TextField inputMode="decimal" prefix="$" placeholder="Price" value={editForm.price} onChange={(value) => setEditForm((current) => ({ ...current, price: value.replace(/[^0-9.]/g, "") }))} />
            <select
              className="h-[42px] w-full rounded-[14px] border px-3 text-[12.5px] outline-none"
              style={{ background: m.surfaceStrong, borderColor: m.border, color: m.text, fontWeight: 500 }}
              value={editForm.condition}
              onChange={(event) => setEditForm((current) => ({ ...current, condition: event.target.value }))}
            >
              {["Mint", "NM", "LP", "MP", "HP", "DMG"].map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
            <TextField inputMode="numeric" placeholder="Quantity" value={editForm.quantity} onChange={(value) => setEditForm((current) => ({ ...current, quantity: value.replace(/[^0-9]/g, "") }))} />
            <TextArea placeholder="Description" rows={4} value={editForm.description} onChange={(value) => setEditForm((current) => ({ ...current, description: value }))} />
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] border text-[11px]"
              style={{
                borderColor: "rgba(248,113,113,0.28)",
                background: "rgba(127,29,29,0.14)",
                color: "#fca5a5",
                fontWeight: 700,
              }}
              type="button"
              onClick={handleDeleteEditing}
            >
              <Trash2 size={13} />
              Delete listing
            </button>
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton onClick={() => setEditingListing(null)}>Cancel</SecondaryButton>
              <PrimaryButton disabled={busyId === editingListing?.id} onClick={saveEdit}>
                Save
              </PrimaryButton>
            </div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={Boolean(counterOffer)} onClose={() => setCounterOffer(null)}>
        <div className="px-4 pb-6 pt-4">
          <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>
            Counter offer
          </p>
          <div className="mt-4 grid gap-3">
            {(counterForm.offerType === "cash" || counterForm.offerType === "cash-trade") ? (
              <TextField inputMode="decimal" prefix="$" placeholder="Cash amount" value={counterForm.cashAmount} onChange={(value) => setCounterForm((current) => ({ ...current, cashAmount: value.replace(/[^0-9.]/g, "") }))} />
            ) : null}
            {(counterForm.offerType === "trade" || counterForm.offerType === "cash-trade") ? (
              <TextArea placeholder={"One trade item per line"} rows={4} value={counterForm.tradeItems} onChange={(value) => setCounterForm((current) => ({ ...current, tradeItems: value }))} />
            ) : null}
            <TextArea placeholder="Add a note for the buyer..." rows={3} value={counterForm.note} onChange={(value) => setCounterForm((current) => ({ ...current, note: value }))} />
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton onClick={() => setCounterOffer(null)}>Cancel</SecondaryButton>
              <PrimaryButton
                disabled={!counterOffer || busyId === counterOffer.id}
                onClick={() =>
                  handleOfferAction(counterOffer, "counter", {
                    offerType: counterForm.offerType,
                    cashAmount: counterForm.cashAmount,
                    tradeItems: counterForm.tradeItems.split("\n").map((item) => item.trim()).filter(Boolean),
                    note: counterForm.note,
                  })
                }
              >
                Send counter
              </PrimaryButton>
            </div>
          </div>
        </div>
      </BottomSheet>
    </MobileScreen>
  );
}
