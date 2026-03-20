import { BellRing, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";
import PageSkeleton from "../components/ui/PageSkeleton";
import { useMarketplace } from "../hooks/useMarketplace";

function formatMessageTime(isoString) {
  return new Date(isoString).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatOfferTypeLabel(type) {
  if (type === "cash-trade") {
    return "Cash + Trade";
  }

  return type[0].toUpperCase() + type.slice(1);
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { threadId } = useParams();
  const {
    currentUserId,
    formatCadPrice,
    getThreadById,
    loading,
    markThreadRead,
    offersByListingId,
    respondToOffer,
    sendMessage,
    threadsForCurrentUser,
  } = useMarketplace();
  const [draft, setDraft] = useState("");
  const [counterDrafts, setCounterDrafts] = useState({});
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const [threadQuery, setThreadQuery] = useState("");
  const [threadFilter, setThreadFilter] = useState("all");
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktopState = () => setIsDesktop(mediaQuery.matches);
    syncDesktopState();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncDesktopState);
      return () => mediaQuery.removeEventListener("change", syncDesktopState);
    }

    mediaQuery.addListener(syncDesktopState);
    return () => mediaQuery.removeListener(syncDesktopState);
  }, []);

  const filteredThreads = useMemo(() => {
    const normalizedQuery = threadQuery.trim().toLowerCase();

    return threadsForCurrentUser.filter((thread) => {
      if (threadFilter === "unread" && !thread.unreadCount) {
        return false;
      }

      if (threadFilter === "offers") {
        const threadOffers = offersByListingId[thread.listingId] || [];
        if (!threadOffers.length) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        thread.otherParticipant?.publicName,
        thread.otherParticipant?.name,
        thread.listing?.title,
        thread.lastMessage?.body,
        thread.participantLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [offersByListingId, threadFilter, threadQuery, threadsForCurrentUser]);

  useEffect(() => {
    if (isDesktop && !threadId && filteredThreads[0]) {
      navigate(`/messages/${filteredThreads[0].id}`, { replace: true });
    }
  }, [filteredThreads, isDesktop, navigate, threadId]);

  const activeThread = useMemo(() => getThreadById(threadId) || null, [getThreadById, threadId]);
  const showMobileThread = Boolean(threadId && activeThread);

  useEffect(() => {
    if (activeThread?.id) {
      void markThreadRead(activeThread.id);
    }
  }, [activeThread?.id, markThreadRead]);

  const threadOffers = useMemo(() => {
    if (!activeThread?.listingId) {
      return [];
    }

    return (offersByListingId[activeThread.listingId] || [])
      .filter(
        (offer) =>
          activeThread.participantIds.includes(offer.buyerId) &&
          activeThread.participantIds.includes(offer.sellerId),
      )
      .sort(
        (left, right) =>
          new Date(right.updatedAt || right.createdAt || 0).getTime() -
          new Date(left.updatedAt || left.createdAt || 0).getTime(),
      );
  }, [activeThread, offersByListingId]);

  if (loading && !threadsForCurrentUser.length) {
    return <PageSkeleton cards={2} rows={1} titleWidth="w-48" />;
  }

  if (!threadsForCurrentUser.length) {
    return (
      <EmptyState
        description="Start a conversation from any listing to keep negotiation, meetup planning, and follow-up in one place."
        title="No messages yet"
      />
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!activeThread || sending) {
      return;
    }

    const messageBody = draft;
    setSendError("");
    setSending(true);
    setDraft("");
    const result = await sendMessage(activeThread.id, messageBody);
    if (!result?.ok) {
      setDraft(messageBody);
      setSendError(result?.error || "Message could not be sent.");
      setSending(false);
      return;
    }
    setSending(false);
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
    <div className="grid gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <section
        className={`overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-soft lg:rounded-[30px] ${
          showMobileThread ? "hidden lg:block" : "block"
        }`}
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="section-kicker">Messages</p>
          <h1 className="mt-2 font-display text-[2.2rem] font-semibold tracking-[-0.04em] text-ink">
            Inbox
          </h1>
          <div className="mt-4 rounded-[18px] border border-slate-200 bg-[#f8f5ee] px-4 py-3">
            <div className="flex items-center gap-3">
              <Search size={16} className="text-steel" />
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Seller, listing, or message"
                value={threadQuery}
                onChange={(event) => setThreadQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "offers", label: "Offers" },
            ].map((filter) => (
              <button
                key={filter.id}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  threadFilter === filter.id
                    ? "bg-navy text-white"
                    : "border border-slate-200 bg-white text-steel hover:border-slate-300 hover:text-ink"
                }`}
                type="button"
                onClick={() => setThreadFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[calc(100dvh-16rem)] overflow-y-auto lg:max-h-[72vh]">
          {filteredThreads.length ? (
            filteredThreads.map((thread) => {
              const offerCount = (offersByListingId[thread.listingId] || []).length;

              return (
                <button
                  key={thread.id}
                  className={`w-full border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 ${
                    thread.id === threadId ? "bg-[#faf7f1]" : ""
                  }`}
                  type="button"
                  onClick={() => navigate(`/messages/${thread.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-xl font-semibold tracking-[-0.03em] text-ink">
                        {thread.participantIds.length > 2
                          ? thread.participantLabel || `Support chat (${thread.participantIds.length} people)`
                          : thread.otherParticipant?.publicName || "Conversation"}
                      </p>
                      <p className="mt-1 truncate text-sm text-steel">
                        {thread.listing?.title || "General thread"}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-steel">
                      {formatMessageTime(thread.updatedAt)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {thread.unreadCount ? (
                      <span className="inline-flex rounded-full bg-orange px-2 py-0.5 text-xs font-semibold text-white">
                        {thread.unreadCount} unread
                      </span>
                    ) : null}
                    {offerCount ? (
                      <span className="rounded-full bg-navy/8 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-navy">
                        {offerCount} offer{offerCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                    {thread.lastMessage?.body || "No messages yet. Start the conversation."}
                  </p>
                </button>
              );
            })
          ) : (
            <div className="px-5 py-10 text-sm text-steel">
              No inbox threads match this search.
            </div>
          )}
        </div>
      </section>

      <section
        className={`overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-soft lg:rounded-[30px] ${
          !showMobileThread ? "hidden lg:block" : "block"
        }`}
      >
        {activeThread ? (
          <>
            <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <button
                    className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-steel lg:hidden"
                    type="button"
                    onClick={() => navigate("/messages")}
                  >
                    Back to inbox
                  </button>
                  <p className="section-kicker">Conversation</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                    {activeThread.participantIds.length > 2
                      ? activeThread.participantLabel || "Support / resolution chat"
                      : activeThread.otherParticipant?.publicName || "Conversation"}
                  </h2>
                  <p className="mt-2 text-sm text-steel">
                    {activeThread.listing?.title || "General thread"}
                  </p>
                </div>

                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  {activeThread.otherParticipant && activeThread.participantIds.length === 2 ? (
                    <Link
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
                      to={`/seller/${activeThread.otherParticipant.id}`}
                    >
                      View seller page
                    </Link>
                  ) : null}
                  {activeThread.listing ? (
                    <Link
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
                      to={`/listing/${activeThread.listing.id}`}
                    >
                      {formatCadPrice(
                        activeThread.listing.price,
                        activeThread.listing.priceCurrency,
                      )}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            {threadOffers.length ? (
              <div className="border-b border-slate-200 bg-[#fbf8f1] px-4 py-4 sm:px-6 sm:py-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-steel">
                  <BellRing size={14} />
                  Offer timeline
                </div>
                <div className="grid gap-3">
                  {threadOffers.map((offer) => {
                    const isSeller = offer.sellerId === currentUserId;
                    const isBuyer = offer.buyerId === currentUserId;
                    const lastActorId =
                      offer.lastActorId ||
                      (offer.status === "pending" ? offer.buyerId : offer.sellerId);
                    const canRespond =
                      (offer.status === "pending" && isSeller) ||
                      (offer.status === "countered" &&
                        (isSeller || isBuyer) &&
                        String(lastActorId) !== String(currentUserId));
                    const counterDraft = counterDrafts[offer.id];
                    return (
                      <div
                        key={offer.id}
                        className="rounded-[22px] border border-slate-200 bg-white px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">
                              {formatOfferTypeLabel(offer.offerType)}
                              {offer.cashAmount
                                ? ` | ${formatCadPrice(offer.cashAmount, "CAD")}`
                                : ""}
                            </p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-steel">
                              Updated {formatMessageTime(offer.updatedAt || offer.createdAt)}
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
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                            {offer.status}
                          </span>
                        </div>
                        {canRespond ? (
                          <>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                                type="button"
                                onClick={() => void respondToOffer(offer.id, "accept")}
                              >
                                Accept
                              </button>
                              <button
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                                type="button"
                                onClick={() => void respondToOffer(offer.id, "decline")}
                              >
                                Decline
                              </button>
                              <button
                                className="rounded-full border border-navy bg-navy/5 px-4 py-2 text-sm font-semibold text-navy"
                                type="button"
                                onClick={() => beginCounterDraft(offer)}
                              >
                                {offer.status === "countered" ? "Counter back" : "Counter"}
                              </button>
                            </div>

                            {counterDraft ? (
                              <div className="mt-4 rounded-[20px] border border-slate-200 bg-[#fbf8f1] p-4">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-steel">
                                      {isSeller ? "Counter type" : "Reply type"}
                                    </span>
                                    <select
                                      className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy"
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
                                        {isSeller ? "Counter amount (CAD)" : "Reply amount (CAD)"}
                                      </span>
                                      <input
                                        min="0"
                                        step="0.01"
                                        className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy"
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
                                        className="min-h-24 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy"
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
                                      {isSeller ? "Counter note" : "Reply note"}
                                    </span>
                                    <textarea
                                      className="min-h-24 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy"
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
                                    {offer.status === "countered" ? "Send reply counter" : "Send counter"}
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
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex max-h-[calc(100dvh-22rem)] flex-col gap-3 overflow-y-auto bg-[#fcfaf4] px-4 py-4 sm:max-h-[50vh] sm:px-6 sm:py-5">
              {activeThread.messages.map((message) => {
                const mine = message.senderId === currentUserId;
                const isSystemSupportThread =
                  activeThread.participantIds.length > 2 &&
                  String(message.body || "").toLowerCase().startsWith("report ");

                return (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-[22px] px-4 py-3 ${
                      isSystemSupportThread
                        ? "mx-auto w-full max-w-full border border-amber-200 bg-amber-50 text-amber-900"
                        : mine
                          ? "ml-auto bg-navy text-white"
                          : "border border-slate-200 bg-white text-ink"
                    }`}
                  >
                    <p className="text-sm leading-7">{message.body}</p>
                    <p
                      className={`mt-2 text-xs ${
                        mine ? "text-white/70" : "text-slate-500"
                      }`}
                    >
                      {formatMessageTime(message.sentAt)}
                    </p>
                  </div>
                );
              })}
            </div>

            <form className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="Write a message about condition, trades, or meetup timing"
                  disabled={sending}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button
                  className="rounded-full bg-orange px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 sm:self-auto"
                  disabled={sending || !draft.trim()}
                  type="submit"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
              {sendError ? (
                <p className="mt-3 text-sm font-semibold text-rose-700">{sendError}</p>
              ) : null}
            </form>
          </>
        ) : (
          <div className="flex h-full items-center justify-center px-6 py-16 text-center text-steel">
            Select a thread from the inbox.
          </div>
        )}
      </section>
    </div>
  );
}
