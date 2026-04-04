import { BookOpenText, Bug, Heart, LayoutDashboard, Settings2, Shield, Store } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";
import { m } from "../../mobile/design";

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (pathname) => pathname === "/dashboard" || pathname === "/account/dashboard",
    to: "/dashboard",
  },
  {
    id: "settings",
    label: "Account",
    icon: Settings2,
    match: (pathname) => pathname === "/account",
    to: "/account",
  },
  {
    id: "wishlist",
    label: "Wishlist",
    icon: Heart,
    match: (pathname) => pathname === "/wishlist",
    to: "/wishlist",
  },
  {
    id: "binder",
    label: "Collection",
    icon: BookOpenText,
    match: (pathname) => pathname === "/collection",
    to: "/collection",
  },
];

function WorkspaceLink({ active, icon: Icon, label, to }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-[11px]"
      style={{
        background: active ? m.redGradient : m.surfaceStrong,
        border: active ? "none" : `1px solid ${m.border}`,
        color: active ? "#fff" : m.textSecondary,
        fontWeight: active ? 700 : 600,
        boxShadow: active ? "0 10px 24px rgba(185,28,28,0.22)" : "none",
      }}
      to={to}
    >
      <Icon size={13} />
      {label}
    </Link>
  );
}

export default function ProfileWorkspaceNav({ sellerId }) {
  const location = useLocation();
  const { isAdmin, isBetaTester } = useMarketplace();
  const pathname = location.pathname;

  return (
    <nav
      aria-label="Profile workspace navigation"
      className="relative z-10 mb-1 flex min-h-[42px] items-center gap-2 overflow-x-auto overflow-y-visible px-4 pb-2 pt-2 hide-scrollbar lg:flex-wrap lg:overflow-visible lg:px-6 lg:pb-0 lg:pt-1"
      style={{
        background: "rgba(12,12,14,0.88)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      {NAV_ITEMS.map((item) => (
        <WorkspaceLink
          active={item.match(pathname)}
          icon={item.icon}
          key={item.id}
          label={item.label}
          to={item.to}
        />
      ))}
      {sellerId ? (
        <WorkspaceLink
          active={pathname === `/seller/${sellerId}`}
          icon={Store}
          label="Public"
          to={`/seller/${sellerId}`}
        />
      ) : null}
      {isBetaTester && !isAdmin ? (
        <WorkspaceLink active={pathname === "/beta/bugs"} icon={Bug} label="Bugs" to="/beta/bugs" />
      ) : null}
      {isAdmin ? (
        <WorkspaceLink active={pathname === "/admin"} icon={Shield} label="Admin" to="/admin" />
      ) : null}
    </nav>
  );
}
