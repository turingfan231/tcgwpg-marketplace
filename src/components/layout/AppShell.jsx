import {
  CalendarDays,
  Home,
  LayoutDashboard,
  MessageCircle,
  Search,
  Settings2,
  Store,
  UserRound,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import UserAvatar from "../shared/UserAvatar";
import { useMarketplace } from "../../hooks/useMarketplace";
import MobileTabBar from "./MobileTabBar";
import { m } from "../../mobile/design";

const HIDE_NAV_PATTERNS = [
  /^\/listing\//,
  /^\/inbox\/[^/]+/,
  /^\/sell(\/|$)/,
  /^\/offer(\/|$)/,
];

const DESKTOP_NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home, to: "/", match: (pathname) => pathname === "/" },
  { id: "market", label: "Market", icon: Search, to: "/market", match: (pathname) => pathname.startsWith("/market") },
  { id: "events", label: "Events", icon: CalendarDays, to: "/events", match: (pathname) => pathname.startsWith("/events") },
  { id: "stores", label: "Stores", icon: Store, to: "/stores", match: (pathname) => pathname.startsWith("/stores") },
  { id: "inbox", label: "Inbox", icon: MessageCircle, to: "/inbox", match: (pathname) => pathname.startsWith("/inbox") || pathname.startsWith("/messages") },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/dashboard", match: (pathname) => pathname === "/dashboard" || pathname === "/account/dashboard" },
  { id: "account", label: "Account", icon: Settings2, to: "/account", match: (pathname) => pathname.startsWith("/account") || pathname.startsWith("/collection") || pathname.startsWith("/wishlist") || pathname.startsWith("/notifications") },
];

function DesktopNavLink({ active, icon: Icon, label, to, badge }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className="group flex items-center gap-3 rounded-[18px] px-3.5 py-3 transition-colors"
      style={{
        background: active ? "linear-gradient(135deg, rgba(239,68,68,0.14), rgba(185,28,28,0.08))" : "transparent",
        border: active ? "1px solid rgba(239,68,68,0.14)" : "1px solid transparent",
      }}
      to={to}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-[14px] transition-colors"
        style={{
          background: active ? "rgba(239,68,68,0.14)" : "rgba(255,255,255,0.04)",
          color: active ? "#fca5a5" : "#6a6a72",
        }}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[13px]"
          style={{
            color: active ? "#f4d7d9" : "#d1d1d6",
            fontWeight: active ? 700 : 600,
          }}
        >
          {label}
        </p>
      </div>
      {badge ? (
        <span
          className="rounded-full px-2 py-[3px] text-[10px]"
          style={{ background: "rgba(239,68,68,0.14)", color: "#fca5a5", fontWeight: 700 }}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function DesktopSidebar({ pathname }) {
  const { currentUser, unreadMessageCount } = useMarketplace();

  return (
    <aside
      className="hidden w-[272px] shrink-0 flex-col border-r px-5 py-6 lg:flex"
      style={{
        background: "linear-gradient(180deg, rgba(14,14,18,0.96), rgba(10,10,12,0.98))",
        borderColor: "rgba(255,255,255,0.05)",
      }}
    >
      <Link className="flex items-center gap-3 rounded-[20px] p-2" to="/">
        <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[14px] text-white" style={{ background: "#17090b" }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(127,29,29,0.92))" }} />
          <div className="absolute -right-2 -top-2 h-7 w-7 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
          <span className="relative text-[10px] tracking-[0.08em]" style={{ fontWeight: 900 }}>WPG</span>
        </div>
        <div>
          <p className="text-[16px] text-white" style={{ fontWeight: 800 }}>TCG WPG</p>
          <p className="text-[11px]" style={{ color: "#6a6a72", fontWeight: 500 }}>Desktop workspace</p>
        </div>
      </Link>

      <div
        className="mt-5 rounded-[24px] p-3"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center gap-3">
          <UserAvatar className="h-12 w-12 text-[14px]" user={currentUser} />
          <div className="min-w-0">
            <p className="truncate text-[13px] text-white" style={{ fontWeight: 700 }}>
              {currentUser?.publicName || currentUser?.name || currentUser?.username || "Guest"}
            </p>
            <p className="mt-0.5 truncate text-[11px]" style={{ color: "#6a6a72" }}>
              {currentUser?.neighborhood || "Winnipeg, MB"}
            </p>
          </div>
        </div>
      </div>

      <nav aria-label="Desktop navigation" className="mt-5 flex flex-col gap-1.5">
        {DESKTOP_NAV_ITEMS.map((item) => (
          <DesktopNavLink
            key={item.id}
            active={item.match(pathname)}
            badge={item.id === "inbox" && unreadMessageCount ? String(unreadMessageCount) : undefined}
            icon={item.icon}
            label={item.label}
            to={item.to}
          />
        ))}
      </nav>

      <div
        className="mt-auto rounded-[24px] p-4"
        style={{
          background: "linear-gradient(180deg, rgba(64,14,18,0.24), rgba(18,18,22,0.7))",
          border: "1px solid rgba(239,68,68,0.08)",
        }}
      >
        <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "#f87171", fontWeight: 700 }}>
          Desktop Mode
        </p>
        <p className="mt-2 text-[13px] text-white" style={{ fontWeight: 700 }}>
          Browse faster on PC
        </p>
        <p className="mt-1 text-[11px]" style={{ color: "#8a8a92", lineHeight: 1.5 }}>
          Wider market grids, denser inboxes, and proper multi-column workspace layouts are now active here.
        </p>
      </div>
    </aside>
  );
}

export default function AppShell() {
  const location = useLocation();
  const hideNav = HIDE_NAV_PATTERNS.some((pattern) => pattern.test(location.pathname));
  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: "radial-gradient(circle at top left, rgba(56,56,64,0.12) 0%, rgba(10,10,12,1) 32%)" }}>
      <DesktopSidebar pathname={location.pathname} />
      <div className="flex min-w-0 flex-1 overflow-hidden">
        <div className="relative flex h-[100dvh] min-h-0 w-full max-w-[430px] flex-col overflow-hidden lg:max-w-none lg:flex-1 lg:px-6 lg:py-6">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:w-full lg:overflow-visible lg:rounded-[28px] lg:border lg:border-white/5 lg:bg-[linear-gradient(180deg,rgba(16,16,20,0.94),rgba(12,12,14,0.98))] lg:shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
          <Outlet />
        </div>
        {hideNav ? null : <MobileTabBar />}
      </div>
      </div>
    </div>
  );
}
