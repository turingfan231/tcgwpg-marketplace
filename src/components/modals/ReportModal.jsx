import { useState } from "react";
import { useMarketplace } from "../../hooks/useMarketplace";
import ModalShell from "../ui/ModalShell";

const reportReasons = [
  { id: "fake-card", label: "Fake or proxy suspected" },
  { id: "misleading-condition", label: "Misleading condition" },
  { id: "no-show", label: "No-show meetup behavior" },
  { id: "harassment", label: "Harassment or abusive messages" },
  { id: "scam-risk", label: "Scam risk" },
];

export default function ReportModal({ listing, onClose }) {
  const { submitReport } = useMarketplace();
  const [reason, setReason] = useState(reportReasons[0].id);
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const result = await submitReport({
      listingId: listing.id,
      sellerId: listing.sellerId,
      reason,
      details,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onClose();
  }

  return (
    <ModalShell
      subtitle={`Report ${listing.title} for moderation review.`}
      title="Report Listing"
      onClose={onClose}
    >
      <form className="space-y-6 p-6" onSubmit={handleSubmit}>
        <div className="grid gap-3">
          {reportReasons.map((option) => (
            <button
              key={option.id}
              className={`rounded-[20px] border px-4 py-4 text-left text-sm font-semibold transition ${
                reason === option.id
                  ? "border-rose-400 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-white text-steel"
              }`}
              type="button"
              onClick={() => setReason(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-steel">Details</span>
          <textarea
            required
            className="min-h-36 w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
            placeholder="Add context for admin review. Mention image mismatch, condition issue, meetup problem, or message behavior."
            value={details}
            onChange={(event) => setDetails(event.target.value)}
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
            className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white"
            type="submit"
          >
            Submit report
          </button>
        </div>
      </form>
    </ModalShell>
  );
}


