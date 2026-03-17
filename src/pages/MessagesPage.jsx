import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";
import { useMarketplace } from "../hooks/useMarketplace";

function formatMessageTime(isoString) {
  return new Date(isoString).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { threadId } = useParams();
  const { currentUserId, formatCadPrice, sendMessage, threadsForCurrentUser } =
    useMarketplace();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!threadId && threadsForCurrentUser[0]) {
      navigate(`/messages/${threadsForCurrentUser[0].id}`, { replace: true });
    }
  }, [navigate, threadId, threadsForCurrentUser]);

  const activeThread = useMemo(
    () => threadsForCurrentUser.find((thread) => thread.id === threadId) || null,
    [threadId, threadsForCurrentUser],
  );

  if (!threadsForCurrentUser.length) {
    return (
      <EmptyState
        description="Start a conversation from any listing to keep negotiation, meetup planning, and follow-up in one place."
        title="No Messages Yet"
      />
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!activeThread) {
      return;
    }

    sendMessage(activeThread.id, draft);
    setDraft("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
      <section className="overflow-hidden rounded-[32px] bg-white shadow-soft">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="section-kicker">Messages</p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-[0.08em] text-ink">
            Inbox
          </h1>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {threadsForCurrentUser.map((thread) => (
            <button
              key={thread.id}
              className={`w-full border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 ${
                thread.id === threadId ? "bg-slate-50" : ""
              }`}
              type="button"
              onClick={() => navigate(`/messages/${thread.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold uppercase tracking-[0.06em] text-ink">
                    {thread.otherParticipant?.name || "Conversation"}
                  </p>
                  <p className="mt-1 text-sm text-steel">
                    {thread.listing?.title || "General thread"}
                  </p>
                </div>
                <span className="text-xs text-steel">
                  {formatMessageTime(thread.updatedAt)}
                </span>
              </div>
              {thread.unreadCount ? (
                <span className="mt-2 inline-flex rounded-full bg-orange px-2 py-0.5 text-xs font-semibold text-white">
                  {thread.unreadCount} unread
                </span>
              ) : null}
              <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                {thread.lastMessage?.body || "No messages yet. Start the conversation."}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[32px] bg-white shadow-soft">
        {activeThread ? (
          <>
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="section-kicker">Conversation</p>
                  <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-[0.08em] text-ink">
                    {activeThread.otherParticipant?.name}
                  </h2>
                  <p className="mt-2 text-sm text-steel">
                    {activeThread.listing?.title || "General thread"}
                  </p>
                </div>
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

            <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto px-6 py-5">
              {activeThread.messages.map((message) => {
                const mine = message.senderId === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={`max-w-[80%] rounded-[24px] px-4 py-3 ${
                      mine
                        ? "ml-auto bg-navy text-white"
                        : "bg-slate-100 text-ink"
                    }`}
                  >
                    <p className="text-sm">{message.body}</p>
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

            <form
              className="border-t border-slate-200 px-6 py-5"
              onSubmit={handleSubmit}
            >
              <div className="flex items-center gap-3">
                <input
                  className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="Write a message about condition, trades, or meetup timing"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button
                  className="rounded-full bg-orange px-5 py-3 font-display text-sm font-bold uppercase tracking-[0.12em] text-white"
                  type="submit"
                >
                  Send
                </button>
              </div>
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
