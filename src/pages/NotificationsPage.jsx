import { BellRing, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";
import PageSkeleton from "../components/ui/PageSkeleton";
import { useMarketplace } from "../hooks/useMarketplace";

function buildTargetLink(notification) {
  if (!notification?.entityId) {
    return "/dashboard";
  }

  if (String(notification.entityId).startsWith("/")) {
    return notification.entityId;
  }

  if (
    notification.type === "offer-received" ||
    notification.type === "offer-accepted" ||
    notification.type === "offer-declined" ||
    notification.type === "offer-countered"
  ) {
    return "/dashboard";
  }

  if (notification.type === "message") {
    return `/messages/${notification.entityId}`;
  }

  if (notification.type === "listing-flagged" || notification.type === "report-opened") {
    return "/admin";
  }

  return `/listing/${notification.entityId}`;
}

function formatNotificationDate(dateString) {
  return new Date(dateString).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const {
    loading,
    markAllNotificationsRead,
    markNotificationRead,
    notificationsForCurrentUser,
  } = useMarketplace();

  if (loading && !notificationsForCurrentUser.length) {
    return <PageSkeleton cards={3} rows={1} titleWidth="w-56" />;
  }

  if (!notificationsForCurrentUser.length) {
    return (
      <EmptyState
        description="Offer updates, unread messages, reports, review activity, and listing actions will show up here."
        title="No notifications yet"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Notifications</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
              Activity center
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-8 text-steel">
              New offers, unread messages, moderation actions, and reviews all land here.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white"
            type="button"
            onClick={markAllNotificationsRead}
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {notificationsForCurrentUser.map((notification) => (
          <Link
            key={notification.id}
            className={`block rounded-[28px] border p-5 shadow-soft transition hover:-translate-y-0.5 ${
              notification.read
                ? "border-slate-200 bg-white"
                : "border-orange/30 bg-orange/5"
            }`}
            to={buildTargetLink(notification)}
            onClick={() => markNotificationRead(notification.id)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="rounded-full bg-navy/10 p-3 text-navy">
                  <BellRing size={18} />
                </span>
                <div>
                  <p className="font-semibold text-ink">{notification.title}</p>
                  <p className="mt-2 text-sm leading-7 text-steel">{notification.body}</p>
                </div>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                {formatNotificationDate(notification.createdAt)}
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
