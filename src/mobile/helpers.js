import { formatCurrency, slugify } from "../utils/formatters";

const LISTING_RETURN_PATH_KEY = "tcgwpg.listingReturnPath";

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
  return (
    listing?.primaryImage ||
    listing?.imageUrl ||
    listing?.image ||
    listing?.listing?.primaryImage ||
    listing?.listing?.imageUrl ||
    ""
  );
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
