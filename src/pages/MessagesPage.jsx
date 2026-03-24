import {
  ArrowLeft,
  BellRing,
  ExternalLink,
  ImagePlus,
  Search,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CardArtwork from "../components/shared/CardArtwork";
import UserAvatar from "../components/shared/UserAvatar";
import EmptyState from "../components/ui/EmptyState";
import InlineSpinner from "../components/ui/InlineSpinner";
import PageSkeleton from "../components/ui/PageSkeleton";
import { useMarketplace } from "../hooks/useMarketplace";
import {
  getConditionClasses,
  getGameClasses,
  getListingTypeClasses,
} from "../utils/formatters";

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

  return type?.[0]?.toUpperCase() + type?.slice(1);
}

function formatOfferSummary(offer, formatCadPrice) {
  const parts = [formatOfferTypeLabel(offer.offerType)];

  if (offer.offerType !== "trade" && Number(offer.cashAmount) > 0) {
    parts.push(formatCadPrice(offer.cashAmount, "CAD"));
  }

  if (offer.offerType !== "cash" && Array.isArray(offer.tradeItems) && offer.tradeItems.length) {
    parts.push(`Trade: ${offer.tradeItems.join(", ")}`);
  }

  return parts.join(" | ");
}

function ThreadCard({ isActive, offerCount, onOpen, thread }) {
  return (
    <button
      className={`group w-full rounded-[26px] border px-4 py-4 text-left transition ${
        isActive
          ? "border-navy/15 bg-[linear-gradient(180deg,rgba(19,48,65,0.08),rgba(255,255,255,0.95))] shadow-soft"
          : "border-[rgba(203,220,231,0.8)] bg-white/90 hover:border-navy/20 hover:-translate-y-[1px] hover:shadow-soft"
      }`}
      type="button"
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          className="h-12 w-12 shrink-0 border border-white/80 text-sm font-bold shadow-sm"
          user={thread.otherParticipant || { name: thread.participantLabel || "Chat" }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-[1.1rem] font-semibold tracking-[-0.03em] text-ink">
                {thread.participantIds.length > 2
                  ? thread.participantLabel || `Support chat (${thread.participantIds.length})`
                  : thread.otherParticipant?.publicName || "Conversation"}
              </p>
              <p className="mt-1 truncate text-sm text-steel">
                {thread.listing?.title || "General thread"}
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-steel/80">
              {formatMessageTime(thread.updatedAt)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {thread.unreadCount ? (
              <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-orange px-2 text-[11px] font-semibold text-white">
                {thread.unreadCount}
              </span>
            ) : null}
            {offerCount ? (
              <span className="rounded-full bg-navy/8 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-navy">
                {offerCount} offer{offerCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {thread.listing?.game ? (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getGameClasses(thread.listing.game)}`}
              >
                {thread.listing.game}
              </span>
            ) : null}
          </div>

          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
            {thread.lastMessage?.body || "No messages yet. Start the conversation."}
          </p>
        </div>
      </div>
    </button>
  );
}

function ListingThreadCard({ formatCadPrice, listing, otherParticipant }) {
  if (!listing) {
    return null;
  }

  return (
    <div className="mx-4 mt-4 rounded-[28px] border border-[rgba(203,220,231,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(238,245,249,0.92))] p-4 shadow-soft sm:mx-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <CardArtwork
          className="h-24 w-20 shrink-0 rounded-[22px] object-cover sm:h-28 sm:w-24"
          game={listing.game}
          src={listing.primaryImage || listing.imageUrl}
          title={listing.title}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {listing.type ? (
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getListingTypeClasses(listing.type)}`}
              >
                {listing.type}
              </span>
            ) : null}
            {listing.condition ? (
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getConditionClasses(listing.condition)}`}
              >
                {listing.condition}
              </span>
            ) : null}
            {listing.game ? (
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getGameClasses(listing.game)}`}
              >
                {listing.game}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-display text-[1.35rem] font-semibold tracking-[-0.04em] text-ink">
                {listing.title}
              </p>
              <p className="mt-1 text-sm text-steel">
                {listing.neighborhood}
                {listing.postalCode ? ` | ${listing.postalCode}` : ""}
              </p>
              {otherParticipant ? (
                <Link
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-navy transition hover:text-orange"
                  to={`/seller/${otherParticipant.id}`}
                >
                  <UserAvatar
                    className="h-7 w-7 border border-white/80 text-[0.65rem] font-bold shadow-sm"
                    user={otherParticipant}
                  />
                  {otherParticipant.publicName || otherParticipant.name}
                </Link>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">
                {formatCadPrice(listing.price, listing.priceCurrency)}
              </span>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel transition hover:border-navy/20 hover:text-ink"
                to={`/listing/${listing.id}`}
              >
                Open listing
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OfferTimeline({
  counterDrafts,
  currentUserId,
  formatCadPrice,
  onAccept,
  onBeginCounter,
  onCancelCounter,
  onChangeCounterDraft,
  onDecline,
  onSendCounter,
  offers,
}) {
  if (!offers.length) {
    return null;
  }

  return (
    <div className="mx-4 mt-4 rounded-[28px] border border-[rgba(203,220,231,0.88)] bg-[linear-gradient(180deg,rgba(247,251,253,0.96),rgba(241,243,245,0.92))] p-4 shadow-soft sm:mx-6">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-steel">
        <BellRing size={14} />
        Offer timeline
      </div>
      <div className="grid gap-3">
        {offers.map((offer) => {
          const isSeller = offer.sellerId === currentUserId;
          const isBuyer = offer.buyerId === currentUserId;
          const lastActorId =
            offer.lastActorId || (offer.status === "pending" ? offer.buyerId : offer.sellerId);
          const canRespond =
            (offer.status === "pending" && isSeller) ||
            (offer.status === "countered" &&
              (isSeller || isBuyer) &&
              String(lastActorId) !== String(currentUserId));
          const counterDraft = counterDrafts[offer.id];

          return (
            <div
              key={offer.id}
              className="rounded-[22px] border border-[rgba(203,220,231,0.86)] bg-white/95 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {formatOfferSummary(offer, formatCadPrice)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-steel">
                    Updated {formatMessageTime(offer.updatedAt || offer.createdAt)}
                  </p>
                  {offer.note ? (
                    <p className="mt-2 text-sm leading-7 text-steel">{offer.note}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {offer.status}
                </span>
              </div>

              {canRespond ? (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      type="button"
                      onClick={() => void onAccept(offer.id)}
                    >
                      Accept
                    </button>
                    <button
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
                      type="button"
                      onClick={() => void onDecline(offer.id)}
                    >
                      Decline
                    </button>
                    <button
                      className="rounded-full border border-navy/20 bg-navy/5 px-4 py-2 text-sm font-semibold text-navy transition hover:border-navy/30 hover:bg-navy/10"
                      type="button"
                      onClick={() => onBeginCounter(offer)}
                    >
                      {offer.status === "countered" ? "Counter back" : "Counter"}
                    </button>
                  </div>

                  {counterDraft ? (
                    <div className="mt-4 rounded-[20px] border border-slate-200 bg-[#f9fcfe] p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-steel">
                            {isSeller ? "Counter type" : "Reply type"}
                          </span>
                          <select
                            className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy"
                            value={counterDraft.offerType}
                            onChange={(event) =>
                              onChangeCounterDraft(offer.id, "offerType", event.target.value)
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
                                onChangeCounterDraft(offer.id, "cashAmount", event.target.value)
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
                                onChangeCounterDraft(offer.id, "tradeItems", event.target.value)
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
                              onChangeCounterDraft(offer.id, "note", event.target.value)
                            }
                          />
                        </label>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#102a39]"
                          type="button"
                          onClick={() => void onSendCounter(offer.id, counterDraft)}
                        >
                          {offer.status === "countered" ? "Send reply counter" : "Send counter"}
                        </button>
                        <button
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
                          type="button"
                          onClick={() => onCancelCounter(offer.id)}
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
  );
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { threadId } = useParams();
  const {
    currentUserId,
    formatCadPrice,
    getThreadById,
    hideThreadForCurrentUser,
    loading,
    markThreadRead,
    offersByListingId,
    respondToOffer,
    sendMessage,
    threadsForCurrentUser,
  } = useMarketplace();
  const [draft, setDraft] = useState("");
  const [counterDrafts, setCounterDrafts] = useState({});
  const [deletingThread, setDeletingThread] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const [threadQuery, setThreadQuery] = useState("");
  const [threadFilter, setThreadFilter] = useState("all");
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const seenMessageKeysRef = useRef(new Set());
  const photoInputRef = useRef(null);
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
    if (!activeThread?.id) {
      seenMessageKeysRef.current = new Set();
      return;
    }

    seenMessageKeysRef.current = new Set(
      activeThread.messages.map((message) =>
        `${message.senderId}:${message.body}:${Math.floor(new Date(message.sentAt).getTime() / 1000)}`,
      ),
    );
  }, [activeThread?.id]);

  useEffect(() => {
    if (activeThread?.id) {
      void markThreadRead(activeThread.id);
    }
  }, [activeThread?.id, markThreadRead]);

  useEffect(
    () => () => {
      pendingPhotos.forEach((photo) => {
        if (photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      });
    },
    [pendingPhotos],
  );

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
        description="Start a conversation from any listing to keep pricing, meetup timing, and offer negotiation in one place."
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
    const files = pendingPhotos.map((item) => item.file);
    setSendError("");
    setSending(true);
    setDraft("");
    setPendingPhotos([]);
    const result = await sendMessage(activeThread.id, {
      text: messageBody,
      files,
    });
    if (!result?.ok) {
      setDraft(messageBody);
      setPendingPhotos((current) =>
        current.length
          ? current
          : files.map((file) => ({
              id: `${file.name}-${file.size}-${file.lastModified}`,
              file,
              previewUrl: URL.createObjectURL(file),
            })),
      );
      setSendError(result?.error || "Message could not be sent.");
      setSending(false);
      return;
    }
    setSending(false);
  }

  function handleDraftKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    if ((!draft.trim() && !pendingPhotos.length) || sending) {
      return;
    }

    void handleSubmit(event);
  }

  function handlePhotoSelection(event) {
    const files = Array.from(event.target.files || []).slice(0, 4);
    if (!files.length) {
      return;
    }

    const nextEntries = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingPhotos((current) => [...current, ...nextEntries].slice(0, 4));
    event.target.value = "";
  }

  function removePendingPhoto(photoId) {
    setPendingPhotos((current) => {
      const target = current.find((item) => item.id === photoId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.id !== photoId);
    });
  }

  async function handleDeleteThread() {
    if (!activeThread || deletingThread) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this chat on your side? The conversation will be hidden for you, but it will stay available for the other person.",
    );
    if (!confirmed) {
      return;
    }

    setDeletingThread(true);
    const result = await hideThreadForCurrentUser(activeThread.id);
    setDeletingThread(false);
    if (result?.ok) {
      navigate("/messages", { replace: true });
      return;
    }

    setSendError(result?.error || "Chat could not be deleted.");
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

  function updateCounterDraft(offerId, field, value) {
    setCounterDrafts((current) => ({
      ...current,
      [offerId]: {
        ...current[offerId],
        [field]: value,
      },
    }));
  }

  async function sendCounter(offerId, counterDraft) {
    const result = await respondToOffer(offerId, "counter", {
      offerType: counterDraft.offerType,
      cashAmount: counterDraft.offerType === "trade" ? 0 : Number(counterDraft.cashAmount || 0),
      tradeItems:
        counterDraft.offerType === "cash"
          ? []
          : counterDraft.tradeItems
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
      note: counterDraft.note,
    });

    if (result?.ok) {
      clearCounterDraft(offerId);
    }
  }

  return (
    <div className="grid gap-5 lg:h-[calc(100dvh-12.5rem)] lg:grid-cols-[23rem_minmax(0,1fr)]">
      <section
        className={`overflow-hidden rounded-[30px] border border-[rgba(203,220,231,0.9)] bg-[linear-gradient(180deg,rgba(251,253,255,0.96),rgba(241,243,245,0.9))] shadow-soft lg:h-full ${
          showMobileThread ? "hidden lg:block" : "block"
        }`}
      >
        <div className="border-b border-slate-200/80 px-5 py-5">
          <p className="section-kicker">Messages</p>
          <h1 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.04em] text-ink">
            Inbox
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-steel">
            Keep listings, offers, and meetup details together instead of scattered across DMs.
          </p>
          <div className="mt-4 rounded-[20px] border border-[rgba(203,220,231,0.88)] bg-white/88 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
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
                    : "border border-slate-200 bg-white text-steel hover:border-navy/20 hover:text-ink"
                }`}
                type="button"
                onClick={() => setThreadFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-4 lg:h-[calc(100%-9.75rem)]">
          {filteredThreads.length ? (
            <div className="space-y-3">
              {filteredThreads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  isActive={thread.id === threadId}
                  offerCount={(offersByListingId[thread.listingId] || []).length}
                  thread={thread}
                  onOpen={() => navigate(`/messages/${thread.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 px-5 py-10 text-sm text-steel">
              No inbox threads match this search.
            </div>
          )}
        </div>
      </section>

      <section
        className={`flex min-h-[calc(100dvh-10.5rem)] flex-col overflow-hidden rounded-[30px] border border-[rgba(203,220,231,0.9)] bg-[linear-gradient(180deg,rgba(251,253,255,0.97),rgba(241,243,245,0.92))] shadow-soft lg:h-full lg:min-h-0 ${
          !showMobileThread ? "hidden lg:flex" : "flex"
        }`}
      >
        {activeThread ? (
          <>
            <div className="border-b border-slate-200/80 px-4 py-5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <button
                    className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-steel lg:hidden"
                    type="button"
                    onClick={() => navigate("/messages")}
                  >
                    <ArrowLeft size={14} />
                    Back to inbox
                  </button>
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      className="h-12 w-12 border border-white/90 text-sm font-bold shadow-sm"
                      user={activeThread.otherParticipant || { name: activeThread.participantLabel }}
                    />
                    <div className="min-w-0">
                      <p className="section-kicker">Conversation</p>
                      <h2 className="mt-1 truncate font-display text-[1.75rem] font-semibold tracking-[-0.04em] text-ink">
                        {activeThread.participantIds.length > 2
                          ? activeThread.participantLabel || "Support / resolution chat"
                          : activeThread.otherParticipant?.publicName || "Conversation"}
                      </h2>
                      <p className="mt-1 text-sm text-steel">
                        {activeThread.listing?.title || "General thread"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  {activeThread.listing ? (
                    <Link
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel transition hover:border-navy/20 hover:text-ink"
                      to={`/listing/${activeThread.listing.id}`}
                    >
                      {formatCadPrice(
                        activeThread.listing.price,
                        activeThread.listing.priceCurrency,
                      )}
                      <ExternalLink size={14} />
                    </Link>
                  ) : null}
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={deletingThread}
                    type="button"
                    onClick={() => void handleDeleteThread()}
                  >
                    <Trash2 size={14} />
                    {deletingThread ? "Deleting..." : "Delete chat"}
                  </button>
                </div>
              </div>
            </div>

            <ListingThreadCard
              formatCadPrice={formatCadPrice}
              listing={activeThread.listing}
              otherParticipant={activeThread.otherParticipant}
            />

            <OfferTimeline
              counterDrafts={counterDrafts}
              currentUserId={currentUserId}
              formatCadPrice={formatCadPrice}
              offers={threadOffers}
              onAccept={(offerId) => respondToOffer(offerId, "accept")}
              onBeginCounter={beginCounterDraft}
              onCancelCounter={clearCounterDraft}
              onChangeCounterDraft={updateCounterDraft}
              onDecline={(offerId) => respondToOffer(offerId, "decline")}
              onSendCounter={sendCounter}
            />

            <div className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,55,55,0.07),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(17,39,56,0.08),transparent_24%)]" />
              <div className="pointer-events-none absolute inset-x-4 inset-y-5 rounded-[30px] border border-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.08))] sm:inset-x-6" />
              <div className="relative flex min-h-full flex-col justify-end gap-3">
                {activeThread.messages.map((message) => {
                  const mine = message.senderId === currentUserId;
                  const animationKey = `${message.senderId}:${message.body}:${Math.floor(
                    new Date(message.sentAt).getTime() / 1000,
                  )}`;
                  const shouldAnimate = !seenMessageKeysRef.current.has(animationKey);
                  if (shouldAnimate) {
                    seenMessageKeysRef.current.add(animationKey);
                  }
                  const isSystemSupportThread =
                    activeThread.participantIds.length > 2 &&
                    String(message.body || "").toLowerCase().startsWith("report ");

                  if (isSystemSupportThread) {
                    return (
                      <div
                        key={message.id}
                        className={`${shouldAnimate ? "message-pop" : ""} mx-auto w-full max-w-2xl`}
                      >
                        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
                          <p className="text-sm leading-7">{message.body}</p>
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700/80">
                            {formatMessageTime(message.sentAt)}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={message.id}
                      className={`${shouldAnimate ? "message-pop" : ""} flex items-end gap-3 ${
                        mine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!mine ? (
                        <UserAvatar
                          className="h-8 w-8 shrink-0 border border-white/80 text-[0.62rem] font-bold shadow-sm"
                          user={activeThread.otherParticipant || { name: activeThread.participantLabel }}
                        />
                      ) : null}
                      <div
                        className={`max-w-[min(44rem,88%)] rounded-[24px] px-4 py-3 shadow-[0_18px_34px_-28px_rgba(17,39,56,0.45)] ${
                          mine
                            ? "bg-[linear-gradient(180deg,#f03737,#d32d2d)] text-white"
                            : "border border-white/70 bg-white/92 text-ink"
                        }`}
                      >
                        {message.attachments?.length ? (
                          <div className={`grid gap-2 ${message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                            {message.attachments.map((attachment) => (
                              <a
                                key={attachment.id}
                                className="block overflow-hidden rounded-[18px] border border-white/10"
                                href={attachment.url}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <img
                                  alt={attachment.name || "Chat photo"}
                                  className="h-40 w-full object-cover"
                                  loading="lazy"
                                  src={attachment.url}
                                />
                              </a>
                            ))}
                          </div>
                        ) : null}
                        {message.text ? (
                          <p className={`${message.attachments?.length ? "mt-3" : ""} text-sm leading-7`}>
                            {message.text}
                          </p>
                        ) : (
                          !message.attachments?.length ? (
                            <p className="text-sm leading-7">{message.body}</p>
                          ) : null
                        )}
                        <p className={`mt-2 text-[11px] ${mine ? "text-white/70" : "text-steel"}`}>
                          {formatMessageTime(message.sentAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form
              className="border-t border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,246,249,0.94))] px-4 py-4 sm:px-6"
              onSubmit={handleSubmit}
            >
              <div className="rounded-[28px] border border-[rgba(203,220,231,0.92)] bg-white/96 p-3 shadow-soft">
                {pendingPhotos.length ? (
                  <div className="mb-3 flex flex-wrap gap-2 px-1">
                    {pendingPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative h-20 w-20 overflow-hidden rounded-[16px] border border-slate-200 bg-[#f7f7f8]"
                      >
                        <img
                          alt={photo.file.name}
                          className="h-full w-full object-cover"
                          src={photo.previewUrl}
                        />
                        <button
                          aria-label="Remove photo"
                          className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                          type="button"
                          onClick={() => removePendingPhoto(photo.id)}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <textarea
                      className="min-h-[58px] w-full resize-none bg-transparent px-3 py-2 text-sm leading-7 outline-none"
                      disabled={sending}
                      placeholder="Write about condition, trades, meetup timing, or anything else you need to lock the deal in."
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={handleDraftKeyDown}
                    />
                  </div>
                  <input
                    ref={photoInputRef}
                    accept="image/*"
                    className="hidden"
                    multiple
                    type="file"
                    onChange={handlePhotoSelection}
                  />
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-steel transition hover:border-navy/20 hover:text-ink"
                    disabled={sending || pendingPhotos.length >= 4}
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <ImagePlus size={15} />
                    Photo
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-[1px] hover:shadow-lift disabled:cursor-not-allowed disabled:bg-slate-300 sm:self-auto"
                    disabled={sending || (!draft.trim() && !pendingPhotos.length)}
                    type="submit"
                  >
                    {sending ? <InlineSpinner className="text-white" size={14} /> : <SendHorizontal size={15} />}
                    {sending ? "Sending..." : "Send message"}
                  </button>
                </div>
              </div>
              {sendError ? <p className="mt-3 text-sm font-semibold text-rose-700">{sendError}</p> : null}
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

