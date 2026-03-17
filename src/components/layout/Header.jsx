import {
  Bell,
  CircleUserRound,
  CalendarRange,
  Heart,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Search,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";

const topLinks = [
  {
    to: "/account",
    label: "Account",
    icon: CircleUserRound,
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/wishlist",
    label: "Wishlist",
    icon: Heart,
  },
  {
    to: "/messages",
    label: "Messages",
    icon: MessageCircle,
  },
  {
    to: "/notifications",
    label: "Alerts",
    icon: Bell,
  },
];

const lowerNavLinks = [
  { to: "/", label: "Home", clearSearch: false },
  { to: "/market/magic", label: "Magic", clearSearch: true },
  { to: "/market/pokemon", label: "Pokemon", clearSearch: true },
  { to: "/market/one-piece", label: "One Piece", clearSearch: true },
  { to: "/market", label: "All Listings", clearSearch: true },
  { to: "/wtb", label: "WTB", clearSearch: true },
  { to: "/events", label: "Events", clearSearch: false },
];

export default function Header() {
  const navigate = useNavigate();
  const {
    currentUser,
    globalSearch,
    isAdmin,
    isAuthenticated,
    logout,
    openCreateListing,
    setGlobalSearch,
    unreadNotificationCount,
    wishlist,
  } = useMarketplace();
  const [searchValue, setSearchValue] = useState(globalSearch);

  useEffect(() => {
    setSearchValue(globalSearch);
  }, [globalSearch]);

  function handleSubmit(event) {
    event.preventDefault();
    setGlobalSearch(searchValue);
    navigate("/market");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="page-shell grid gap-4 py-4 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-center 2xl:grid-cols-[auto_minmax(24rem,1fr)_auto]">
        <Link
          className="flex items-center gap-4 rounded-[30px] border border-slate-200/80 bg-white px-4 py-3 shadow-soft"
          to="/"
        >
          <div className="logo-mark">
            <span>W</span>
          </div>
          <div>
            <p className="font-display text-[1.8rem] font-semibold tracking-[-0.03em] text-ink">
              TCGWPG
            </p>
            <p className="text-sm text-steel">Winnipeg trading card marketplace</p>
          </div>
        </Link>

        <form className="relative min-w-0 xl:mx-6" onSubmit={handleSubmit}>
          <div className="rounded-[30px] border border-slate-200/80 bg-[#f7f5ef] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <Search
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-steel"
              size={18}
            />
            <input
              className="w-full rounded-[24px] border border-transparent bg-white py-3.5 pl-12 pr-4 text-sm text-ink outline-none transition focus:border-navy focus:bg-white"
              placeholder="Search cards, printings, sets, or sellers"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </div>
        </form>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-3 xl:col-span-2 xl:justify-between 2xl:col-span-1 2xl:justify-end">
          <div className="header-chip-scroll flex max-w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto rounded-[28px] border border-slate-200/80 bg-white px-2 py-2 shadow-soft">
            {[
              ...topLinks,
              ...(isAdmin
                ? [
                    {
                      to: "/admin",
                      label: "Admin",
                      icon: Shield,
                    },
                  ]
                : []),
            ].map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-navy text-white shadow-soft"
                        : "text-steel hover:bg-slate-100 hover:text-ink"
                    }`
                  }
                  to={link.to}
                >
                  <Icon size={16} />
                  {link.label}
                  {link.label === "Wishlist" ? (
                    <span className="rounded-full bg-orange/10 px-2 py-0.5 text-xs text-orange">
                      {wishlist.length}
                    </span>
                  ) : null}
                  {link.label === "Alerts" && unreadNotificationCount ? (
                    <span className="rounded-full bg-orange px-2 py-0.5 text-xs text-white">
                      {unreadNotificationCount}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </div>

          <button
            className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[#ff8d00]"
            type="button"
            onClick={() => {
              const opened = openCreateListing();
              if (!opened) {
                navigate("/auth", { state: { from: "/dashboard" } });
              }
            }}
          >
            Sell cards
          </button>

          {isAuthenticated ? (
            <>
              <Link
                className="max-w-[14rem] truncate rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
                to="/account"
              >
                {currentUser?.name}
              </Link>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
                type="button"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
              to="/auth"
            >
              Login / Sign Up
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200/80 bg-[#17394a] text-white">
        <div className="page-shell flex flex-nowrap items-center gap-1 overflow-x-auto py-3">
          {lowerNavLinks.map((link) => (
            <NavLink
              key={link.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white/16 text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`
              }
              onClick={() => {
                if (link.clearSearch) {
                  setGlobalSearch("");
                }
              }}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
          <Link
            className="ml-auto inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            to="/events"
          >
            <CalendarRange size={15} />
            Winnipeg Events
          </Link>
        </div>
      </div>
    </header>
  );
}
