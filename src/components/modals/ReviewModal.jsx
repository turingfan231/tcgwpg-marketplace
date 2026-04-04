import { ImagePlus } from "lucide-react";
import { useState } from "react";
import { useMarketplace } from "../../hooks/useMarketplace";
import { m } from "../../mobile/design";
import { PrimaryButton, SecondaryButton, TextArea } from "../../mobile/primitives";
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
      title="Leave review"
      onClose={onClose}
    >
      <form className="space-y-5 p-4 sm:p-5" onSubmit={handleSubmit}>
        <div className="rounded-[18px] border p-4" style={{ background: m.surface, borderColor: m.border }}>
          <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
            Star rating
          </p>
          <div className="mt-3">
            <RatingStars interactive size={26} value={rating} onChange={setRating} />
          </div>
        </div>

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
            Written review
          </span>
          <TextArea
            required
            className="mt-3 min-h-32 resize-y"
            placeholder="Call out condition accuracy, response time, and meetup experience."
            value={comment}
            onChange={setComment}
          />
        </label>

        <div className="rounded-[18px] border p-4" style={{ background: m.surface, borderColor: m.border }}>
          <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
            Optional photo
          </p>
          <label
            className="mt-3 flex cursor-pointer items-center gap-3 rounded-[14px] border px-4 py-4 text-[12px]"
            style={{ background: m.surfaceStrong, borderColor: m.border, color: m.textSecondary, fontWeight: 600 }}
          >
            <ImagePlus size={18} />
            <span>Add meetup or condition photo</span>
            <input className="hidden" type="file" accept="image/*" onChange={handleImageUpload} />
          </label>

          {imageUrl ? (
            <img
              alt="Review upload preview"
              className="mt-4 h-44 w-full object-cover"
              src={imageUrl}
            />
          ) : null}
        </div>

        {error ? (
          <div className="rounded-[16px] px-4 py-3 text-[11px]" style={{ background: "rgba(239,68,68,0.08)", color: m.danger, fontWeight: 600 }}>
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton disabled={submitting} type="submit">
            {submitting ? "Posting..." : "Post review"}
          </PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}
