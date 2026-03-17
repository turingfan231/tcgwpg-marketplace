import { ImagePlus } from "lucide-react";
import { useState } from "react";
import { useMarketplace } from "../../hooks/useMarketplace";
import ModalShell from "../ui/ModalShell";
import RatingStars from "../ui/RatingStars";

export default function ReviewModal({ seller, onClose }) {
  const { addReview } = useMarketplace();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await addReview({ sellerId: seller.id, rating, comment, imageUrl });

    if (!result?.ok) {
      setSubmitting(false);
      setError(result?.error || "Review could not be posted.");
      return;
    }

    onClose();
  }

  return (
    <ModalShell
      subtitle={`Leave a rating for ${seller.publicName || seller.name} based on your latest local meetup.`}
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

        <div className="rounded-[24px] bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-steel">
            Optional photo
          </p>
          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-[20px] border border-dashed border-slate-300 bg-white px-4 py-4 text-steel transition hover:border-navy hover:text-ink">
            <ImagePlus size={18} />
            <span className="text-sm font-semibold">
              Add a meetup, condition, or packaging photo
            </span>
            <input
              className="hidden"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </label>

          {imageUrl ? (
            <img
              alt="Review upload preview"
              className="mt-4 h-44 w-full rounded-[20px] border border-slate-200 object-cover"
              src={imageUrl}
            />
          ) : null}
        </div>

        {error ? (
          <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <button
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            disabled={submitting}
            className="rounded-full bg-navy px-5 py-3 font-display text-sm font-bold uppercase tracking-[0.12em] text-white"
            type="submit"
          >
            {submitting ? "Posting..." : "Post Review"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
