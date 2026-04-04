import { BellRing, CheckCheck, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import ProfileWorkspaceNav from "../components/account/ProfileWorkspaceNav";
import SeoHead from "../components/seo/SeoHead";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import {
  EmptyBlock,
  MobileScreen,
  PrimaryButton,
  ScreenHeader,
  ScreenSection,
  SecondaryButton,
} from "../mobile/primitives";

function buildTargetLink(notification) {
  if (!notification?.entityId) {
    return "/dashboard";
  }
  if (String(notification.entityId).startsWith("/")) {
    return notification.entityId;
  }
  if (notification.type === "message") {
    return `/inbox/${notification.entityId}`;
  }
  if (
    notification.type === "listing-flagged" ||
    notification.type === "report-opened" ||
    notification.type === "bug-opened"
  ) {
    return "/admin";
  }
  if (notification.type === "bug-status") {
    return "/beta/bugs";
  }
  if (String(notification.type || "").startsWith("offer-")) {
    return "/dashboard";
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

function NotificationCard({ deleteNotification, markNotificationRead, notification }) {
  return (
    <article
      className="rounded-[18px] px-4 py-4"
      style={{
        background: m.surface,
        border: `1px solid ${notification.read ? m.border : "rgba(239,68,68,0.18)"}`,
        boxShadow: m.shadowPanel,
      }}
    >
      <div className="flex gap-3">
        <div
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
          style={{ background: notification.read ? m.surfaceStrong : "rgba(239,68,68,0.12)" }}
        >
          <BellRing size={15} style={{ color: notification.read ? m.textSecondary : m.red }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                className="block truncate text-[13px] text-white"
                style={{ fontWeight: 700 }}
                onClick={() => markNotificationRead(notification.id)}
                to={buildTargetLink(notification)}
              >
                {notification.title}
              </Link>
              <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                {formatNotificationDate(notification.createdAt)}
              </p>
            </div>
            {!notification.read ? (
              <span
                className="rounded-full px-2 py-[3px] text-[8px] uppercase"
                style={{ background: "rgba(239,68,68,0.14)", color: "#fca5a5", fontWeight: 700 }}
              >
                New
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-[11px] leading-5" style={{ color: m.textSecondary }}>
            {notification.body}
          </p>

          <div className="mt-3 flex gap-2">
            <Link
              className="inline-flex h-8 items-center justify-center rounded-[12px] px-3 text-[10px]"
              style={{ background: m.surfaceStrong, border: `1px solid ${m.border}`, color: m.text, fontWeight: 600 }}
              onClick={() => markNotificationRead(notification.id)}
              to={buildTargetLink(notification)}
            >
              Open
            </Link>
            <button
              className="inline-flex h-8 items-center justify-center gap-1 rounded-[12px] px-3 text-[10px]"
              style={{ background: "transparent", color: m.textSecondary, fontWeight: 600 }}
              type="button"
              onClick={() => deleteNotification(notification.id)}
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function NotificationsPage() {
  const {
    clearReadNotifications,
    currentUser,
    deleteNotification,
    ensureWorkspaceDataLoaded,
    markAllNotificationsRead,
    markNotificationRead,
    notificationsForCurrentUser,
  } = useMarketplace();

  useEffect(() => {
    void ensureWorkspaceDataLoaded();
  }, [ensureWorkspaceDataLoaded]);

  return (
    <MobileScreen className="pb-[92px]">
      <SeoHead canonicalPath="/notifications" description="Offers, inbox activity, and moderation updates in one place." title="Notifications" />

      <ProfileWorkspaceNav sellerId={currentUser?.id} />

      <ScreenHeader subtitle={`${notificationsForCurrentUser.length} items`} title="Notifications" />

      <ScreenSection className="grid grid-cols-2 gap-2 pb-3">
        <SecondaryButton className="w-full" onClick={clearReadNotifications}>
          <Trash2 size={14} />
          Clear read
        </SecondaryButton>
        <PrimaryButton className="w-full" onClick={markAllNotificationsRead}>
          <CheckCheck size={14} />
          Read all
        </PrimaryButton>
      </ScreenSection>

      <ScreenSection className="flex-1 pb-2">
        {notificationsForCurrentUser.length ? (
          <div className="flex flex-col gap-2">
            {notificationsForCurrentUser.map((notification) => (
              <NotificationCard
                key={notification.id}
                deleteNotification={deleteNotification}
                markNotificationRead={markNotificationRead}
                notification={notification}
              />
            ))}
          </div>
        ) : (
          <EmptyBlock
            description="Message activity, offer updates, reports, and reminder changes will land here."
            title="No notifications yet"
          />
        )}
      </ScreenSection>
    </MobileScreen>
  );
}
