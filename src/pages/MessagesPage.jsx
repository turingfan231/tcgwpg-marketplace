import { Archive, ArrowLeft, Camera, Check, CheckCheck, MoreHorizontal, Search, SendHorizontal, ShieldCheck, Smile, Star, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import { compactTimeLabel, formatPrice, listingArtwork, listingHref, rememberAndNavigateToListing, sellerHref, sellerInitial, sellerLabel } from "../mobile/helpers";
import { BottomSheet, ChoicePill, EmptyBlock, Lightbox, MobileScreen, PrimaryButton, SecondaryButton, TextArea, TextField } from "../mobile/primitives";

const TABS = [
  { id: "all", label: "All" },
  { id: "buying", label: "Buying" },
  { id: "selling", label: "Selling" },
];

const fmtTime = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return compactTimeLabel(value);
  return parsed.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
};

const offerTone = (status) => {
  if (status === "accepted") return { label: "Accepted", color: m.success, bg: "rgba(52,211,153,0.1)" };
  if (status === "declined") return { label: "Declined", color: m.danger, bg: "rgba(248,113,113,0.1)" };
  if (status === "countered") return { label: "Countered", color: m.blue, bg: "rgba(96,165,250,0.1)" };
  return { label: "Offer Pending", color: m.warning, bg: "rgba(251,191,36,0.1)" };
};

const offerLabel = (type) => (type === "cash-trade" ? "Cash + Trade" : String(type || "offer").replace(/^\w/, (v) => v.toUpperCase()));
const threadRole = (thread, currentUserId) => (!thread?.listing ? "buying" : String(thread.listing.sellerId || "") === String(currentUserId || "") ? "selling" : "buying");
const canRespond = (offer, currentUserId) => {
  if (!offer || !currentUserId) return false;
  if (offer.status === "pending") return String(currentUserId) === String(offer.sellerId);
  if (offer.status === "countered") return String(currentUserId) !== String(offer.lastActorId || "");
  return false;
};

