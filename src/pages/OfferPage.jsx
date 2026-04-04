import {
  Check,
  DollarSign,
  LoaderCircle,
  MessageCircle,
  Plus,
  Repeat,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import { formatPrice, listingArtwork } from "../mobile/helpers";
import {
  BottomActionBar,
  ChoicePill,
  DetailHeader,
  EmptyBlock,
  MobileScreen,
  PrimaryButton,
  ScreenSection,
  SecondaryButton,
  TextArea,
  TextField,
} from "../mobile/primitives";

const OFFER_TYPES = [
  { id: "cash", label: "Cash", icon: DollarSign },
  { id: "trade", label: "Trade", icon: Repeat },
  { id: "cash-trade", label: "Cash + Trade", icon: Plus },
];

function OfferTypeButton({ active, icon: Icon, label, onClick }) {
  return (
    <motion.button
      className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] py-2.5 text-[12px]"
      style={{
        background: active ? "rgba(239,68,68,0.12)" : m.surfaceStrong,
        border: `1px solid ${active ? "rgba(239,68,68,0.16)" : m.border}`,
        color: active ? "#fca5a5" : m.textSecondary,
        fontWeight: active ? 700 : 600,
      }}
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
    >
      <Icon size={14} />
      {label}
    </motion.button>
  );
}

