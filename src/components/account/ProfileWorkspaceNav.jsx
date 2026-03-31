import { BookOpenText, Heart, LayoutDashboard, Settings2, Store } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  {
    id: "settings",
    label: "Settings",
    icon: Settings2,
    match: (pathname) => pathname === "/account",
    to: "/account",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (pathname) => pathname === "/dashboard",
    to: "/dashboard",
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
    label: "Binder",
    icon: BookOpenText,
    match: (pathname) => pathname === "/collection",
    to: "/collection",
  },
];

function WorkspaceLink({ active, icon: Icon, label, to }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
        active
          ? "border-navy bg-navy text-white shadow-sm"
          : "border-slate-200 bg-white text-steel hover:border-navy/20 hover:text-ink"
      }`}
      to={to}
    >
      <Icon size={15} />
      {label}
    </Link>
  );
}

export default function ProfileWorkspaceNav({ sellerId }) {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav
      aria-label="Profile workspace navigation"
      className="surface-card flex flex-wrap items-center gap-2 p-3 sm:p-4"
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
          label="Public profile"
          to={`/seller/${sellerId}`}
        />
      ) : null}
    </nav>
  );
}
