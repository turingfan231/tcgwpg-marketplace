import {
  ArrowLeft,
  BellRing,
  ChevronDown,
  ExternalLink,
  ImagePlus,
  Search,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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

function ThreadCard({ formatCadPrice, isActive, offerCount, onOpen, thread }) {
  return (
    <button
      className={`group w-full rounded-[20px] border px-3 py-3 text-left transition sm:rounded-[26px] sm:px-4 sm:py-4 ${
        isActive
          ? "border-navy/15 bg-[linear-gradient(180deg,rgba(19,48,65,0.08),rgba(255,255,255,0.98))] shadow-soft"
          : "border-[rgba(203,220,231,0.72)] bg-white/92 hover:border-navy/20 hover:-translate-y-[1px] hover:shadow-soft"
      }`}
      type="button"
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          className="h-11 w-11 shrink-0 border border-white/80 text-[0.78rem] font-bold shadow-sm sm:h-12 sm:w-12 sm:text-sm"
          user={thread.otherParticipant || { name: thread.participantLabel || "Chat" }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-[1rem] font-semibold tracking-[-0.03em] text-ink sm:text-[1.1rem]">
                {thread.participantIds.length > 2
                  ? thread.participantLabel || `Support chat (${thread.participantIds.length})`
                  : thread.otherParticipant?.publicName || "Conversation"}
              </p>
              <p className="mt-0.5 truncate text-[0.82rem] text-steel sm:mt-1 sm:text-sm">
                {thread.listing?.title || "General thread"}
              </p>
            </div>
            <span className="shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-steel/80 sm:text-[11px] sm:tracking-[0.14em]">
              {formatMessageTime(thread.updatedAt)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2">
            {thread.unreadCount ? (
              <span className="inline-flex h-5 min-w-[1.2rem] items-center justify-center rounded-full bg-orange px-1.5 text-[10px] font-semibold text-white sm:h-6 sm:min-w-[1.5rem] sm:px-2 sm:text-[11px]">
                {thread.unreadCount}
              </span>
            ) : null}
            {offerCount ? (
              <span className="rounded-full bg-navy/8 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy sm:px-2.5 sm:text-[11px] sm:tracking-[0.16em]">
                {offerCount} offer{offerCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {thread.listing?.game ? (
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:px-2.5 sm:text-[11px] sm:tracking-[0.16em] ${getGameClasses(thread.listing.game)}`}
              >
                {thread.listing.game}
              </span>
            ) : null}
          </div>

          <div className="mt-2.5 flex items-start gap-3 sm:mt-3">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[0.86rem] leading-5 text-slate-600 sm:text-sm sm:leading-6">
                {thread.lastMessage?.body || "No messages yet. Start the conversation."}
              </p>
              {thread.listing?.price ? (
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-steel/80">
                  Asking {formatCadPrice(thread.listing.price, thread.listing.priceCurrency)}
                </p>
              ) : null}
            </div>
            {thread.listing ? (
              <CardArtwork
                className="h-14 w-12 shrink-0 rounded-[14px] object-cover shadow-sm sm:h-16 sm:w-14 sm:rounded-[16px]"
                game={thread.listing.game}
                src={thread.listing.primaryImage || thread.listing.imageUrl}
                title={thread.listing.title}
              />
            ) : null}
          </div>
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
    <div className="mx-4 mt-4 rounded-[28px] border border-[rgba(177,29,35,0.16)] bg-[linear-gradient(180deg,rgba(255,248,248,0.98),rgba(249,240,240,0.94))] p-4 shadow-soft sm:mx-6">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-steel">
        <BellRing size={14} />
        Deal flow
      </div>
      <p className="mb-4 max-w-3xl text-sm leading-7 text-steel">
        Offers stay pinned above the normal conversation so countering, accepting, and meetup details do not get buried in chat.
      </p>
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
                      className="rounded-full bg-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d8332d]"
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
  const location = useLocation();
  const navigate = useNavigate();
  const { threadId } = useParams();
  const {
    authReady,
    currentUserId,
    formatCadPrice,
    getThreadById,
    hideThreadForCurrentUser,
    isAuthenticated,
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
  const [mobileDetailPanel, setMobileDetailPanel] = useState(null);
  const [desktopDetailPanels, setDesktopDetailPanels] = useState({
    listing: false,
    offers: false,
  });
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const seenMessageKeysRef = useRef(new Set());
  const messagesScrollRef = useRef(null);
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
  const immersiveMobileThread = !isDesktop && /^\/messages\/[^/]+/.test(location.pathname);

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

  useEffect(() => {
    setMobileDetailPanel(null);
    setDesktopDetailPanels({ listing: false, offers: false });
  }, [threadId]);

  useEffect(() => {
    if (!activeThread?.id || !messagesScrollRef.current) {
      return;
    }

    const target = messagesScrollRef.current;
    const frame = window.requestAnimationFrame(() => {
      target.scrollTop = target.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeThread?.id, activeThread?.messages?.length]);

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

  const quickReplies = useMemo(() => {
    if (!activeThread) {
      return [];
    }

    const meetupLabel = activeThread.listing?.neighborhood
      ? `I can meet in ${activeThread.listing.neighborhood}.`
      : "I can meet this week.";

    return [
      "Still available?",
      "Can you send a couple more photos?",
      meetupLabel,
      "Would you take an offer on this?",
      "What condition issues should I know about?",
      "I can confirm today if timing works.",
    ];
  }, [activeThread]);

  const shouldShowQuickReplies = Boolean(activeThread) && activeThread.messages.length <= 1;

  const showListingPanel =
    Boolean(activeThread?.listing) &&
    (isDesktop ? desktopDetailPanels.listing : mobileDetailPanel === "listing");
  const showOfferPanel =
    Boolean(threadOffers.length) &&
    (isDesktop ? desktopDetailPanels.offers : mobileDetailPanel === "offers");
  const shouldShowLoading = !authReady || (loading && isAuthenticated);

  if (shouldShowLoading && !threadsForCurrentUser.length) {
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
    <div className="grid gap-4 overflow-hidden overscroll-none lg:h-[calc(100dvh-12.5rem)] lg:grid-cols-[23rem_minmax(0,1fr)]">
      <section
        className={`min-h-[calc(100dvh-9.1rem)] overflow-hidden rounded-none border-0 bg-transparent shadow-none sm:rounded-[30px] sm:border sm:border-[rgba(203,220,231,0.9)] sm:bg-[linear-gradient(180deg,rgba(251,253,255,0.96),rgba(241,243,245,0.9))] sm:shadow-soft lg:h-full lg:min-h-0 ${
          showMobileThread ? "hidden lg:block" : "block"
        }`}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-[rgba(247,242,242,0.92)] px-2 pb-3 pt-1 backdrop-blur-xl sm:static sm:bg-transparent sm:px-5 sm:py-5">
          <p className="section-kicker hidden sm:block">Messages</p>
          <h1 className="mt-1 font-display text-[1.45rem] font-semibold tracking-[-0.04em] text-ink sm:mt-2 sm:text-[2rem]">
            Inbox
          </h1>
          <p className="mt-1 max-w-sm text-[0.86rem] leading-5 text-steel sm:mt-2 sm:text-sm sm:leading-6">
            Keep listings, offers, and meetup details together instead of scattered across DMs.
          </p>
          <div className="mt-3 rounded-[18px] border border-[rgba(203,220,231,0.88)] bg-white/96 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:mt-4 sm:rounded-[20px]">
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
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "offers", label: "Offers" },
            ].map((filter) => (
              <button
                key={filter.id}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition sm:px-4 ${
                  threadFilter === filter.id
                    ? "bg-navy text-white shadow-sm"
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

        <div className="overflow-y-auto px-0 py-2 sm:px-4 sm:py-4 lg:h-[calc(100%-9.75rem)]">
          {filteredThreads.length ? (
            <div className="space-y-2.5 sm:space-y-3">
              {filteredThreads.map((thread) => (
                <ThreadCard
                  formatCadPrice={formatCadPrice}
                  key={thread.id}
                  isActive={thread.id === threadId}
                  offerCount={(offersByListingId[thread.listingId] || []).length}
                  thread={thread}
                  onOpen={() => navigate(`/messages/${thread.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="mx-1 rounded-[20px] border border-dashed border-slate-300 bg-white/80 px-5 py-10 text-sm text-steel sm:mx-0 sm:rounded-[24px]">
              No inbox threads match this search.
            </div>
          )}
        </div>
      </section>

      <section
        className={`flex ${immersiveMobileThread ? "h-[100dvh] rounded-none border-0 shadow-none" : "h-[calc(100dvh-8.6rem)] rounded-[22px] border border-[rgba(203,220,231,0.9)] shadow-soft"} flex-col overflow-hidden overscroll-none bg-[linear-gradient(180deg,rgba(251,253,255,0.97),rgba(241,243,245,0.92))] sm:rounded-[30px] sm:min-h-[calc(100dvh-9.6rem)] sm:h-auto lg:h-full lg:min-h-0 ${
          !showMobileThread ? "hidden lg:flex" : "flex"
        }`}
      >
        {activeThread ? (
          <>
            <div className="border-b border-slate-200/80 px-3 py-2.5 sm:px-6 sm:py-4">
              <div className="hidden flex-wrap items-start justify-between gap-4 sm:flex">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      className="h-12 w-12 border border-white/90 text-sm font-bold shadow-sm"
                      user={activeThread.otherParticipant || { name: activeThread.participantLabel }}
                    />
                    <div className="min-w-0">
                      <p className="section-kicker">Conversation</p>
                      <h2 className="mt-1 truncate font-display text-[1.18rem] font-semibold tracking-[-0.04em] text-ink sm:text-[1.45rem]">
                        {activeThread.participantIds.length > 2
                          ? activeThread.participantLabel || "Support / resolution chat"
                          : activeThread.otherParticipant?.publicName || "Conversation"}
                      </h2>
                      <p className="mt-0.5 text-[0.8rem] text-steel sm:mt-1 sm:text-sm">
                        {activeThread.listing?.title || "General thread"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3.5 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={deletingThread}
                    type="button"
                    onClick={() => void handleDeleteThread()}
                  >
                    <Trash2 size={14} />
                    {deletingThread ? "Deleting..." : "Delete chat"}
                  </button>
                </div>
              </div>

              <div className="sm:hidden">
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-steel"
                    type="button"
                    onClick={() => navigate("/messages")}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <UserAvatar
                    className="h-10 w-10 shrink-0 border border-white/90 text-[0.76rem] font-bold shadow-sm"
                    user={activeThread.otherParticipant || { name: activeThread.participantLabel }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[1.05rem] font-semibold tracking-[-0.04em] text-ink">
                      {activeThread.participantIds.length > 2
                        ? activeThread.participantLabel || "Support / resolution chat"
                        : activeThread.otherParticipant?.publicName || "Conversation"}
                    </p>
                    <p className="truncate text-[0.8rem] text-steel">
                      {activeThread.listing?.title || "General thread"}
                    </p>
                  </div>
                  {activeThread.listing ? (
                    <Link
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-steel"
                      to={`/listing/${activeThread.listing.id}`}
                    >
                      Open
                      <ExternalLink size={12} />
                    </Link>
                  ) : null}
                  <button
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={deletingThread}
                    type="button"
                    onClick={() => void handleDeleteThread()}
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>

                {threadOffers.length ? (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                        mobileDetailPanel === "offers"
                          ? "border-navy/20 bg-navy text-white"
                          : "border-slate-200 bg-white text-steel"
                      }`}
                      type="button"
                      onClick={() =>
                        setMobileDetailPanel((current) => (current === "offers" ? null : "offers"))
                      }
                    >
                      Deal flow
                      <span
                        className={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                          mobileDetailPanel === "offers" ? "bg-white/20 text-white" : "bg-navy/10 text-navy"
                        }`}
                      >
                        {threadOffers.length}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`transition ${mobileDetailPanel === "offers" ? "rotate-180" : ""}`}
                      />
                    </button>
                    <span className="truncate text-[0.72rem] uppercase tracking-[0.12em] text-steel/80">
                      {activeThread.listing?.price
                        ? formatCadPrice(activeThread.listing.price, activeThread.listing.priceCurrency)
                        : activeThread.listing?.game || "Conversation"}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {isDesktop ? (
              <div className="border-b border-slate-200/70 bg-white/55 px-6 py-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  {activeThread.listing ? (
                    <>
                      <button
                        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                          desktopDetailPanels.listing
                            ? "border-navy/20 bg-navy text-white"
                            : "border-slate-200 bg-white text-steel hover:border-navy/20 hover:text-ink"
                        }`}
                        type="button"
                        onClick={() =>
                          setDesktopDetailPanels((current) => ({
                            ...current,
                            listing: !current.listing,
                          }))
                        }
                      >
                        Listing
                        <ChevronDown
                          size={14}
                          className={`transition ${desktopDetailPanels.listing ? "rotate-180" : ""}`}
                        />
                      </button>
                      <Link
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-steel transition hover:border-navy/20 hover:text-ink"
                        to={`/listing/${activeThread.listing.id}`}
                      >
                        {formatCadPrice(
                          activeThread.listing.price,
                          activeThread.listing.priceCurrency,
                        )}
                        <ExternalLink size={14} />
                      </Link>
                    </>
                  ) : null}
                  {threadOffers.length ? (
                    <button
                      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                        desktopDetailPanels.offers
                          ? "border-navy/20 bg-navy text-white"
                          : "border-slate-200 bg-white text-steel hover:border-navy/20 hover:text-ink"
                      }`}
                      type="button"
                      onClick={() =>
                        setDesktopDetailPanels((current) => ({
                          ...current,
                          offers: !current.offers,
                        }))
                      }
                    >
                      Deal flow
                      <span
                        className={`inline-flex h-5 min-w-[1.2rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                          desktopDetailPanels.offers ? "bg-white/20 text-white" : "bg-navy/10 text-navy"
                        }`}
                      >
                        {threadOffers.length}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`transition ${desktopDetailPanels.offers ? "rotate-180" : ""}`}
                      />
                    </button>
                  ) : null}
                  <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.14em] text-steel/80">
                    {activeThread.messages.length} message{activeThread.messages.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            ) : null}

            {showListingPanel ? (
              <ListingThreadCard
                formatCadPrice={formatCadPrice}
                listing={activeThread.listing}
                otherParticipant={activeThread.otherParticipant}
              />
            ) : null}

            {showOfferPanel ? (
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
            ) : null}

            <div
              ref={messagesScrollRef}
              className="relative flex-1 overflow-y-auto overscroll-contain px-3 py-3 [touch-action:pan-y] sm:px-6 sm:py-5"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,55,55,0.07),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(17,39,56,0.08),transparent_24%)]" />
              <div className="pointer-events-none absolute inset-x-3 inset-y-4 rounded-[22px] border border-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.08))] sm:inset-x-6 sm:inset-y-5 sm:rounded-[30px]" />
              <div className="relative flex min-h-full flex-col justify-end gap-2">
                <div className="mb-1 hidden items-center gap-3 px-1 pt-1 sm:flex">
                  <div className="h-px flex-1 bg-[rgba(177,29,35,0.12)]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-steel">
                    Conversation
                  </span>
                  <div className="h-px flex-1 bg-[rgba(177,29,35,0.12)]" />
                </div>
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
                        className={`max-w-[min(44rem,88%)] rounded-[20px] px-3 py-2.5 shadow-[0_18px_34px_-28px_rgba(17,39,56,0.45)] sm:rounded-[24px] sm:px-4 sm:py-3 ${
                          mine
                            ? "bg-[linear-gradient(180deg,#f03737,#d32d2d)] text-white"
                            : "border border-white/70 bg-white/92 text-ink"
                        }`}
                      >
                        {message.attachments?.length ? (
                          <div className={`grid gap-2 ${message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                            {message.attachments.map((attachment) => (
                              <button
                                key={attachment.id}
                                className="block overflow-hidden rounded-[18px] border border-white/10"
                                type="button"
                                onClick={() => setPreviewAttachment(attachment)}
                              >
                                <img
                                  alt={attachment.name || "Chat photo"}
                                  className="h-40 w-full object-cover"
                                  loading="lazy"
                                  src={attachment.url}
                                />
                              </button>
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
              className="border-t border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,246,249,0.94))] px-3 py-2 sm:px-6 sm:py-4"
              onSubmit={handleSubmit}
            >
              <div className="rounded-[18px] border border-[rgba(203,220,231,0.92)] bg-white/96 p-2 shadow-soft sm:rounded-[28px] sm:p-3">
                {shouldShowQuickReplies && quickReplies.length ? (
                  <div className="mb-3 flex flex-wrap gap-2 px-1">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply}
                        className="rounded-full border border-[rgba(177,29,35,0.12)] bg-[rgba(240,55,55,0.05)] px-3 py-2 text-xs font-semibold text-navy transition hover:border-[rgba(177,29,35,0.22)] hover:bg-[rgba(240,55,55,0.09)]"
                        type="button"
                        onClick={() =>
                          setDraft((current) => (current.trim() ? `${current.trim()} ${reply}` : reply))
                        }
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                ) : null}
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
                <div className="flex items-end gap-2">
                  <div className="flex-1 rounded-[16px] border border-slate-200 bg-[#fbfbfc] px-2.5 py-1.5">
                    <textarea
                      className="min-h-[40px] w-full resize-none bg-transparent px-0 py-1.5 text-sm leading-5 outline-none sm:min-h-[58px] sm:px-3 sm:leading-7"
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
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-steel transition hover:border-navy/20 hover:text-ink sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3 sm:text-sm sm:font-semibold"
                    disabled={sending || pendingPhotos.length >= 4}
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <ImagePlus size={15} />
                    <span className="hidden sm:inline">Photo</span>
                  </button>
                  <button
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange text-white shadow-soft transition hover:-translate-y-[1px] hover:shadow-lift disabled:cursor-not-allowed disabled:bg-slate-300 sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3 sm:text-sm sm:font-semibold sm:self-auto"
                    disabled={sending || (!draft.trim() && !pendingPhotos.length)}
                    type="submit"
                  >
                    {sending ? <InlineSpinner className="text-white" size={14} /> : <SendHorizontal size={15} />}
                    <span className="hidden sm:inline">{sending ? "Sending..." : "Send message"}</span>
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

      {previewAttachment ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/82 p-4 backdrop-blur-sm">
          <button
            aria-label="Close image preview"
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-white/10 text-white transition hover:bg-white/16"
            type="button"
            onClick={() => setPreviewAttachment(null)}
          >
            <X size={18} />
          </button>
          <div className="flex max-h-full w-full max-w-5xl flex-col gap-4">
            <div className="overflow-hidden rounded-[24px] border border-white/12 bg-black/30 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)]">
              <img
                alt={previewAttachment.name || "Chat photo"}
                className="max-h-[78vh] w-full object-contain"
                src={previewAttachment.url}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm text-white/78">
                {previewAttachment.name || "Chat photo"}
              </p>
              <a
                className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/16"
                href={previewAttachment.url}
                rel="noreferrer"
                target="_blank"
              >
                Open in new tab
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

