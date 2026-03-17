import { useState } from "react";
import { useMarketplace } from "../../hooks/useMarketplace";
import ModalShell from "../ui/ModalShell";

export default function OfferModal({ listing, onClose }) {
  const { createOffer, formatCadPrice } = useMarketplace();
  const [offerType, setOfferType] = useState(listing.acceptsTrade ? "cash-trade" : "cash");
  const [cashAmount, setCashAmount] = useState(listing.price);
  const [tradeItems, setTradeItems] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const normalizedTradeItems = tradeItems
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const result = await createOffer({
      listingId: listing.id,
      offerType,
      cashAmount: offerType === "trade" ? 0 : cashAmount,
      tradeItems:
        offerType === "cash" ? [] : normalizedTradeItems,
      note,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onClose();
  }

  return (
    <ModalShell
      subtitle={`Send a structured offer on ${listing.title}.`}
      title="Make Offer"
      onClose={onClose}
    >
      <form className="space-y-6 p-6" onSubmit={handleSubmit}>
        <div className="rounded-[24px] bg-[#f8f5ee] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
            Asking price
          </p>
          <p className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
            {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { id: "cash", label: "Cash" },
            { id: "trade", label: "Trade" },
            { id: "cash-trade", label: "Cash + Trade" },
          ].map((option) => (
            <button
              key={option.id}
              className={`rounded-[20px] border px-4 py-4 text-sm font-semibold transition ${
                offerType === option.id
                  ? "border-navy bg-navy text-white"
                  : "border-slate-200 bg-white text-steel"
              }`}
              type="button"
              onClick={() => setOfferType(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {offerType !== "trade" ? (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-steel">Cash amount (CAD)</span>
            <input
              min="0"
              step="0.01"
              className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
              type="number"
              value={cashAmount}
              onChange={(event) => setCashAmount(event.target.value)}
            />
          </label>
        ) : null}

        {offerType !== "cash" ? (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-steel">Trade items</span>
            <textarea
              className="min-h-32 w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
              placeholder="One item per line. Example: 4x Arid Mesa&#10;1x Van Gogh Pikachu"
              value={tradeItems}
              onChange={(event) => setTradeItems(event.target.value)}
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-steel">Offer note</span>
          <textarea
            className="min-h-28 w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
            placeholder="Meetup timing, condition assumptions, or counter flexibility."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        {error ? (
          <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <button
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-steel"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-orange px-5 py-3 text-sm font-semibold text-white"
            type="submit"
          >
            Send offer
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
