import { useEffect, useState } from "react";

export default function CardArtwork({ src, title, game, className = "" }) {
  const [hasError, setHasError] = useState(false);
  const shouldSkipRemoteImage = String(src || "").includes("images.onepiece-cardgame.dev");
  const displaySrc = shouldSkipRemoteImage ? "" : src;

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (displaySrc && !hasError) {
    return (
      <img
        alt={title}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer"
        src={displaySrc}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-[linear-gradient(160deg,#1b4258_0%,#14364a_48%,#113042_100%)] ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,153,0,0.38),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_32%)]" />
      <div className="absolute inset-4 rounded-[20px] border border-white/15 bg-white/5" />
      <div className="relative flex h-full flex-col justify-between p-5 text-white">
        <span className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
          {game}
        </span>
        <div>
          <p className="font-display text-2xl font-semibold tracking-[-0.03em]">
            {game || "TCG"}
          </p>
          <p className="mt-2 max-w-[12rem] text-sm text-white/75">{title}</p>
        </div>
      </div>
    </div>
  );
}

