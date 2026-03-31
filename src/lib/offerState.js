export function resolveOfferResponse(offer, currentUserId, action, counterPayload = {}) {
  if (!offer || !currentUserId) {
    return { ok: false, error: "Offer not found." };
  }

  const normalizedCurrentUserId = String(currentUserId);
  const isParticipant =
    normalizedCurrentUserId === String(offer.sellerId) ||
    normalizedCurrentUserId === String(offer.buyerId);

  if (!isParticipant) {
    return { ok: false, error: "You cannot respond to this offer." };
  }

  const lastActorId =
    offer.lastActorId || (offer.status === "pending" ? offer.buyerId : offer.sellerId);

  if (offer.status === "pending" && normalizedCurrentUserId !== String(offer.sellerId)) {
    return { ok: false, error: "Only the seller can respond to a new offer." };
  }

  if (offer.status === "countered" && normalizedCurrentUserId === String(lastActorId)) {
    return { ok: false, error: "You cannot respond to your own counter offer." };
  }

  const nextStatus =
    action === "accept" ? "accepted" : action === "decline" ? "declined" : "countered";
  const nextUpdatedAt = new Date().toISOString();
  const nextOfferType = counterPayload.offerType || offer.offerType;
  const nextCashAmount =
    counterPayload.cashAmount !== undefined
      ? Number(counterPayload.cashAmount) || 0
      : offer.cashAmount;
  const nextTradeItems = Array.isArray(counterPayload.tradeItems)
    ? counterPayload.tradeItems.filter(Boolean)
    : offer.tradeItems;
  const nextNote =
    counterPayload.note !== undefined ? String(counterPayload.note || "") : offer.note;

  return {
    ok: true,
    nextStatus,
    nextOfferType,
    nextCashAmount,
    nextTradeItems,
    nextNote,
    nextUpdatedAt,
    updatePayload: {
      status: nextStatus,
      last_actor_id: currentUserId,
      updated_at: nextUpdatedAt,
      ...(action === "counter"
        ? {
            offer_type: nextOfferType,
            cash_amount: nextCashAmount,
            trade_items: nextTradeItems,
            note: nextNote,
          }
        : {}),
    },
  };
}

export function getOfferCounterpartyId(offer, currentUserId) {
  if (!offer || !currentUserId) {
    return "";
  }

  return String(offer.buyerId) === String(currentUserId)
    ? String(offer.sellerId || "")
    : String(offer.buyerId || "");
}
