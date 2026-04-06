import { formatCurrency, slugify } from "../utils/formatters.js";

const LISTING_RETURN_PATH_KEY = "tcgwpg.listingReturnPath";
const BLOCKED_ARTWORK_HOSTS = new Set(["images.onepiece-cardgame.dev"]);
const GAME_ARTWORK_ACCENTS = {
  pokemon: "#60a5fa",
  magic: "#c084fc",
  "one-piece": "#f87171",
  "dragon-ball-super-fusion-world": "#38bdf8",
  "dragon-ball-fusion-world": "#38bdf8",
  "union-arena": "#fbbf24",
};

function artworkPlaceholder(listing) {
  const gameSlug = slugify(listing?.gameSlug || listing?.game || "tcg");
  const accent = GAME_ARTWORK_ACCENTS[gameSlug] || "#ef4444";
  const label = String(listing?.game || "TCG WPG").slice(0, 24);
  const title = String(listing?.title || "Marketplace").slice(0, 32);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="1024" viewBox="0 0 720 1024">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#101115" />
          <stop offset="100%" stop-color="#17181d" />
        </linearGradient>
        <linearGradient id="accent" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.15" />
        </linearGradient>
      </defs>
      <rect width="720" height="1024" rx="44" fill="url(#bg)" />
      <rect x="42" y="42" width="636" height="940" rx="34" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" />
      <circle cx="584" cy="170" r="190" fill="url(#accent)" opacity="0.33" />
      <rect x="88" y="114" width="138" height="34" rx="17" fill="rgba(255,255,255,0.08)" />
      <text x="157" y="137" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" fill="#f4f4f5">${label}</text>
      <text x="88" y="812" font-family="Inter, Arial, sans-serif" font-size="46" font-weight="800" fill="#f4f4f5">${title}</text>
      <text x="88" y="864" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="500" fill="rgba(244,244,245,0.68)">Artwork preview unavailable</text>
      <rect x="88" y="908" width="190" height="10" rx="5" fill="${accent}" opacity="0.88" />
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function sanitizeArtworkCandidate(value) {
  if (!value) {
    return "";
  }

  const source = String(value).trim();
  if (!source) {
    return "";
  }

  if (source.startsWith("data:") || source.startsWith("blob:")) {
    return source;
  }

  try {
    const parsed = new URL(source);
    if (BLOCKED_ARTWORK_HOSTS.has(parsed.hostname)) {
      return "";
    }
  } catch {
    return source;
  }

  return source;
}

export function compactTimeLabel(input) {
  if (!input) {
    return "";
  }

  if (typeof input === "string" && /\b(m|h|d|ago)\b/i.test(input)) {
    return input.replace(/\s+/g, "");
  }

  const value = new Date(input).getTime();
  if (!Number.isFinite(value)) {
    return "";
  }

  const diff = Date.now() - value;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) {
    return `${Math.max(1, Math.round(diff / minute))}m`;
  }
  if (diff < day) {
    return `${Math.max(1, Math.round(diff / hour))}h`;
  }
  return `${Math.max(1, Math.round(diff / day))}d`;
}

export function sellerInitial(user) {
  const source =
    user?.publicName ||
    user?.username ||
    user?.name ||
    user?.seller?.publicName ||
    user?.seller?.name ||
    "?";
  return String(source).trim().charAt(0).toUpperCase();
}

export function sellerLabel(user) {
  return (
    user?.publicName ||
    user?.username ||
    user?.name ||
    user?.seller?.publicName ||
    user?.seller?.name ||
    "Unknown seller"
  );
}

export function listingArtwork(listing) {
  const candidates = [
    listing?.primaryImage,
    listing?.imageUrl,
    listing?.image,
    listing?.listing?.primaryImage,
    listing?.listing?.imageUrl,
  ]
    .map(sanitizeArtworkCandidate)
    .filter(Boolean);

  return candidates[0] || artworkPlaceholder(listing);
}

export function formatPrice(value, currency = "CAD") {
  return formatCurrency(value, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function listingHref(listingId) {
  return `/listing/${listingId}`;
}

export function rememberListingReturnPath(path) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedPath = String(path || "").trim();
  if (!normalizedPath) {
    return;
  }

  try {
    window.sessionStorage.setItem(LISTING_RETURN_PATH_KEY, normalizedPath);
  } catch {
    // Ignore storage write failures in constrained/private browser contexts.
  }
}

export function readListingReturnPath(fallback = "/market") {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    return window.sessionStorage.getItem(LISTING_RETURN_PATH_KEY) || fallback;
  } catch {
    return fallback;
  }
}

export function rememberAndNavigateToListing(navigate, locationLike, listingId) {
  const pathname = locationLike?.pathname || "/";
  const search = locationLike?.search || "";
  const hash = locationLike?.hash || "";
  const backTo = `${pathname}${search}${hash}`;

  rememberListingReturnPath(backTo);
  navigate(listingHref(listingId), { state: { backTo } });
}

export function inboxHref(threadId) {
  return `/inbox/${threadId}`;
}

export function sellerHref(seller) {
  return `/seller/${seller?.id || slugify(sellerLabel(seller))}`;
}

export function storeHref(storeSlug) {
  return `/stores/${storeSlug}`;
}
