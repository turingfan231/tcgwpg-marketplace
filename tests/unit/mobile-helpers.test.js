import test from "node:test";
import assert from "node:assert/strict";
import { listingArtwork } from "../../src/mobile/helpers.js";

test("listingArtwork falls back to a local placeholder for blocked artwork hosts", () => {
  const src = listingArtwork({
    game: "One Piece",
    title: "Tony Tony.Chopper",
    primaryImage: "https://images.onepiece-cardgame.dev/cards/P-065.webp",
  });

  assert.match(src, /^data:image\/svg\+xml/);
  assert.match(decodeURIComponent(src), /Tony Tony\.Chopper/);
});

test("listingArtwork keeps valid remote artwork URLs", () => {
  const src = listingArtwork({
    game: "Pokemon",
    title: "Charizard ex",
    primaryImage: "https://storage.googleapis.com/images.pricecharting.com/example/1600.jpg",
  });

  assert.equal(src, "https://storage.googleapis.com/images.pricecharting.com/example/1600.jpg");
});
