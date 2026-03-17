import { Star } from "lucide-react";

export default function RatingStars({
  value,
  onChange,
  interactive = false,
  size = 16,
  className = "",
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((starValue) => (
        <button
          key={starValue}
          className={interactive ? "transition-transform hover:scale-110" : ""}
          disabled={!interactive}
          type="button"
          onClick={() => onChange?.(starValue)}
        >
          <Star
            className={starValue <= value ? "text-orange" : "text-slate-300"}
            fill={starValue <= value ? "currentColor" : "none"}
            size={size}
            strokeWidth={1.8}
          />
        </button>
      ))}
    </div>
  );
}
