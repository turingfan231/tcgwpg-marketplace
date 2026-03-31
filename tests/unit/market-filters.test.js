import test from "node:test";
import assert from "node:assert/strict";
import { buildListingSearchText, filterAndSortListings } from "../../src/lib/marketFilters.js";

const listings = [
  {
    id: "listing-1",
    title: "Sheoldred, the Apocalypse",
    game: "Magic",
    gameSlug: "magic",
    description: "Osborne Village pickup",
    condition: "NM",
    neighborhood: "Osborne Village",
    seller: { name: "Jordan Friesen", publicName: "Jordan", username: "jordanf" },
    priceCad: 98,
    sortTimestamp: 200,
  },
  {
    id: "listing-2",
    title: "Charizard ex",
    game: "Pokemon",
    gameSlug: "pokemon",
    description: "St. Vital meetup",
    condition: "LP",
    neighborhood: "St. Vital",
    seller: { name: "Maya Chen", publicName: "Maya", username: "maya" },
    priceCad: 48,
    sortTimestamp: 300,
  },
  {
    id: "listing-3",
    title: "Roronoa Zoro",
    game: "One Piece",
    gameSlug: "one-piece",
    description: "Maples local meetup",
    condition: "NM",
    neighborhood: "Maples",
    seller: { name: "Net Seller", publicName: "Net", username: "net" },
    priceCad: 849,
    sortTimestamp: 100,
  },
];

test("buildListingSearchText includes seller and listing fields", () => {
  const text = buildListingSearchText(listings[0]);
  assert.match(text, /sheoldred/);
  assert.match(text, /magic/);
  assert.match(text, /osborne village/);
  assert.match(text, /jordan/);
});

test("filterAndSortListings filters by game slug and neighborhood", () => {
  const results = filterAndSortListings(listings, {
    gameSlug: "pokemon",
    neighborhood: "St. Vital",
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].id, "listing-2");
});

test("filterAndSortListings searches across seller and description text", () => {
  const bySeller = filterAndSortListings(listings, { search: "jordan" });
  const byDescription = filterAndSortListings(listings, { search: "maples" });

  assert.deepEqual(bySeller.map((listing) => listing.id), ["listing-1"]);
  assert.deepEqual(byDescription.map((listing) => listing.id), ["listing-3"]);
});

test("filterAndSortListings sorts by price and recency", () => {
  const newest = filterAndSortListings(listings, { sortBy: "newest" }).map((listing) => listing.id);
  const priceLow = filterAndSortListings(listings, { sortBy: "price-low" }).map((listing) => listing.id);
  const priceHigh = filterAndSortListings(listings, { sortBy: "price-high" }).map((listing) => listing.id);

  assert.deepEqual(newest, ["listing-2", "listing-1", "listing-3"]);
  assert.deepEqual(priceLow, ["listing-2", "listing-1", "listing-3"]);
  assert.deepEqual(priceHigh, ["listing-3", "listing-1", "listing-2"]);
});
