import { Star } from "lucide-react";

export default function RatingStars({
  value,
  onChange,
  interactive = false,
  size = 16,
  className = "",
}) {
  return (
    <div
      aria-label={`Rated ${value} out of 5 stars`}
      className={`flex items-center gap-1 ${className}`}
      role={interactive ? undefined : "img"}
    >
      {[1, 2, 3, 4, 5].map((starValue) => (
        interactive ? (
          <button
            key={starValue}
            aria-label={`Rate ${starValue} star${starValue === 1 ? "" : "s"}`}
            className="transition-transform hover:scale-110"
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
        ) : (
          <span key={starValue} aria-hidden="true">
            <Star
              className={starValue <= value ? "text-orange" : "text-slate-300"}
              fill={starValue <= value ? "currentColor" : "none"}
              size={size}
              strokeWidth={1.8}
            />
          </span>
        )
      ))}
    </div>
  );
}
