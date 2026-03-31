export function buildListingSearchText(listing) {
  return [
    listing?.title,
    listing?.game,
    listing?.description,
    listing?.condition,
    listing?.neighborhood,
    listing?.seller?.name,
    listing?.seller?.publicName,
    listing?.seller?.username,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterAndSortListings(listings, options = {}) {
  const {
    search = "",
    gameSlug = "all",
    neighborhood = "All Winnipeg",
    sortBy = "newest",
  } = options;

  let results = Array.isArray(listings) ? [...listings] : [];
  const normalizedSearch = String(search || "").trim().toLowerCase();

  if (gameSlug && gameSlug !== "all") {
    results = results.filter((listing) => listing.gameSlug === gameSlug);
  }

  if (neighborhood && neighborhood !== "All Winnipeg") {
    results = results.filter((listing) => listing.neighborhood === neighborhood);
  }

  if (normalizedSearch) {
    results = results.filter((listing) =>
      buildListingSearchText(listing).includes(normalizedSearch),
    );
  }

  if (sortBy === "price-low") {
    results.sort((left, right) => (left.priceCad || 0) - (right.priceCad || 0));
  } else if (sortBy === "price-high") {
    results.sort((left, right) => (right.priceCad || 0) - (left.priceCad || 0));
  } else if (sortBy === "oldest") {
    results.sort((left, right) => (left.sortTimestamp || 0) - (right.sortTimestamp || 0));
  } else {
    results.sort((left, right) => (right.sortTimestamp || 0) - (left.sortTimestamp || 0));
  }

  return results;
}
