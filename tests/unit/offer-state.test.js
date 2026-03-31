import test from "node:test";
import assert from "node:assert/strict";
import {
  getOfferCounterpartyId,
  resolveOfferResponse,
} from "../../src/lib/offerState.js";

const pendingOffer = {
  id: "offer-1",
  status: "pending",
  sellerId: "seller-2",
  buyerId: "seller-1",
  offerType: "cash",
  cashAmount: 90,
  tradeItems: [],
  note: "Meet after league",
};

test("seller can accept a pending offer", () => {
  const result = resolveOfferResponse(pendingOffer, "seller-2", "accept");

  assert.equal(result.ok, true);
  assert.equal(result.nextStatus, "accepted");
  assert.equal(result.updatePayload.status, "accepted");
  assert.equal(result.updatePayload.last_actor_id, "seller-2");
});

test("buyer cannot respond to a brand new pending offer", () => {
  const result = resolveOfferResponse(pendingOffer, "seller-1", "decline");

  assert.equal(result.ok, false);
  assert.match(result.error, /only the seller/i);
});

test("counter response carries updated trade and note payload", () => {
  const result = resolveOfferResponse(pendingOffer, "seller-2", "counter", {
    offerType: "cash-trade",
    cashAmount: 60,
    tradeItems: ["Alt art binder piece", "", null],
    note: "Can add one more card if we meet at Fusion.",
  });

  assert.equal(result.ok, true);
  assert.equal(result.nextStatus, "countered");
  assert.equal(result.nextOfferType, "cash-trade");
  assert.equal(result.nextCashAmount, 60);
  assert.deepEqual(result.nextTradeItems, ["Alt art binder piece"]);
  assert.equal(result.updatePayload.note, "Can add one more card if we meet at Fusion.");
});

test("last actor cannot respond to their own counter", () => {
  const counteredOffer = {
    ...pendingOffer,
    status: "countered",
    lastActorId: "seller-2",
  };

  const result = resolveOfferResponse(counteredOffer, "seller-2", "accept");

  assert.equal(result.ok, false);
  assert.match(result.error, /own counter offer/i);
});

test("getOfferCounterpartyId returns the other participant", () => {
  assert.equal(getOfferCounterpartyId(pendingOffer, "seller-2"), "seller-1");
  assert.equal(getOfferCounterpartyId(pendingOffer, "seller-1"), "seller-2");
});
