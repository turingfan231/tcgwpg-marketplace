import {
  Bell,
  CalendarRange,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Search,
  Shield,
  Store,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";

const browseLinks = [
  { to: "/", label: "Home", clearSearch: false },
  { to: "/market", label: "All Listings", clearSearch: true },
  { to: "/market/pokemon", label: "Pokemon", clearSearch: true },
  { to: "/market/magic", label: "Magic", clearSearch: true },
  { to: "/market/one-piece", label: "One Piece", clearSearch: true },
  { to: "/wtb", label: "WTB", clearSearch: true },
];

export default function Header() {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const {
    currentUser,
    globalSearch,
    isAdmin,
    isAuthenticated,
    logout,
    openCreateListing,
    setGlobalSearch,
    unreadMessageCount,
    unreadNotificationCount,
    wishlist,
  } = useMarketplace();
  const [searchValue, setSearchValue] = useState(globalSearch);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setSearchValue(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    setGlobalSearch(searchValue);
    navigate("/market");
  }

  function handleBrowseLink(link) {
    if (link.clearSearch) {
      setGlobalSearch("");
    }
  }

  function openListing(type, fallbackPath) {
    const opened = openCreateListing({ type });
    if (!opened) {
      navigate("/auth", { state: { from: fallbackPath } });
    }
  }

  const menuNotificationCount = unreadNotificationCount + wishlist.length;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/94 backdrop-blur-xl">
      <div className="page-shell py-4">
        <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
          <Link className="flex items-center gap-4" to="/">
            <div className="logo-mark">
              <span>W</span>
            </div>
            <div>
              <p className="font-display text-[1.7rem] font-semibold tracking-[-0.04em] text-ink">
                TCGWPG
              </p>
              <p className="text-sm text-steel">Winnipeg card marketplace</p>
            </div>
          </Link>

          <form className="relative min-w-0" onSubmit={handleSubmit}>
            <Search
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-steel"
              size={18}
            />
            <input
              className="w-full rounded-full border border-slate-200 bg-[#f6f2ea] py-3.5 pl-12 pr-4 text-sm text-ink outline-none transition focus:border-navy focus:bg-white"
              placeholder="Search cards, set codes, variants, or sellers"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </form>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-steel transition hover:bg-slate-100 hover:text-ink md:inline-flex"
              to="/sellers"
            >
              Sellers
            </Link>
            <Link
              className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-steel transition hover:bg-slate-100 hover:text-ink lg:inline-flex"
              to="/events"
            >
              Events
            </Link>
            <Link
              className="relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
              to="/messages"
            >
              <MessageCircle size={16} />
              Messages
              {unreadMessageCount ? (
                <span className="rounded-full bg-orange px-2 py-0.5 text-xs text-white">
                  {unreadMessageCount}
                </span>
              ) : null}
            </Link>
            <button
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-slate-300 hover:bg-slate-50"
              type="button"
              onClick={() => openListing("WTB", "/wtb")}
            >
              Post WTB
            </button>
            <button
              className="rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-[#ff8d00]"
              type="button"
              onClick={() => openListing("WTS", "/dashboard")}
            >
              Sell cards
            </button>

            {isAuthenticated ? (
              <div className="relative" ref={menuRef}>
                <button
                  aria-expanded={menuOpen}
                  className="relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-slate-300"
                  type="button"
                  onClick={() => setMenuOpen((current) => !current)}
                >
                  <UserRound size={16} />
                  {currentUser?.firstName || "Account"}
                  <ChevronDown size={16} />
                  {menuNotificationCount ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-navy px-1 text-[0.65rem] font-semibold text-white">
                      {menuNotificationCount}
                    </span>
                  ) : null}
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[18rem] rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_18px_44px_-22px_rgba(15,23,42,0.28)]">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="font-semibold text-ink">
                        {currentUser?.firstName || "Account"}
                      </p>
                      <p className="truncate text-sm text-steel">{currentUser?.email}</p>
                    </div>

                    <div className="grid gap-1 p-2">
                      {[
                        {
                          to: "/account",
                          label: "Account settings",
                          icon: UserRound,
                        },
                        {
                          to: "/dashboard",
                          label: "Dashboard",
                          icon: LayoutDashboard,
                        },
                        {
                          to: `/seller/${currentUser?.id}`,
                          label: "My seller page",
                          icon: Store,
                        },
                        {
                          to: "/wishlist",
                          label: `Wishlist${wishlist.length ? ` (${wishlist.length})` : ""}`,
                          icon: Heart,
                        },
                        {
                          to: "/notifications",
                          label: `Alerts${unreadNotificationCount ? ` (${unreadNotificationCount})` : ""}`,
                          icon: Bell,
                        },
                        ...(isAdmin
                          ? [
                              {
                                to: "/admin",
                                label: "Admin panel",
                                icon: Shield,
                              },
                            ]
                          : []),
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.to}
                            className="inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-steel transition hover:bg-slate-50 hover:text-ink"
                            to={item.to}
                            onClick={() => setMenuOpen(false)}
                          >
                            <Icon size={16} />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-100 p-2">
                      <button
                        className="inline-flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-steel transition hover:bg-slate-50 hover:text-ink"
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                          navigate("/");
                        }}
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
                to="/auth"
              >
                Login / Sign Up
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4">
          {browseLinks.map((link) => (
            <NavLink
              key={link.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-navy text-white"
                    : "text-steel hover:bg-slate-100 hover:text-ink"
                }`
              }
              onClick={() => handleBrowseLink(link)}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
          <Link
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#f6f2ea] px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
            to="/events"
          >
            <CalendarRange size={15} />
            Winnipeg events
          </Link>
        </div>
      </div>
    </header>
  );
}