function ThreadRow({ thread, onClick }) {
  const participant = thread.otherParticipant || { name: thread.participantLabel };
  const badge = thread.offerBadge;

  return (
    <motion.button
      className="relative flex w-full items-start gap-3 px-4 py-3 text-left"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
      type="button"
      whileTap={{ scale: 0.985, backgroundColor: "rgba(255,255,255,0.02)" }}
      onClick={onClick}
    >
      {thread.unreadCount ? (
        <div
          className="absolute left-1.5 top-1/2 h-[5px] w-[5px] -translate-y-1/2 rounded-full"
          style={{ background: m.redLight, boxShadow: `0 0 6px ${m.redGlow}` }}
        />
      ) : null}
      <div className="relative shrink-0">
        {participant.avatarUrl ? (
          <img
            alt={sellerLabel(participant)}
            className="h-[42px] w-[42px] rounded-[13px] object-cover"
            src={participant.avatarUrl}
            style={{ border: `1px solid ${m.borderStrong}` }}
          />
        ) : (
          <div
            className="flex h-[42px] w-[42px] items-center justify-center rounded-[13px] text-[15px] text-white"
            style={{
              background: thread.unreadCount ? m.redGradient : "linear-gradient(135deg, #2c2c34, #1a1a20)",
              boxShadow: thread.unreadCount ? `0 2px 10px ${m.redGlow}` : "none",
              fontWeight: 700,
            }}
          >
            {sellerInitial(participant)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-[2px] flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p
                className="truncate text-[13.5px]"
                style={{ fontWeight: thread.unreadCount ? 700 : 500, color: thread.unreadCount ? "#f0f0f3" : "#c0c0c8" }}
              >
                {sellerLabel(participant)}
              </p>
              {participant.verified ? <ShieldCheck size={11} style={{ color: m.blue }} /> : null}
              {thread.role === "selling" ? (
                <span
                  className="rounded px-[4px] py-[1px] text-[8px]"
                  style={{ fontWeight: 600, color: "#6ee7b7", background: "rgba(52,211,153,0.1)" }}
                >
                  SELLING
                </span>
              ) : null}
            </div>
            {thread.listing ? (
              <div className="mt-[3px] flex items-center gap-1.5">
                <div
                  className="h-[16px] w-[16px] overflow-hidden rounded-[3px] shrink-0"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <img alt={thread.listing.title} className="h-full w-full object-cover" src={listingArtwork(thread.listing)} />
                </div>
                <span className="truncate text-[10.5px]" style={{ fontWeight: 500, color: "#6a6a72" }}>
                  {thread.listing.title}
                  {thread.listing?.price ? ` / ${formatPrice(thread.listing.priceCad ?? thread.listing.price, thread.listing.priceCurrency || "CAD")}` : ""}
                </span>
              </div>
            ) : null}
          </div>
          <span
            className="shrink-0 text-[10px]"
            style={{ fontWeight: thread.unreadCount ? 600 : 400, color: thread.unreadCount ? m.redLight : "#3e3e46" }}
          >
            {compactTimeLabel(thread.updatedAt)}
          </span>
        </div>
        <p
          className="truncate text-[12px]"
          style={{ fontWeight: thread.unreadCount ? 500 : 400, color: thread.unreadCount ? "#9a9aa0" : "#4a4a52", lineHeight: 1.3 }}
        >
          {thread.lastMessage?.text || thread.lastMessage?.body || "No messages yet."}
        </p>
        <div className="mt-[5px] flex items-center gap-1.5">
          {badge ? (
            <span
              className="rounded px-[5px] py-[2px] text-[9px]"
              style={{ fontWeight: 600, color: badge.color, background: badge.bg }}
            >
              {badge.label}
            </span>
          ) : null}
          {thread.latestOffer?.cashAmount ? (
            <span className="text-[10px] tabular-nums" style={{ fontWeight: 600, color: "#6a6a72" }}>
              {formatPrice(thread.latestOffer.cashAmount, "CAD")}
            </span>
          ) : null}
        </div>
      </div>
      {thread.unreadCount ? (
        <div
          className="mt-1 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full"
          style={{ background: m.redGradient, boxShadow: "0 2px 8px rgba(239,68,68,0.3)" }}
        >
          <span className="text-[9px] text-white" style={{ fontWeight: 700 }}>
            {thread.unreadCount}
          </span>
        </div>
      ) : null}
    </motion.button>
  );
}

function OfferCard({ currentUserId, offer, onAccept, onCounter, onDecline, processing }) {
  const tone = offerTone(offer.status);
  const tradeText = Array.isArray(offer.tradeItems) && offer.tradeItems.length ? offer.tradeItems.join(", ") : "";
  return (
    <div className="w-[260px] overflow-hidden rounded-2xl" style={{ background: String(offer.sellerId) === String(currentUserId) ? "rgba(255,255,255,0.04)" : "rgba(239,68,68,0.06)", border: String(offer.sellerId) === String(currentUserId) ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(239,68,68,0.12)" }}>
      <div className="px-3.5 pb-3 pt-3">
        <div className="mb-2 flex items-center gap-1.5"><span className="text-[10px] uppercase tracking-[0.12em]" style={{ fontWeight: 700, color: tone.color }}>{offerLabel(offer.offerType)}</span></div>
        <div className="flex items-end gap-2">
          <span className="text-[24px] tabular-nums text-white" style={{ fontWeight: 700, lineHeight: 1 }}>{offer.offerType === "trade" ? "Trade" : formatPrice(offer.cashAmount || 0, "CAD")}</span>
          <span className="rounded-md px-2 py-[3px] text-[9px]" style={{ background: tone.bg, color: tone.color, fontWeight: 700 }}>{tone.label}</span>
        </div>
        {tradeText ? <p className="mt-2 text-[11px]" style={{ color: m.textSecondary, lineHeight: 1.45 }}>{tradeText}</p> : null}
        {offer.note ? <p className="mt-2 text-[11px]" style={{ color: m.textSecondary, lineHeight: 1.45 }}>{offer.note}</p> : null}
      </div>
      {canRespond(offer, currentUserId) ? <div className="flex gap-px" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <motion.button className="flex-1 py-2.5" style={{ background: "rgba(255,255,255,0.02)" }} type="button" whileTap={{ scale: 0.96 }} onClick={onDecline}><span className="text-[12px]" style={{ color: m.textSecondary, fontWeight: 600 }}>{processing ? "..." : "Decline"}</span></motion.button>
        <div className="w-px" style={{ background: "rgba(255,255,255,0.04)" }} />
        <motion.button className="flex-1 py-2.5" style={{ background: "rgba(255,255,255,0.02)" }} type="button" whileTap={{ scale: 0.96 }} onClick={onCounter}><span className="text-[12px]" style={{ color: "#93c5fd", fontWeight: 600 }}>Counter</span></motion.button>
        <div className="w-px" style={{ background: "rgba(255,255,255,0.04)" }} />
        <motion.button className="flex-1 py-2.5" style={{ background: "rgba(52,211,153,0.04)" }} type="button" whileTap={{ scale: 0.96 }} onClick={onAccept}><span className="text-[12px]" style={{ color: "#6ee7b7", fontWeight: 600 }}>Accept</span></motion.button>
      </div> : null}
    </div>
  );
}

function MessageBubble({ currentUserId, message, onPreview }) {
  const mine = String(message.senderId) === String(currentUserId);
  const hasAttachments = Array.isArray(message.attachments) && message.attachments.length > 0;
  const seenByOther = Array.isArray(message.readBy) ? message.readBy.some((id) => String(id) !== String(message.senderId)) : false;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
        {hasAttachments ? <div className={`mb-2 grid gap-2 ${message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>{message.attachments.map((attachment) => <motion.button key={attachment.id} className="overflow-hidden rounded-[18px] border" style={{ borderColor: m.borderStrong, background: m.surfaceStrong }} type="button" whileTap={{ scale: 0.98 }} onClick={() => onPreview(attachment.url)}><img alt={attachment.name || "Attachment"} className="h-32 w-full object-cover" src={attachment.url} /></motion.button>)}</div> : null}
        {(message.text || message.body) ? <div className="px-3 py-[8px]" style={{ background: mine ? "linear-gradient(135deg, rgba(239,68,68,0.14), rgba(185,28,28,0.1))" : "rgba(255,255,255,0.055)", border: mine ? "1px solid rgba(239,68,68,0.1)" : "1px solid rgba(255,255,255,0.05)", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px" }}><p className="text-[13px]" style={{ fontWeight: 400, color: mine ? "#ede4e6" : "#c8c8cc", lineHeight: 1.45 }}>{message.text || message.body}</p></div> : null}
        <div className={`mt-[3px] flex items-center gap-1 ${mine ? "justify-end pr-1" : "pl-1"}`}><span className="text-[9px]" style={{ color: "#2e2e36" }}>{fmtTime(message.sentAt)}</span>{mine ? (seenByOther ? <CheckCheck size={10} style={{ color: "#60a5fa" }} /> : <Check size={10} style={{ color: "#3e3e46" }} />) : null}</div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { threadId } = useParams();
  const { authReady, currentUserId, getThreadById, hideThreadForCurrentUser, isAuthenticated, loading, markThreadRead, offersByListingId, respondToOffer, sendMessage, threadsForCurrentUser, unreadMessageCount } = useMarketplace();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [draft, setDraft] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [activeOfferId, setActiveOfferId] = useState("");
  const [counterDraft, setCounterDraft] = useState(null);
  const [respondingOfferId, setRespondingOfferId] = useState("");
  const [showThreadActions, setShowThreadActions] = useState(false);
  const feedRef = useRef(null);
  const desktopFeedRef = useRef(null);
  const fileInputRef = useRef(null);
  const filteredThreads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return threadsForCurrentUser
      .map((thread) => {
        const threadOffers = [...(offersByListingId[thread.listingId] || [])].sort(
          (left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime(),
        );
        const latestOffer = threadOffers[0] || null;
        const badgeTone = latestOffer ? offerTone(latestOffer.status) : null;
        return {
          ...thread,
          role: threadRole(thread, currentUserId),
          offerCount: Number(threadOffers.length || 0),
          latestOffer,
          offerBadge: badgeTone ? { label: badgeTone.label, color: badgeTone.color, bg: badgeTone.bg } : null,
        };
      })
      .filter((thread) => {
        if (tab !== "all" && thread.role !== tab) return false;
        if (!normalizedQuery) return true;
        return [thread.participantLabel, thread.otherParticipant?.publicName, thread.otherParticipant?.name, thread.listing?.title, thread.lastMessage?.text, thread.lastMessage?.body]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      });
  }, [currentUserId, offersByListingId, query, tab, threadsForCurrentUser]);

  const activeThread = useMemo(() => (threadId ? getThreadById(threadId) : null), [getThreadById, threadId]);
  const threadOffers = useMemo(() => (!activeThread?.listingId ? [] : [...(offersByListingId[activeThread.listingId] || [])].sort((a, b) => new Date(a.createdAt || a.updatedAt || 0).getTime() - new Date(b.createdAt || b.updatedAt || 0).getTime())), [activeThread?.listingId, offersByListingId]);
  const timeline = useMemo(() => {
    if (!activeThread) return [];
    const messageItems = (activeThread.messages || []).map((message) => ({ id: `message-${message.id}`, timestamp: new Date(message.sentAt || 0).getTime(), type: "message", value: message }));
    const offerItems = threadOffers.map((offer) => ({ id: `offer-${offer.id}`, timestamp: new Date(offer.createdAt || offer.updatedAt || 0).getTime(), type: "offer", value: offer }));
    return [...messageItems, ...offerItems].sort((a, b) => a.timestamp - b.timestamp);
  }, [activeThread, threadOffers]);
  const quickReplies = useMemo(() => (!activeThread?.listing ? [] : ["Still available?", "Can you send more photos?", "What meetup spot works best?", "Open to a counter?"]), [activeThread?.listing]);

  useEffect(() => {
    if (activeThread?.id) void markThreadRead(activeThread.id, { thread: activeThread });
  }, [activeThread?.id, markThreadRead]);

  useEffect(() => {
    if (!feedRef.current) return;
    requestAnimationFrame(() => {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    });
  }, [activeThread?.id, timeline.length]);

  useEffect(() => {
    if (!desktopFeedRef.current) return;
    requestAnimationFrame(() => {
      desktopFeedRef.current.scrollTop = desktopFeedRef.current.scrollHeight;
    });
  }, [activeThread?.id, timeline.length]);

  useEffect(() => () => { pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.preview)); }, [pendingPhotos]);

  function handleFilesSelected(event) {
    const files = Array.from(event.target.files || []).filter(Boolean);
    if (!files.length) return;
    const nextFiles = files.slice(0, Math.max(0, 4 - pendingPhotos.length)).map((file) => ({ id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, file, preview: URL.createObjectURL(file) }));
    setPendingPhotos((current) => [...current, ...nextFiles].slice(0, 4));
    event.target.value = "";
  }

  function removePendingPhoto(photoId) {
    setPendingPhotos((current) => {
      const target = current.find((photo) => photo.id === photoId);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((photo) => photo.id !== photoId);
    });
  }

  async function handleSend() {
    if (!activeThread || sending) return;
    const files = pendingPhotos.map((item) => item.file).filter(Boolean);
    if (!draft.trim() && !files.length) return;
    setSending(true);
    setError("");
    const result = await sendMessage(activeThread.id, { text: draft.trim(), files });
    setSending(false);
    if (!result?.ok) {
      setError(result?.error || "Message could not be sent.");
      return;
    }
    pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    setPendingPhotos([]);
    setDraft("");
  }

  async function handleHideThread() {
    if (!activeThread) return;
    const result = await hideThreadForCurrentUser(activeThread.id);
    if (result?.ok) {
      setShowThreadActions(false);
      navigate("/inbox");
    } else if (result?.error) {
      setError(result.error);
    }
  }

  function openCounterSheet(offer) {
    setActiveOfferId(offer.id);
    setCounterDraft({
      offerType: offer.offerType || "cash",
      cashAmount: offer.cashAmount ? String(offer.cashAmount) : "",
      tradeItems: Array.isArray(offer.tradeItems) ? offer.tradeItems.join("\n") : "",
      note: offer.note || "",
    });
    setError("");
  }

  async function handleOfferResponse(offer, action) {
    if (!offer) return;
    setRespondingOfferId(offer.id);
    setError("");
    const result = await respondToOffer(offer.id, action);
    setRespondingOfferId("");
    if (!result?.ok) setError(result?.error || "Offer could not be updated.");
  }

  async function submitCounter() {
    const targetOffer = threadOffers.find((offer) => offer.id === activeOfferId);
    if (!targetOffer || !counterDraft) return;
    const payload = {
      offerType: counterDraft.offerType || targetOffer.offerType,
      cashAmount: counterDraft.cashAmount,
      tradeItems: counterDraft.tradeItems.split("\n").map((item) => item.trim()).filter(Boolean),
      note: counterDraft.note || "",
    };
    setRespondingOfferId(targetOffer.id);
    setError("");
    const result = await respondToOffer(targetOffer.id, "counter", payload);
    setRespondingOfferId("");
    if (!result?.ok) {
      setError(result?.error || "Counter offer could not be sent.");
      return;
    }
    setActiveOfferId("");
    setCounterDraft(null);
  }

  if (!authReady || loading) {
    return (
      <MobileScreen>
        <SeoHead canonicalPath={threadId ? `/inbox/${threadId}` : "/inbox"} description="Manage conversations, offers, and meetup details." title="Inbox" />
        <div className="px-4 pt-[max(0.9rem,env(safe-area-inset-top))]"><h1 className="text-[24px] text-white" style={{ fontWeight: 700 }}>Inbox</h1></div>
      </MobileScreen>
    );
  }

  if (!isAuthenticated) {
    return (
      <MobileScreen>
        <SeoHead canonicalPath="/inbox" description="Manage conversations, offers, and meetup details." title="Inbox" />
        <div className="px-4 pt-[max(0.9rem,env(safe-area-inset-top))]"><h1 className="text-[24px] text-white" style={{ fontWeight: 700 }}>Inbox</h1></div>
        <div className="px-4 pt-6"><EmptyBlock title="Sign in required" description="Sign in to view listing conversations, offer updates, and meetup messages." action={<Link to="/auth"><PrimaryButton>Go to login</PrimaryButton></Link>} /></div>
      </MobileScreen>
    );
  }

  if (!threadId) {
    return (
      <MobileScreen>
        <SeoHead canonicalPath="/inbox" description="Manage conversations, offers, and meetup details." title="Inbox" />
        <header className="sticky top-0 z-40" style={{ background: "rgba(12,12,14,0.8)", backdropFilter: "blur(30px) saturate(180%)", WebkitBackdropFilter: "blur(30px) saturate(180%)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="px-4 pb-2.5 pt-[max(0.85rem,env(safe-area-inset-top))] lg:px-6 lg:pb-4 lg:pt-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h1 className="text-[24px] text-white" style={{ fontWeight: 700, lineHeight: 1 }}>Inbox</h1>
                {unreadMessageCount > 0 ? <span className="rounded-full px-[6px] py-[2px] text-[11px]" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", fontWeight: 700 }}>{unreadMessageCount}</span> : null}
              </div>
              <motion.button className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: searchOpen ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.04)" }} type="button" whileTap={{ scale: 0.85 }} onClick={() => setSearchOpen((current) => !current)}>
                {searchOpen ? <X size={16} style={{ color: "#f87171" }} /> : <Search size={16} style={{ color: "#5a5a62" }} />}
              </motion.button>
            </div>

            <AnimatePresence>
              {searchOpen ? <motion.div className="mb-2 overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
                <div className="flex items-center gap-2 rounded-xl px-3 py-[8px]" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <Search size={14} style={{ color: "#3e3e46" }} />
                  <input autoFocus className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#3e3e46]" placeholder="Search conversations..." style={{ fontWeight: 400, color: m.text }} type="text" value={query} onChange={(event) => setQuery(event.target.value)} />
                  {query ? <button className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} type="button" onClick={() => setQuery("")}><X size={9} style={{ color: "#78787f" }} /></button> : null}
                </div>
              </motion.div> : null}
            </AnimatePresence>

            <div className="flex gap-[6px]">
              {TABS.map((option) => {
                const active = tab === option.id;
                return <motion.button key={option.id} className="rounded-xl px-3.5 py-[6px] text-[12px]" style={{ fontWeight: active ? 600 : 400, background: active ? "linear-gradient(135deg, rgba(239,68,68,0.16), rgba(185,28,28,0.1))" : "rgba(255,255,255,0.03)", border: active ? "1px solid rgba(239,68,68,0.15)" : "1px solid rgba(255,255,255,0.04)", color: active ? "#fca5a5" : "#505058" }} type="button" whileTap={{ scale: 0.93 }} onClick={() => setTab(option.id)}>{option.label}</motion.button>;
              })}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 pb-4 pt-2 lg:px-6 lg:pb-8">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
          {filteredThreads.length ? (
            <div
              className="overflow-hidden rounded-[24px] border lg:min-w-0"
              style={{
                background: "linear-gradient(180deg, rgba(20,20,24,0.96), rgba(14,14,18,0.98))",
                borderColor: "rgba(255,255,255,0.04)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
              }}
            >
              {filteredThreads.map((thread) => (
                <ThreadRow key={thread.id} thread={thread} onClick={() => navigate(`/inbox/${thread.id}`)} />
              ))}
            </div>
          ) : (
            <div className="px-1 pt-4">
              <EmptyBlock title="No conversations yet" description="New listing conversations and offer negotiations will show up here." />
            </div>
          )}
          <div className="mt-4 hidden lg:block">
            <div
              className="rounded-[24px] border p-5"
              style={{
                background: "linear-gradient(180deg, rgba(18,18,22,0.92), rgba(12,12,14,0.98))",
                borderColor: "rgba(255,255,255,0.05)",
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "#f87171", fontWeight: 700 }}>
                Desktop Inbox
              </p>
              <p className="mt-3 text-[16px] text-white" style={{ fontWeight: 700 }}>
                Negotiation-first messaging
              </p>
              <p className="mt-2 text-[12px]" style={{ color: m.textSecondary, lineHeight: 1.55 }}>
                Use the inbox to track offers, photos, and meetup coordination in one place. Open any thread to continue on the right.
              </p>
            </div>
          </div>
          </div>
        </main>
      </MobileScreen>
    );
  }

  if (!activeThread) {
    return (
      <MobileScreen>
        <SeoHead canonicalPath={`/inbox/${threadId}`} description="Manage conversations, offers, and meetup details." title="Conversation" />
        <div className="px-4 pt-[max(0.85rem,env(safe-area-inset-top))]"><PrimaryButton onClick={() => navigate("/inbox")}>Back to inbox</PrimaryButton></div>
        <div className="px-4 pt-6"><EmptyBlock title="Conversation missing" description="This thread could not be found or may have been archived." /></div>
      </MobileScreen>
    );
  }

  const participant = activeThread.otherParticipant || { name: activeThread.participantLabel };
  const participantName = sellerLabel(participant);
  const listing = activeThread.listing;

  return (
    <MobileScreen>
      <SeoHead canonicalPath={`/inbox/${activeThread.id}`} description="Manage conversations, offers, and meetup details." title={participantName} />

      <div className="hidden lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[340px_minmax(0,1fr)_320px] lg:gap-6 lg:px-6 lg:py-6">
        <aside className="min-h-0 overflow-hidden rounded-[28px] border" style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="border-b px-5 py-5" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[22px] text-white" style={{ fontWeight: 800 }}>Inbox</p>
                <p className="mt-1 text-[12px]" style={{ color: m.textSecondary }}>Offers, chats, and meetup details.</p>
              </div>
              {unreadMessageCount > 0 ? (
                <span className="rounded-full px-2 py-[4px] text-[10px]" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", fontWeight: 700 }}>
                  {unreadMessageCount}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-[16px] px-3 py-[10px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Search size={14} style={{ color: "#3e3e46" }} />
              <input
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#3e3e46]"
                placeholder="Search conversations..."
                style={{ color: m.text }}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="mt-3 flex gap-[6px]">
              {TABS.map((option) => {
                const active = tab === option.id;
                return (
                  <button
                    key={`desktop-${option.id}`}
                    className="rounded-xl px-3.5 py-[6px] text-[12px]"
                    style={{
                      fontWeight: active ? 700 : 500,
                      background: active ? "linear-gradient(135deg, rgba(239,68,68,0.16), rgba(185,28,28,0.1))" : "rgba(255,255,255,0.03)",
                      border: active ? "1px solid rgba(239,68,68,0.15)" : "1px solid rgba(255,255,255,0.04)",
                      color: active ? "#fca5a5" : "#505058",
                    }}
                    type="button"
                    onClick={() => setTab(option.id)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto">
            {filteredThreads.length ? filteredThreads.map((thread) => (
              <ThreadRow key={`desktop-thread-${thread.id}`} thread={thread} onClick={() => navigate(`/inbox/${thread.id}`)} />
            )) : (
              <div className="p-5">
                <EmptyBlock title="No conversations yet" description="New listing conversations and offer negotiations will show up here." />
              </div>
            )}
          </div>
        </aside>

        <section className="min-h-0 overflow-hidden rounded-[28px] border" style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {participant.avatarUrl ? <img alt={participantName} className="h-[42px] w-[42px] rounded-[14px] object-cover" src={participant.avatarUrl} style={{ border: "1px solid rgba(255,255,255,0.06)" }} /> : <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[14px] text-[15px] text-white" style={{ background: m.redGradient, fontWeight: 700 }}>{sellerInitial(participant)}</div>}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[15px]" style={{ color: "#e4e4e8", fontWeight: 700 }}>{participantName}</span>
                {participant.verified ? <ShieldCheck size={12} style={{ color: m.blue }} /> : null}
              </div>
              <p className="mt-1 text-[11px]" style={{ color: "#7a7a82" }}>
                {listing?.title || "Conversation"} {listing?.price ? `• ${formatPrice(listing.priceCad ?? listing.price, listing.priceCurrency || "CAD")}` : ""}
              </p>
            </div>
            <SecondaryButton className="!h-[40px] !rounded-[14px] !px-4" onClick={() => setShowThreadActions(true)}>
              <MoreHorizontal size={14} />
              Actions
            </SecondaryButton>
          </div>

          <div ref={desktopFeedRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5" style={{ height: "calc(100dvh - 220px)" }}>
            <div className="flex flex-col gap-[6px]">
              {error ? <div className="mb-2 rounded-xl px-3 py-2 text-[11px]" style={{ background: "rgba(248,113,113,0.08)", color: "#fca5a5", fontWeight: 600 }}>{error}</div> : null}
              {timeline.map((entry) => entry.type === "offer" ? (
                <motion.div key={`desktop-${entry.id}`} className={`flex ${String(entry.value.buyerId) === String(currentUserId) ? "justify-end" : "justify-start"}`} initial={{ opacity: 0, scale: 0.95, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 22, stiffness: 300 }}>
                  <OfferCard currentUserId={currentUserId} offer={entry.value} processing={respondingOfferId === entry.value.id} onAccept={() => handleOfferResponse(entry.value, "accept")} onCounter={() => openCounterSheet(entry.value)} onDecline={() => handleOfferResponse(entry.value, "decline")} />
                </motion.div>
              ) : (
                <motion.div key={`desktop-${entry.id}`} initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                  <MessageBubble currentUserId={currentUserId} message={entry.value} onPreview={setPreviewUrl} />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="border-t px-5 py-4" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {showQuickReplies && quickReplies.length && !pendingPhotos.length ? (
              <div className="mb-3 flex gap-1.5 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: "none" }}>
                {quickReplies.map((reply) => (
                  <button
                    key={`desktop-reply-${reply}`}
                    className="shrink-0 rounded-xl px-3 py-[7px] text-[11px]"
                    style={{ fontWeight: 500, color: "#8a8a92", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}
                    type="button"
                    onClick={() => {
                      setDraft(reply);
                      setShowQuickReplies(false);
                    }}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-1">
                <button className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} type="button" onClick={() => fileInputRef.current?.click()}>
                  <Camera size={16} style={{ color: "#4e4e56" }} />
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: showQuickReplies ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)" }} type="button" onClick={() => setShowQuickReplies((current) => !current)}>
                  <Smile size={16} style={{ color: showQuickReplies ? "#f87171" : "#4e4e56" }} />
                </button>
              </div>
              <div className="flex flex-1 items-end gap-2 rounded-[18px] px-4 py-[10px]" style={{ background: "rgba(255,255,255,0.05)", border: draft.trim() ? "1px solid rgba(239,68,68,0.12)" : "1px solid rgba(255,255,255,0.04)" }}>
                <textarea
                  className="max-h-28 flex-1 resize-none bg-transparent text-[13px] outline-none placeholder:text-[#3a3a42]"
                  placeholder="Message..."
                  rows={1}
                  style={{ fontWeight: 400, color: m.text, lineHeight: 1.4 }}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                />
              </div>
              <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]" style={{ background: draft.trim() || pendingPhotos.length ? m.redGradient : "rgba(255,255,255,0.05)" }} type="button" onClick={() => void handleSend()}>
                <SendHorizontal size={16} style={{ color: draft.trim() || pendingPhotos.length ? "#ffffff" : "#3e3e46" }} />
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          {listing ? (
            <div className="rounded-[28px] border p-5" style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.05)" }}>
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "#f87171", fontWeight: 700 }}>Linked Listing</p>
              <Link className="mt-4 block overflow-hidden rounded-[20px] border" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.025)" }} to={listingHref(listing.id)} state={{ backTo: location.pathname + location.search + location.hash }}>
                <img alt={listing.title} className="aspect-[4/3] w-full object-cover" src={listingArtwork(listing)} />
                <div className="p-4">
                  <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>{listing.title}</p>
                  <p className="mt-1 text-[12px]" style={{ color: "#7a7a82" }}>{listing.game || "Marketplace listing"}</p>
                  <p className="mt-3 text-[20px] text-white" style={{ fontWeight: 800 }}>{formatPrice(listing.priceCad ?? listing.price, listing.priceCurrency || "CAD")}</p>
                </div>
              </Link>
            </div>
          ) : null}
          <div className="rounded-[28px] border p-5" style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.05)" }}>
            <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "#f87171", fontWeight: 700 }}>Offer Context</p>
            <p className="mt-4 text-[28px] text-white" style={{ fontWeight: 800, lineHeight: 1 }}>{threadOffers.length}</p>
            <p className="mt-1 text-[12px]" style={{ color: "#7a7a82" }}>Offers in this conversation timeline.</p>
            <div className="mt-4 grid gap-2">
              {threadOffers.slice(-2).reverse().map((offer) => {
                const tone = offerTone(offer.status);
                return (
                  <div key={`desktop-offer-meta-${offer.id}`} className="rounded-[18px] border p-3" style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px]" style={{ color: "#d0d0d4", fontWeight: 700 }}>{offerLabel(offer.offerType)}</span>
                      <span className="rounded-md px-2 py-[3px] text-[9px]" style={{ background: tone.bg, color: tone.color, fontWeight: 700 }}>{tone.label}</span>
                    </div>
                    <p className="mt-2 text-[16px] text-white" style={{ fontWeight: 800 }}>
                      {offer.offerType === "trade" ? "Trade" : formatPrice(offer.cashAmount || 0, "CAD")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <header className="shrink-0 lg:hidden" style={{ background: "rgba(12,12,14,0.8)", backdropFilter: "blur(30px) saturate(180%)", WebkitBackdropFilter: "blur(30px) saturate(180%)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-2.5 px-3 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))] lg:px-6 lg:pb-4 lg:pt-6">
          <motion.button className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} type="button" whileTap={{ scale: 0.85 }} onClick={() => navigate("/inbox")}><ArrowLeft size={17} style={{ color: "#b0b0b8" }} /></motion.button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {participant.avatarUrl ? <img alt={participantName} className="h-[34px] w-[34px] rounded-[10px] object-cover" src={participant.avatarUrl} style={{ border: "1px solid rgba(255,255,255,0.06)" }} /> : <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-[13px] text-white" style={{ background: m.redGradient, fontWeight: 700 }}>{sellerInitial(participant)}</div>}
            <div className="min-w-0">
              <div className="flex items-center gap-1"><span className="truncate text-[14px]" style={{ color: "#e4e4e8", fontWeight: 600 }}>{participantName}</span>{participant.verified ? <ShieldCheck size={11} style={{ color: m.blue }} /> : null}</div>
              <div className="flex items-center gap-1">
                {participant.overallRating || participant.rating ? <><Star size={8} fill="#fbbf24" style={{ color: "#fbbf24" }} /><span className="text-[10px]" style={{ color: "#5e5e66", fontWeight: 500 }}>{Number(participant.overallRating || participant.rating).toFixed(1)}</span><span className="text-[10px]" style={{ color: "#5e5e66" }}>/</span></> : null}
                <span className="text-[10px]" style={{ color: "#5e5e66", fontWeight: 500 }}>{participant.responseTime || "Replies quickly"}</span>
              </div>
            </div>
          </div>
          <motion.button className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} type="button" whileTap={{ scale: 0.85 }} onClick={() => setShowThreadActions(true)}><MoreHorizontal size={16} style={{ color: "#5a5a62" }} /></motion.button>
        </div>

        {listing ? <Link className="flex items-center gap-2.5 px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.03)" }} to={listingHref(listing.id)} state={{ backTo: location.pathname + location.search + location.hash }}>
          <div className="h-[36px] w-[36px] shrink-0 overflow-hidden rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.06)" }}><img alt={listing.title} className="h-full w-full object-cover" src={listingArtwork(listing)} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[12px]" style={{ color: "#d0d0d4", fontWeight: 600 }}>{listing.title}</span>
              <span className="rounded px-[4px] py-[1px] text-[9px]" style={{ fontWeight: 600, background: "rgba(59,130,246,0.12)", color: listing.condition === "LP" ? "#fbbf24" : "#60a5fa" }}>{listing.condition}</span>
            </div>
            <span className="text-[10px]" style={{ color: "#4e4e56", fontWeight: 400 }}>{[listing.setName || listing.set, listing.cardNumber || listing.game].filter(Boolean).join(" / ")}</span>
          </div>
          <span className="shrink-0 text-[15px] tabular-nums" style={{ color: "#f0f0f2", fontWeight: 700 }}>{formatPrice(listing.priceCad ?? listing.price, listing.priceCurrency || "CAD")}</span>
        </Link> : null}
      </header>

      <main ref={feedRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 lg:hidden">
        <div className="flex flex-col gap-[6px]">
          {error ? <div className="mb-2 rounded-xl px-3 py-2 text-[11px]" style={{ background: "rgba(248,113,113,0.08)", color: "#fca5a5", fontWeight: 600 }}>{error}</div> : null}
          {timeline.map((entry) => entry.type === "offer" ? <motion.div key={entry.id} className={`flex ${String(entry.value.buyerId) === String(currentUserId) ? "justify-end" : "justify-start"}`} initial={{ opacity: 0, scale: 0.95, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 22, stiffness: 300 }}><OfferCard currentUserId={currentUserId} offer={entry.value} processing={respondingOfferId === entry.value.id} onAccept={() => handleOfferResponse(entry.value, "accept")} onCounter={() => openCounterSheet(entry.value)} onDecline={() => handleOfferResponse(entry.value, "decline")} /></motion.div> : <motion.div key={entry.id} initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}><MessageBubble currentUserId={currentUserId} message={entry.value} onPreview={setPreviewUrl} /></motion.div>)}
        </div>
      </main>

      <div
        className="shrink-0 px-3 py-2.5 lg:hidden"
        style={{
          background: "rgba(12,12,14,0.85)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {showQuickReplies && quickReplies.length && !pendingPhotos.length ? (
          <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: "none" }}>
            {quickReplies.map((reply) => (
              <motion.button
                key={reply}
                className="shrink-0 rounded-xl px-3 py-[6px] text-[11px]"
                style={{
                  fontWeight: 500,
                  color: "#8a8a92",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
                type="button"
                whileTap={{ scale: 0.93 }}
                onClick={() => {
                  setDraft(reply);
                  setShowQuickReplies(false);
                }}
              >
                {reply}
              </motion.button>
            ))}
          </div>
        ) : null}
        {pendingPhotos.length ? (
          <div className="mb-2 flex gap-2 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: "none" }}>
            {pendingPhotos.map((photo) => (
              <div key={photo.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[14px]" style={{ border: `1px solid ${m.borderStrong}` }}>
                <img alt="Pending upload" className="h-full w-full object-cover" src={photo.preview} />
                <button className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "rgba(12,12,14,0.72)" }} type="button" onClick={() => removePendingPhoto(photo.id)}>
                  <X size={10} style={{ color: "#fff" }} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-1">
            <motion.button
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "rgba(255,255,255,0.05)" }}
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera size={16} style={{ color: "#4e4e56" }} />
            </motion.button>
            <motion.button
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: showQuickReplies ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)" }}
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => setShowQuickReplies((current) => !current)}
            >
              <Smile size={16} style={{ color: showQuickReplies ? "#f87171" : "#4e4e56" }} />
            </motion.button>
          </div>

          <div
            className="flex flex-1 items-end gap-2 rounded-2xl px-3.5 py-[9px]"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: draft.trim() ? "1px solid rgba(239,68,68,0.12)" : "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <textarea
              className="max-h-28 flex-1 resize-none bg-transparent text-[13px] outline-none placeholder:text-[#3a3a42]"
              placeholder="Message..."
              rows={1}
              style={{ fontWeight: 400, color: m.text, lineHeight: 1.4 }}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />
          </div>

          <motion.button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: draft.trim() || pendingPhotos.length ? m.redGradient : "rgba(255,255,255,0.05)",
              boxShadow: draft.trim() || pendingPhotos.length ? `0 8px 24px ${m.redGlow}` : "none",
              transition: "all 0.2s",
            }}
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={() => void handleSend()}
          >
            <SendHorizontal size={16} style={{ color: draft.trim() || pendingPhotos.length ? "#ffffff" : "#3e3e46" }} />
          </motion.button>
        </div>
        <input ref={fileInputRef} accept="image/*" className="hidden" multiple type="file" onChange={handleFilesSelected} />
      </div>

      <BottomSheet open={Boolean(activeOfferId && counterDraft)} onClose={() => { setActiveOfferId(""); setCounterDraft(null); }}>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>Counter offer</p>
          <p className="mt-1 text-[11px]" style={{ color: m.textSecondary }}>Adjust the cash amount, trade items, or note before sending it back.</p>
          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-3 gap-2">{["cash", "trade", "cash-trade"].map((type) => <ChoicePill key={type} active={counterDraft?.offerType === type} onClick={() => setCounterDraft((current) => ({ ...current, offerType: type }))}>{offerLabel(type)}</ChoicePill>)}</div>
            {counterDraft?.offerType !== "trade" ? <TextField inputMode="decimal" placeholder="0.00" prefix="$" value={counterDraft?.cashAmount || ""} onChange={(value) => setCounterDraft((current) => ({ ...current, cashAmount: value }))} /> : null}
            {counterDraft?.offerType !== "cash" ? <TextArea placeholder="List each trade item on its own line" rows={4} value={counterDraft?.tradeItems || ""} onChange={(value) => setCounterDraft((current) => ({ ...current, tradeItems: value }))} /> : null}
            <TextArea placeholder="Add a quick note..." rows={3} value={counterDraft?.note || ""} onChange={(value) => setCounterDraft((current) => ({ ...current, note: value }))} />
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton onClick={() => { setActiveOfferId(""); setCounterDraft(null); }}>Cancel</SecondaryButton>
              <PrimaryButton disabled={respondingOfferId === activeOfferId} onClick={() => void submitCounter()}>{respondingOfferId === activeOfferId ? "Sending..." : "Send counter"}</PrimaryButton>
            </div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={showThreadActions} onClose={() => setShowThreadActions(false)}>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>Conversation</p>
          <div className="mt-4 grid gap-2">
            {listing ? <SecondaryButton className="justify-start gap-2" onClick={() => rememberAndNavigateToListing(navigate, location, listing.id)}>View listing</SecondaryButton> : null}
            <SecondaryButton className="justify-start gap-2" onClick={() => navigate(sellerHref(participant))}>View seller</SecondaryButton>
            <SecondaryButton className="justify-start gap-2" onClick={() => void handleHideThread()}><Archive size={14} />Hide conversation</SecondaryButton>
          </div>
        </div>
      </BottomSheet>

      <AnimatePresence>{previewUrl ? <Lightbox alt="Message attachment preview" src={previewUrl} onClose={() => setPreviewUrl("")} /> : null}</AnimatePresence>
    </MobileScreen>
  );
}

