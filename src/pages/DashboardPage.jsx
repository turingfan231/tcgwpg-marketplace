import { BarChart3, Eye, FileText, RefreshCcw, Tag } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import CardArtwork from "../components/shared/CardArtwork";
import { useMarketplace } from "../hooks/useMarketplace";
import { formatNumber } from "../utils/formatters";

function formatOfferTypeLabel(type) {
  if (type === "cash-trade") {
    return "Cash + Trade";
  }

  return type[0].toUpperCase() + type.slice(1);
}

export default function DashboardPage() {
  const {
    bumpListing,
    clearListingDraft,
    currentUser,
    currentUserDrafts,
    currentUserListings,
    editListing,
    formatCadPrice,
    listingDraft,
    markListingSold,
    offersForCurrentUser,
    openCreateListing,
    respondToOffer,
    selectListingDraft,
  } = useMarketplace();
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({
    price: "",
    condition: "NM",
    quantity: 1,
    description: "",
  });
  const [counterDrafts, setCounterDrafts] = useState({});

  const activeCount = currentUserListings.filter(
    (listing) => listing.status !== "sold",
  ).length;
  const totalViews = currentUserListings.reduce(
    (total, listing) => total + listing.views,
    0,
  );
  const totalOffers = currentUserListings.reduce(
    (total, listing) => total + listing.offers,
    0,
  );
  const sellerOffers = offersForCurrentUser.filter(
    (offer) => offer.sellerId === currentUser.id,
  );

  function openEditor(listing) {
    setEditingId(listing.id);
    setEditForm({
      price: listing.price,
      condition: listing.condition,
      quantity: listing.quantity || 1,
      description: listing.description,
    });
  }

  function beginCounterDraft(offer) {
    setCounterDrafts((current) => ({
      ...current,
      [offer.id]: {
        offerType: offer.offerType,
        cashAmount: String(offer.cashAmount || ""),
        tradeItems: Array.isArray(offer.tradeItems) ? offer.tradeItems.join("\n") : "",
        note: offer.note || "",
      },
    }));
  }

  function clearCounterDraft(offerId) {
    setCounterDrafts((current) => {
      const next = { ...current };
      delete next[offerId];
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-white p-5 shadow-soft sm:p-6">
        <p className="section-kicker">Seller Dashboard</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-ink">
          Manage {currentUser.name}'s listings
        </h1>
        <p className="mt-3 max-w-3xl text-base text-steel">
          Watch offer flow, bump active items, track views, and keep a draft ready when
          you are still researching printings and condition photos.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] bg-slate-50 p-5">
            <Tag className="text-orange" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-steel">
              Active listings
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
              {formatNumber(activeCount)}
            </p>
          </div>
          <div className="rounded-[24px] bg-slate-50 p-5">
            <Eye className="text-navy" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-steel">
              Total views
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
              {formatNumber(totalViews)}
            </p>
          </div>
          <div className="rounded-[24px] bg-slate-50 p-5">
            <BarChart3 className="text-navy" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-steel">
              Active offers
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
              {formatNumber(totalOffers)}
            </p>
          </div>
          <div className="rounded-[24px] bg-slate-50 p-5">
            <FileText className="text-orange" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-steel">
              Draft status
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
              {currentUserDrafts.length ? currentUserDrafts.length : "Empty"}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-steel"
            to={`/seller/${currentUser.id}`}
          >
            View my seller page
          </Link>
          <button
            className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white"
            type="button"
            onClick={() => openCreateListing({ type: "WTS" })}
          >
            New listing
          </button>
        </div>
      </section>

      {currentUserDrafts.length ? (
        <section className="rounded-[32px] bg-white p-5 shadow-soft sm:p-6">
          <p className="section-kicker">Drafts</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
            Saved listing drafts
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {currentUserDrafts.map((draft) => {
              const isActive = listingDraft?.id === draft.id;
              return (
                <div
                  key={draft.id}
                  className={`rounded-[24px] border p-5 ${
                    isActive ? "border-navy bg-navy/5" : "border-slate-200 bg-[#fbf8f1]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{draft.title || draft.name || "Untitled draft"}</p>
                      <p className="mt-2 text-sm text-steel">
                        {draft.game || "Game not set"} | {draft.neighborhood || "Neighborhood not set"}
                      </p>
                    </div>
                    {isActive ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-navy">
                        Active
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-steel">
                    {draft.description || "Draft has no description yet."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-steel"
                      type="button"
                      onClick={() => {
                        selectListingDraft(draft.id);
                        openCreateListing();
                      }}
                    >
                      Open draft
                    </button>
                    <button
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                      type="button"
                      onClick={() => selectListingDraft(draft.id)}
                    >
                      Set active
                    </button>
                    <button
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                      type="button"
                      onClick={() => clearListingDraft(draft.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-[32px] bg-white p-5 shadow-soft sm:p-6">
        <p className="section-kicker">Offer queue</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
          Incoming offers
        </h2>
        <div className="mt-5 space-y-3">
          {sellerOffers.length ? (
            sellerOffers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-[24px] border border-slate-200 bg-[#fbf8f1] p-4"
              >
                {(() => {
                  const counterDraft = counterDrafts[offer.id];
                  return (
                    <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">
                      {formatOfferTypeLabel(offer.offerType)}
                      {offer.cashAmount
                        ? ` | ${formatCadPrice(offer.cashAmount, "CAD")}`
                        : ""}
                    </p>
                    {offer.tradeItems.length ? (
                      <p className="mt-2 text-sm text-steel">
                        Trade: {offer.tradeItems.join(", ")}
                      </p>
                    ) : null}
                    {offer.note ? (
                      <p className="mt-2 text-sm leading-7 text-steel">{offer.note}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {offer.status}
                  </span>
                </div>
                {offer.status === "pending" ? (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                        type="button"
                        onClick={() => respondToOffer(offer.id, "accept")}
                      >
                        Accept
                      </button>
                      <button
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                        type="button"
                        onClick={() => respondToOffer(offer.id, "decline")}
                      >
                        Decline
                      </button>
                      <button
                        className="rounded-full border border-navy bg-navy/5 px-4 py-2 text-sm font-semibold text-navy"
                        type="button"
                        onClick={() => beginCounterDraft(offer)}
                      >
                        Counter
                      </button>
                    </div>

                    {counterDraft ? (
                      <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-steel">
                              Counter type
                            </span>
                            <select
                              className="w-full rounded-[18px] border border-slate-200 bg-[#fbf8f1] px-4 py-3 text-sm outline-none transition focus:border-navy"
                              value={counterDraft.offerType}
                              onChange={(event) =>
                                setCounterDrafts((current) => ({
                                  ...current,
                                  [offer.id]: {
                                    ...current[offer.id],
                                    offerType: event.target.value,
                                  },
                                }))
                              }
                            >
                              <option value="cash">Cash</option>
                              <option value="trade">Trade</option>
                              <option value="cash-trade">Cash + Trade</option>
                            </select>
                          </label>

                          {counterDraft.offerType !== "trade" ? (
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-steel">
                                Counter amount (CAD)
                              </span>
                              <input
                                min="0"
                                step="0.01"
                                className="w-full rounded-[18px] border border-slate-200 bg-[#fbf8f1] px-4 py-3 text-sm outline-none transition focus:border-navy"
                                type="number"
                                value={counterDraft.cashAmount}
                                onChange={(event) =>
                                  setCounterDrafts((current) => ({
                                    ...current,
                                    [offer.id]: {
                                      ...current[offer.id],
                                      cashAmount: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </label>
                          ) : null}

                          {counterDraft.offerType !== "cash" ? (
                            <label className="block md:col-span-2">
                              <span className="mb-2 block text-sm font-semibold text-steel">
                                Trade items
                              </span>
                              <textarea
                                className="min-h-24 w-full rounded-[18px] border border-slate-200 bg-[#fbf8f1] px-4 py-3 text-sm outline-none transition focus:border-navy"
                                value={counterDraft.tradeItems}
                                onChange={(event) =>
                                  setCounterDrafts((current) => ({
                                    ...current,
                                    [offer.id]: {
                                      ...current[offer.id],
                                      tradeItems: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </label>
                          ) : null}

                          <label className="block md:col-span-2">
                            <span className="mb-2 block text-sm font-semibold text-steel">
                              Counter note
                            </span>
                            <textarea
                              className="min-h-24 w-full rounded-[18px] border border-slate-200 bg-[#fbf8f1] px-4 py-3 text-sm outline-none transition focus:border-navy"
                              value={counterDraft.note}
                              onChange={(event) =>
                                setCounterDrafts((current) => ({
                                  ...current,
                                  [offer.id]: {
                                    ...current[offer.id],
                                    note: event.target.value,
                                  },
                                }))
                              }
                            />
                          </label>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
                            type="button"
                            onClick={() =>
                              void respondToOffer(offer.id, "counter", {
                                offerType: counterDraft.offerType,
                                cashAmount:
                                  counterDraft.offerType === "trade"
                                    ? 0
                                    : Number(counterDraft.cashAmount || 0),
                                tradeItems:
                                  counterDraft.offerType === "cash"
                                    ? []
                                    : counterDraft.tradeItems
                                        .split("\n")
                                        .map((item) => item.trim())
                                        .filter(Boolean),
                                note: counterDraft.note,
                              }).then((result) => {
                                if (result?.ok) {
                                  clearCounterDraft(offer.id);
                                }
                              })
                            }
                          >
                            Send counter
                          </button>
                          <button
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                            type="button"
                            onClick={() => clearCounterDraft(offer.id)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
                    </>
                  );
                })()}
              </div>
            ))
          ) : (
            <p className="text-sm leading-7 text-steel">No incoming offers yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        {currentUserListings.map((listing) => (
          <article
            key={listing.id}
            className={`rounded-[30px] bg-white p-5 shadow-soft transition ${
              listing.status === "sold" ? "opacity-60" : ""
            }`}
          >
            <div className="grid gap-5 xl:grid-cols-[auto_1fr_auto_auto] xl:items-center">
              <CardArtwork
                className="h-28 w-24 rounded-[20px] object-cover"
                game={listing.game}
                src={listing.imageUrl}
                title={listing.title}
              />

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
                    {listing.title}
                  </h2>
                  {listing.status === "sold" ? (
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                      Sold
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-steel">
                  {listing.game} | {listing.neighborhood} | {listing.timeAgo}
                </p>
                <p className="mt-3 text-base text-steel">{listing.description}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Price
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                    {formatCadPrice(listing.price, listing.priceCurrency)}
                  </p>
                </div>
                <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Views
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                    {listing.views}
                  </p>
                </div>
                <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Offers
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                    {listing.offers}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
                  type="button"
                  onClick={() =>
                    editingId === listing.id ? setEditingId("") : openEditor(listing)
                  }
                >
                  {editingId === listing.id ? "Close editor" : "Edit listing"}
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={listing.status === "sold"}
                  type="button"
                  onClick={() => bumpListing(listing.id)}
                >
                  <RefreshCcw size={16} />
                  Bump listing
                </button>
                <button
                  className="rounded-full bg-navy px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={listing.status === "sold"}
                  type="button"
                  onClick={() => markListingSold(listing.id)}
                >
                  Mark as sold
                </button>
              </div>
            </div>

            {editingId === listing.id ? (
              <div className="mt-5 grid gap-4 rounded-[24px] border border-slate-200 bg-[#fbf8f1] p-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-steel">Price</span>
                  <input
                    className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-navy"
                    type="number"
                    value={editForm.price}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, price: event.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-steel">Condition</span>
                  <select
                    className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-navy"
                    value={editForm.condition}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        condition: event.target.value,
                      }))
                    }
                  >
                    <option>NM</option>
                    <option>LP</option>
                    <option>MP</option>
                    <option>HP</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-steel">Quantity</span>
                  <input
                    min="1"
                    step="1"
                    type="number"
                    className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-navy"
                    value={editForm.quantity}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        quantity: Math.max(1, Number(event.target.value) || 1),
                      }))
                    }
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-steel">Description</span>
                  <textarea
                    className="min-h-24 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-navy"
                    value={editForm.description}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:justify-end">
                  <button
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                    type="button"
                    onClick={() => setEditingId("")}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-full bg-orange px-4 py-2 text-sm font-semibold text-white"
                    type="button"
                    onClick={() => {
                      editListing(listing.id, editForm);
                      setEditingId("");
                    }}
                  >
                    Save changes
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