function SummaryCard({ listing, offerType, cashAmount, tradeItems }) {
  const tradeValue = tradeItems.reduce((total, item) => total + Number(item.estimatedValue || 0), 0);
  const cashValue = Number(cashAmount || 0);
  const totalValue = offerType === "trade" ? tradeValue : offerType === "cash" ? cashValue : tradeValue + cashValue;
  const diff = totalValue - Number(listing.priceCad || listing.price || 0);

  return (
    <div className="rounded-[18px] border" style={{ background: m.surfaceStrong, borderColor: m.border }}>
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px]" style={{ color: m.textSecondary, fontWeight: 700, letterSpacing: "0.08em" }}>
            OFFER SUMMARY
          </span>
          <span className="text-[10px]" style={{ color: m.textTertiary, fontWeight: 600 }}>
            Asking {formatPrice(listing.priceCad ?? listing.price, listing.priceCurrency || "CAD")}
          </span>
        </div>
        {(offerType === "cash" || offerType === "cash-trade") && (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[12px]" style={{ color: m.textSecondary }}>
              Cash
            </span>
            <span className="text-[14px] text-white" style={{ fontWeight: 700 }}>
              ${cashAmount || "0"}
            </span>
          </div>
        )}
        {(offerType === "trade" || offerType === "cash-trade") && (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[12px]" style={{ color: m.textSecondary }}>
              Trade value
            </span>
            <span className="text-[14px] text-white" style={{ fontWeight: 700 }}>
              ${tradeValue}
            </span>
          </div>
        )}
        <div className="mt-2 border-t pt-2" style={{ borderColor: m.border }}>
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: m.textSecondary }}>
              Total offer
            </span>
            <span className="text-[18px] text-white" style={{ fontWeight: 700 }}>
              ${totalValue}
            </span>
          </div>
          <p className="mt-1 text-right text-[10px]" style={{ color: diff >= 0 ? "#6ee7b7" : "#fca5a5", fontWeight: 700 }}>
            {diff >= 0 ? `+$${diff}` : `-$${Math.abs(diff)}`} vs asking
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OfferPage() {
  const navigate = useNavigate();
  const { listingId } = useParams();
  const { activeListings, collectionItems, createOffer, currentUser } = useMarketplace();
  const [offerType, setOfferType] = useState("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [message, setMessage] = useState("");
  const [manualTradeItems, setManualTradeItems] = useState("");
  const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const listing = useMemo(
    () => activeListings.find((item) => item.id === listingId),
    [activeListings, listingId],
  );

  const collectionChoices = useMemo(
    () =>
      (collectionItems || []).slice(0, 12).map((item) => ({
        id: item.id,
        title: item.title,
        estimatedValue: Number(item.marketPrice || item.marketPriceCad || item.priceCad || 0),
      })),
    [collectionItems],
  );

  const tradeItems = useMemo(() => {
    const fromCollection = collectionChoices.filter((item) => selectedCollectionIds.includes(item.id));
    const manualItems = manualTradeItems
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item, index) => ({ id: `manual-${index}`, title: item, estimatedValue: 0 }));
    return [...fromCollection, ...manualItems];
  }, [collectionChoices, manualTradeItems, selectedCollectionIds]);

  const isValid =
    (offerType === "cash" && Number(cashAmount) > 0) ||
    (offerType === "trade" && tradeItems.length > 0) ||
    (offerType === "cash-trade" && Number(cashAmount) > 0 && tradeItems.length > 0);

  async function handleSubmit() {
    if (!listing || !isValid || submitting) {
      return;
    }
    if (!currentUser) {
      navigate("/auth", { state: { from: `/offer/${listing.id}` } });
      return;
    }
    setSubmitting(true);
    setError("");
    const result = await createOffer({
      listingId: listing.id,
      offerType,
      cashAmount: offerType === "trade" ? 0 : Number(cashAmount || 0),
      tradeItems: offerType === "cash" ? [] : tradeItems.map((item) => item.title),
      note: message.trim(),
    });
    setSubmitting(false);
    if (!result?.ok) {
      setError(result?.error || "Offer could not be sent.");
      return;
    }
    navigate(result.threadId ? `/inbox/${result.threadId}` : `/listing/${listing.id}`);
  }

  function toggleTradeItem(itemId) {
    setSelectedCollectionIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  }

  if (!listing) {
    return (
      <MobileScreen>
        <SeoHead canonicalPath={listingId ? `/offer/${listingId}` : "/offer"} description="Send an offer on a marketplace listing." title="Offer" />
        <DetailHeader onBack={() => navigate(-1)} title="Make Offer" />
        <ScreenSection className="pt-6">
          <EmptyBlock description="This listing is no longer active or hasn't loaded yet." title="Listing not found" />
        </ScreenSection>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen className="pb-28">
      <SeoHead canonicalPath={`/offer/${listing.id}`} description={`Send a structured offer on ${listing.title}.`} title="Make Offer" />
      <DetailHeader onBack={() => navigate(-1)} title="Make Offer" />

      <ScreenSection className="pt-3">
        <div className="rounded-[18px] border p-3" style={{ background: m.surface, borderColor: m.border }}>
          <div className="flex gap-3">
            <img alt={listing.title} className="h-16 w-14 rounded-[12px] object-cover" src={listingArtwork(listing)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-white" style={{ fontWeight: 700 }}>
                {listing.title}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                {[listing.setName || listing.set, listing.condition].filter(Boolean).join(" • ")}
              </p>
              <p className="mt-3 text-[17px] text-white" style={{ fontWeight: 700 }}>
                {formatPrice(listing.priceCad ?? listing.price, listing.priceCurrency || "CAD")}
              </p>
            </div>
          </div>
        </div>
      </ScreenSection>

      <ScreenSection className="pt-4">
        <div className="flex gap-2">
          {OFFER_TYPES.map((option) => (
            <OfferTypeButton
              key={option.id}
              active={offerType === option.id}
              icon={option.icon}
              label={option.label}
              onClick={() => setOfferType(option.id)}
            />
          ))}
        </div>
      </ScreenSection>

      {(offerType === "cash" || offerType === "cash-trade") ? (
        <ScreenSection className="pt-4">
          <p className="mb-2 text-[10px] uppercase" style={{ color: m.textTertiary, fontWeight: 700, letterSpacing: "0.08em" }}>
            Cash amount
          </p>
          <TextField inputMode="decimal" placeholder="0" prefix="$" value={cashAmount} onChange={(value) => setCashAmount(value.replace(/[^0-9.]/g, ""))} />
          <div className="mt-2 flex gap-2">
            {[0.8, 0.9, 1].map((ratio) => {
              const basePrice = Number((listing.priceCad ?? listing.price) || 0);
              const nextValue = Math.round(basePrice * ratio);
              return (
                <SecondaryButton key={ratio} className="flex-1 h-9 text-[11px]" onClick={() => setCashAmount(String(nextValue))}>
                  ${nextValue}
                </SecondaryButton>
              );
            })}
          </div>
        </ScreenSection>
      ) : null}

      {(offerType === "trade" || offerType === "cash-trade") ? (
        <>
          <ScreenSection className="pt-4">
            <p className="mb-2 text-[10px] uppercase" style={{ color: m.textTertiary, fontWeight: 700, letterSpacing: "0.08em" }}>
              Collection picks
            </p>
            {collectionChoices.length ? (
              <div className="flex flex-col gap-2">
                {collectionChoices.map((item) => {
                  const active = selectedCollectionIds.includes(item.id);
                  return (
                    <motion.button
                      key={item.id}
                      className="flex items-center gap-3 rounded-[16px] border p-3 text-left"
                      style={{
                        background: active ? "rgba(239,68,68,0.08)" : m.surface,
                        borderColor: active ? "rgba(239,68,68,0.14)" : m.border,
                      }}
                      type="button"
                      whileTap={{ scale: 0.985 }}
                      onClick={() => toggleTradeItem(item.id)}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: active ? "rgba(239,68,68,0.16)" : m.surfaceStrong }}>
                        {active ? <Check size={14} style={{ color: "#fca5a5" }} /> : <Repeat size={14} style={{ color: m.textSecondary }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] text-white" style={{ fontWeight: 700 }}>
                          {item.title}
                        </p>
                        <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                          {item.estimatedValue ? `$${item.estimatedValue} est.` : "Value not set"}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <EmptyBlock
                description="No collection items are saved yet. You can still type trade items manually below."
                title="Collection is empty"
              />
            )}
          </ScreenSection>
          <ScreenSection className="pt-4">
            <p className="mb-2 text-[10px] uppercase" style={{ color: m.textTertiary, fontWeight: 700, letterSpacing: "0.08em" }}>
              Manual trade items
            </p>
            <TextArea
              placeholder={"One trade item per line\nExample: Umbreon VMAX Alt Art"}
              rows={4}
              value={manualTradeItems}
              onChange={setManualTradeItems}
            />
          </ScreenSection>
        </>
      ) : null}

      <ScreenSection className="pt-4">
        <p className="mb-2 text-[10px] uppercase" style={{ color: m.textTertiary, fontWeight: 700, letterSpacing: "0.08em" }}>
          Message
        </p>
        <TextArea
          placeholder="Meetup timing, condition assumptions, or counter flexibility..."
          rows={3}
          value={message}
          onChange={setMessage}
        />
      </ScreenSection>

      <ScreenSection className="pt-4">
        <SummaryCard cashAmount={cashAmount} listing={listing} offerType={offerType} tradeItems={tradeItems} />
      </ScreenSection>

      {error ? (
        <ScreenSection className="pt-4">
          <div className="rounded-[16px] border px-3 py-3 text-[11px]" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.12)", color: "#fca5a5", fontWeight: 600 }}>
            {error}
          </div>
        </ScreenSection>
      ) : null}

      <BottomActionBar>
        <div className="flex gap-2">
          <SecondaryButton className="flex-1" onClick={() => navigate(`/listing/${listing.id}`)}>
            <X size={14} />
            Cancel
          </SecondaryButton>
          <PrimaryButton className="flex-[1.4]" disabled={!isValid || submitting} onClick={() => void handleSubmit()}>
            {submitting ? <LoaderCircle className="animate-spin" size={14} /> : <MessageCircle size={14} />}
            Send Offer
          </PrimaryButton>
        </div>
      </BottomActionBar>
    </MobileScreen>
  );
}
