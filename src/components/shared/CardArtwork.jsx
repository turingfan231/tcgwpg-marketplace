import { useEffect, useState } from "react";

const DEPLOY_API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "")
  .trim()
  .replace(/\/$/, "");

function buildImageProxyUrl(src) {
  const rawSrc = String(src || "").trim();

  if (!rawSrc) {
    return "";
  }

  const shouldProxy =
    /^https:\/\/en\.onepiece-cardgame\.com\/images\/cardlist\/card\//i.test(rawSrc) ||
    /^https:\/\/storage\.googleapis\.com\/images\.pricecharting\.com\//i.test(rawSrc);

  if (shouldProxy) {
    const baseUrl =
      DEPLOY_API_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    return baseUrl
      ? `${baseUrl}/api/live/image-proxy?url=${encodeURIComponent(rawSrc)}`
      : rawSrc;
  }

  return rawSrc;
}

export default function CardArtwork({ src, title, game, className = "" }) {
  const [hasError, setHasError] = useState(false);
  const shouldSkipRemoteImage = String(src || "").includes("images.onepiece-cardgame.dev");
  const displaySrc = shouldSkipRemoteImage ? "" : buildImageProxyUrl(src);
  const compactGameLabel = String(game || "TCG").replace("Dragon Ball Super Fusion World", "Fusion");
  const accessibleTitle = String(title || "").trim() || `${compactGameLabel} card artwork`;

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (displaySrc && !hasError) {
    return (
      <img
        alt={accessibleTitle}
        className={`${className} bg-[var(--surface-hover)] object-top`}
        loading="lazy"
        referrerPolicy="no-referrer"
        src={displaySrc}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-[var(--surface-hover)] ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,55,55,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(17,36,56,0.08),transparent_28%)]" />
      <div className="absolute inset-[10%] rounded-[10px] border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-solid)_76%,transparent)]" />
      <div className="relative flex h-full flex-col justify-between p-2.5 text-ink sm:p-5">
        <span className="w-fit rounded-full border border-[rgba(177,29,35,0.12)] bg-white/76 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-navy sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.22em]">
          {compactGameLabel}
        </span>
        <div className="space-y-1">
          <p className="font-display text-[0.95rem] font-semibold leading-none tracking-[-0.03em] sm:text-2xl">
            {compactGameLabel || "TCG"}
          </p>
          <p className="line-clamp-3 max-w-[12rem] text-[10px] leading-4 text-steel sm:text-sm sm:leading-5">
            {accessibleTitle}
          </p>
        </div>
      </div>
    </div>
  );
}

