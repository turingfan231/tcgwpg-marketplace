import {
  Bell,
  CalendarRange,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Shield,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";
import UserAvatar from "../shared/UserAvatar";

const browseLinks = [
  { to: "/", label: "Home", clearSearch: false },
  { to: "/market", label: "All Listings", clearSearch: true },
  { to: "/market/pokemon", label: "Pokemon", clearSearch: true },
  { to: "/market/magic", label: "Magic", clearSearch: true },
  { to: "/market/one-piece", label: "One Piece", clearSearch: true },
  { to: "/wtb", label: "WTB", clearSearch: true },
];

const utilityLinks = [
  { to: "/stores", label: "Stores" },
  { to: "/sellers", label: "Sellers" },
  { to: "/events", label: "Events" },
];

export default function Header() {
  const navigate = useNavigate();
  const accountMenuRef = useRef(null);
  const mobileDrawerRef = useRef(null);
  const {
    currentUser,
    globalSearch,
    isAdmin,
    isAuthenticated,
    isBetaTester,
    logout,
    openCreateListing,
    setGlobalSearch,
    unreadMessageCount,
    unreadNotificationCount,
  } = useMarketplace();
  const [searchValue, setSearchValue] = useState(globalSearch);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const safeUnreadMessageCount = Number(unreadMessageCount) || 0;
  const safeUnreadNotificationCount = Number(unreadNotificationCount) || 0;

  useEffect(() => {
    setSearchValue(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (mobileDrawerRef.current && !mobileDrawerRef.current.contains(event.target)) {
        setMobileDrawerOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setMobileDrawerOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileDrawerOpen]);

  function handleSubmit(event) {
    event.preventDefault();
    setGlobalSearch(searchValue);
    navigate("/market");
    setMobileDrawerOpen(false);
  }

  function handleBrowseLink(link) {
    if (link.clearSearch) {
      setGlobalSearch("");
    }
    setMobileDrawerOpen(false);
  }

  function openListing(type, fallbackPath) {
    const opened = openCreateListing({ type });
    if (!opened) {
      navigate("/auth", { state: { from: fallbackPath } });
    }
    setMobileDrawerOpen(false);
  }

  const menuNotificationCount = safeUnreadNotificationCount;
  const accountMenuItems = [
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
      label: "Wishlist",
      icon: Heart,
    },
    {
      to: "/notifications",
      label: `Alerts${safeUnreadNotificationCount ? ` (${safeUnreadNotificationCount})` : ""}`,
      icon: Bell,
    },
    ...((isBetaTester || isAdmin)
      ? [
          {
            to: "/beta/bugs",
            label: "Bug reports",
            icon: Shield,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            to: "/admin",
            label: "Admin panel",
            icon: Shield,
          },
        ]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[rgba(195,215,228,0.75)] bg-[rgba(238,246,250,0.86)] backdrop-blur-2xl">
        <div className="page-shell py-3 sm:py-4">
          <div className="console-panel px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <Link className="flex min-w-0 items-center gap-3" to="/">
              <div className="brand-pill shrink-0">
                <span className="brand-pill-mark">TCG</span>
                <span className="brand-pill-tag">WPG</span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-[1.2rem] font-semibold tracking-[-0.04em] text-ink sm:text-[1.7rem]">
                  Marketplace
                </p>
                <p className="hidden text-sm text-steel sm:block">Local TCG hub</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-steel sm:hidden">
                  Local TCG hub
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                className="relative inline-flex items-center justify-center rounded-full border border-[rgba(203,220,231,0.92)] bg-white/82 p-3 text-steel transition hover:border-slate-300 hover:text-ink md:px-4 md:py-2.5"
                to="/messages"
              >
                <MessageCircle size={18} />
                <span className="hidden md:inline">Messages</span>
                {safeUnreadMessageCount ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange px-1 text-[0.65rem] font-semibold text-white">
                    {safeUnreadMessageCount}
                  </span>
                ) : null}
              </Link>

              <button
                className="rounded-full bg-orange px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#d92f2f] sm:px-5 sm:py-2.5"
                type="button"
                onClick={() => openListing("WTS", "/dashboard")}
              >
                <span className="sm:hidden">Sell</span>
                <span className="hidden sm:inline">Sell cards</span>
              </button>

              <button
                aria-label="Open navigation menu"
                className="inline-flex items-center justify-center rounded-full border border-[rgba(203,220,231,0.92)] bg-white/82 p-3 text-steel transition hover:border-slate-300 hover:text-ink lg:hidden"
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
              >
                <Menu size={18} />
              </button>

              <div className="hidden items-center gap-2 lg:flex">
                {isAuthenticated ? (
                  <div className="relative" ref={accountMenuRef}>
                    <button
                      aria-expanded={menuOpen}
                      className="relative inline-flex items-center gap-2 rounded-full border border-[rgba(203,220,231,0.92)] bg-white/82 px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-slate-300"
                      type="button"
                      onClick={() => setMenuOpen((current) => !current)}
                    >
                      <UserAvatar className="h-6 w-6 text-[0.7rem]" user={currentUser} />
                      {currentUser?.firstName || "Account"}
                      <ChevronDown size={16} />
                      {menuNotificationCount ? (
                        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-navy px-1 text-[0.65rem] font-semibold text-white">
                          {menuNotificationCount}
                        </span>
                      ) : null}
                    </button>

                    {menuOpen ? (
                      <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[18rem] rounded-[24px] border border-[rgba(203,220,231,0.92)] bg-[rgba(248,252,255,0.96)] p-2 shadow-[0_18px_44px_-22px_rgba(15,23,42,0.28)] backdrop-blur-xl">
                        <div className="border-b border-slate-100 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar className="h-11 w-11 text-sm" user={currentUser} />
                            <div className="min-w-0">
                              <p className="font-semibold text-ink">
                                {currentUser?.firstName || "Account"}
                              </p>
                              <p className="truncate text-sm text-steel">{currentUser?.email}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-1 p-2">
                          {accountMenuItems.map((item) => {
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
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(203,220,231,0.92)] bg-white/82 px-4 py-2.5 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
                    to="/auth"
                  >
                    Login / Sign Up
                  </Link>
                )}
              </div>
            </div>
          </div>

          <form className="relative mt-3 min-w-0" onSubmit={handleSubmit}>
            <Search
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-steel"
              size={18}
            />
            <input
              className="w-full rounded-[22px] border border-[rgba(203,220,231,0.92)] bg-[rgba(250,253,255,0.8)] py-3 pl-12 pr-4 text-sm text-ink outline-none transition focus:border-navy focus:bg-white sm:py-3.5"
              placeholder="Search cards, set codes, variants, or sellers"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </form>

          <div className="mt-4 hidden flex-col gap-3 border-t border-[rgba(195,215,228,0.82)] pt-4 sm:flex lg:flex-row lg:items-center lg:justify-between">
            <div className="header-chip-scroll flex items-center gap-2 overflow-x-auto">
              {browseLinks.map((link) => (
                <NavLink
                  key={link.to}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-navy text-white"
                        : "border border-transparent bg-white/55 text-steel hover:border-[rgba(203,220,231,0.92)] hover:bg-white/82 hover:text-ink"
                    }`
                  }
                  onClick={() => handleBrowseLink(link)}
                  to={link.to}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            <div className="hidden items-center gap-5 lg:flex">
              {utilityLinks.map((link) => (
                <NavLink
                  key={link.to}
                  className={({ isActive }) =>
                    `text-sm font-semibold transition ${
                      isActive ? "text-ink" : "text-steel hover:text-ink"
                    }`
                  }
                  to={link.to}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
          </div>
        </div>
      </header>

      {mobileDrawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close mobile navigation"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div
            ref={mobileDrawerRef}
            className="absolute right-0 top-0 flex h-full w-full max-w-[22rem] flex-col bg-[linear-gradient(180deg,#f4f9fc_0%,#dce9f0_100%)] shadow-lift"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="section-kicker">Navigation</p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-ink">
                  TCGWPG
                </p>
              </div>
              <button
                className="rounded-full border border-slate-200 p-2 text-steel"
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="grid gap-2">
                <Link
                  className="rounded-2xl bg-orange px-4 py-3 text-sm font-semibold text-white"
                  to="#"
                  onClick={(event) => {
                    event.preventDefault();
                    openListing("WTS", "/dashboard");
                  }}
                >
                  Sell cards
                </Link>
                <Link
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink"
                  to="#"
                  onClick={(event) => {
                    event.preventDefault();
                    openListing("WTB", "/wtb");
                  }}
                >
                  Post WTB
                </Link>
              </div>

              <div className="mt-6 space-y-2">
                {[
                  { to: "/stores", label: "Stores", icon: Store },
                  { to: "/sellers", label: "Browse sellers", icon: Store },
                  { to: "/events", label: "Events", icon: CalendarRange },
                  { to: "/messages", label: "Messages", icon: MessageCircle, count: safeUnreadMessageCount },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-[#faf7f1] px-4 py-3 text-sm font-semibold text-ink"
                      to={item.to}
                      onClick={() => setMobileDrawerOpen(false)}
                    >
                      <span className="inline-flex items-center gap-3">
                        <Icon size={16} />
                        {item.label}
                      </span>
                      {item.count ? (
                        <span className="rounded-full bg-orange px-2 py-0.5 text-xs text-white">
                          {item.count}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                  Browse
                </p>
                <div className="mt-3 grid gap-2">
                  {browseLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      className={({ isActive }) =>
                        `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                          isActive
                            ? "bg-navy text-white"
                            : "border border-slate-200 bg-white text-ink"
                        }`
                      }
                      onClick={() => handleBrowseLink(link)}
                      to={link.to}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                  Workspace
                </p>
                {isAuthenticated ? (
                  <div className="mt-3 space-y-2">
                    <div className="rounded-2xl border border-slate-200 bg-[#faf7f1] px-4 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar className="h-11 w-11 text-sm" user={currentUser} />
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{currentUser?.firstName || "Account"}</p>
                          <p className="mt-1 truncate text-sm text-steel">{currentUser?.email}</p>
                        </div>
                      </div>
                    </div>
                    {accountMenuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          className="inline-flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink"
                          to={item.to}
                          onClick={() => setMobileDrawerOpen(false)}
                        >
                          <Icon size={16} />
                          {item.label}
                        </Link>
                      );
                    })}
                    <button
                      className="inline-flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink"
                      type="button"
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        logout();
                        navigate("/");
                      }}
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink"
                    to="/auth"
                    onClick={() => setMobileDrawerOpen(false)}
                  >
                    Login / Sign Up
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
