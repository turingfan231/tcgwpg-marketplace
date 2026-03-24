export function formatCurrency(value, currency = "CAD", options = {}) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
  }).format(numericValue);
}

export function formatCompactCurrency(value, currency = "USD") {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numericValue);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-CA").format(Number(value) || 0);
}

export function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getListingTypeClasses(type) {
  const toneMap = {
    WTS: "bg-orange/15 text-orange ring-1 ring-orange/30",
    WTB: "bg-navy/10 text-navy ring-1 ring-navy/20",
    WTT: "bg-navy/12 text-navy ring-1 ring-navy/20",
  };

  return toneMap[type] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

export function getConditionClasses(condition) {
  const toneMap = {
    NM: "bg-navy/10 text-navy ring-1 ring-navy/20",
    LP: "bg-orange/12 text-orange ring-1 ring-orange/20",
    MP: "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20",
    HP: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
  };

  return toneMap[condition] || "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

export function getGameClasses(game) {
  const toneMap = {
    "Magic: The Gathering": "bg-navy/10 text-navy",
    Magic: "bg-navy/10 text-navy",
    Pokemon: "bg-orange/10 text-orange",
    "One Piece": "bg-navy/8 text-navy",
  };

  return toneMap[game] || "bg-slate-100 text-slate-700";
}
