import { useState } from "react";
import { useMarketplace } from "../../hooks/useMarketplace";
import ModalShell from "../ui/ModalShell";
import RatingStars from "../ui/RatingStars";

export default function ReviewModal({ seller, onClose }) {
  const { addReview } = useMarketplace();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    await addReview({ sellerId: seller.id, rating, comment });
    onClose();
  }

  return (
    <ModalShell
      subtitle={`Leave a rating for ${seller.name} based on your latest local meetup.`}
      title="Leave Review"
      onClose={onClose}
    >
      <form className="space-y-6 p-6" onSubmit={handleSubmit}>
        <div className="rounded-[24px] bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-steel">
            Star Rating
          </p>
          <RatingStars
            className="mt-3"
            interactive
            size={26}
            value={rating}
            onChange={setRating}
          />
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-steel">
            Written Review
          </span>
          <textarea
            required
            className="min-h-40 w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-ink outline-none transition focus:border-navy focus:bg-white"
            placeholder="Call out condition accuracy, response time, and meetup experience."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>

        <div className="flex justify-end gap-3">
          <button
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-navy px-5 py-3 font-display text-sm font-bold uppercase tracking-[0.12em] text-white"
            type="submit"
          >
            Post Review
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
