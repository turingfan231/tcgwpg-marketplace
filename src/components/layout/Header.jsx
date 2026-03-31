import {
  Bell,
  CalendarRange,
  ChevronDown,
  Download,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Search,
  Shield,
  Store,
  SunMedium,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";
import BrandLogo from "../shared/BrandLogo";
import UserAvatar from "../shared/UserAvatar";

const browseLinks = [
  { to: "/", label: "Home", clearSearch: false },
  { to: "/market", label: "All Listings", clearSearch: true },
  { to: "/market/pokemon", label: "Pokemon", clearSearch: true },
  { to: "/market/magic", label: "Magic", clearSearch: true },
  { to: "/market/one-piece", label: "One Piece", clearSearch: true },
  { to: "/market/dragon-ball-fusion-world", label: "Fusion World", clearSearch: true },
  { to: "/market/union-arena", label: "Union Arena", clearSearch: true },
  { to: "/wtb", label: "WTB", clearSearch: true },
];

const utilityLinks = [
  { to: "/stores", label: "Stores" },
  { to: "/sellers", label: "Sellers" },
  { to: "/events", label: "Events" },
];

export default function Header({
  canInstallApp = false,
  colorMode = "light",
  onOpenInstallPrompt = null,
  onToggleColorMode = null,
}) {
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
  const colorModeLabel = colorMode === "dark" ? "Dark mode" : "Light mode";
  const ColorModeIcon = colorMode === "dark" ? SunMedium : Moon;
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
      to: "/collection",
      label: "My binder",
      icon: Heart,
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
      <header className="app-header-chrome sticky top-0 z-40 border-b backdrop-blur-2xl">
        <div className="page-shell py-0.5 sm:py-1">
          <div className="console-panel px-2 py-1 sm:px-4 sm:py-1.5">
          <div className="relative flex items-center justify-between gap-1.5 sm:hidden">
            <div className="shrink-0">
              {onToggleColorMode ? (
                <button
                  aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  className="inline-flex h-[clamp(2rem,9vw,2.25rem)] w-[clamp(2rem,9vw,2.25rem)] items-center justify-center rounded-[12px] border border-[var(--line)] bg-[var(--surface-solid)] text-steel transition hover:border-slate-300 hover:text-ink"
                  type="button"
                  onClick={onToggleColorMode}
                >
                  <ColorModeIcon size={14} />
                </button>
              ) : (
                <div className="h-[clamp(2rem,9vw,2.25rem)] w-[clamp(2rem,9vw,2.25rem)]" />
              )}
            </div>

            <Link className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[46%]" to="/">
              <BrandLogo
                className="inline-flex"
                imgClassName="h-[clamp(1.45rem,5.7vw,1.95rem)] w-auto max-w-[clamp(5.8rem,24vw,7.6rem)] object-contain"
              />
            </Link>

            <div className="flex shrink-0 items-center justify-end gap-1">
              <Link
                aria-label="Open messages"
                className="relative inline-flex h-[clamp(2rem,9vw,2.25rem)] w-[clamp(2rem,9vw,2.25rem)] items-center justify-center rounded-[12px] border border-[var(--line)] bg-[var(--surface-solid)] text-steel transition hover:border-slate-300 hover:text-ink"
                to="/messages"
              >
                <MessageCircle size={14} />
                {safeUnreadMessageCount ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-orange px-1 text-[0.58rem] font-semibold text-white">
                    {safeUnreadMessageCount}
                  </span>
                ) : null}
              </Link>

              <button
                className="rounded-[12px] bg-orange px-[clamp(0.72rem,3.8vw,0.95rem)] py-[clamp(0.55rem,2.6vw,0.72rem)] text-[clamp(0.8rem,3.4vw,0.9rem)] font-semibold text-white shadow-soft transition hover:bg-[#d8332d]"
                type="button"
                onClick={() => openListing("WTS", "/dashboard")}
              >
                Sell
              </button>

              <button
                aria-label="Open navigation menu"
                className="inline-flex h-[clamp(2rem,9vw,2.25rem)] w-[clamp(2rem,9vw,2.25rem)] items-center justify-center rounded-[12px] border border-[var(--line)] bg-[var(--surface-solid)] text-steel transition hover:border-slate-300 hover:text-ink"
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
              >
                <Menu size={14} />
              </button>
            </div>
          </div>

          <div className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 sm:grid">
            <div className="flex min-w-0 items-start pl-1 pt-1 sm:pl-2 sm:pt-2">
              {onToggleColorMode ? (
                <>
                  <button
                    aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    className="inline-flex items-center justify-center rounded-full border border-[rgba(145,38,43,0.12)] bg-white/82 p-2 text-steel transition hover:border-slate-300 hover:text-ink sm:hidden"
                    type="button"
                    onClick={onToggleColorMode}
                  >
                    <ColorModeIcon size={16} />
                  </button>
                  <button
                    className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-solid)] px-4 py-2.5 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink sm:inline-flex"
                    type="button"
                    onClick={onToggleColorMode}
                  >
                    <ColorModeIcon size={16} />
                    {colorModeLabel}
                  </button>
                </>
              ) : null}
            </div>

            <Link className="flex min-w-0 justify-center" to="/">
              <div className="inline-flex pt-1 sm:pt-1.5">
                <BrandLogo
                  className="inline-flex"
                  imgClassName="h-9 w-auto max-w-[9.75rem] object-contain sm:h-[4.25rem] sm:max-w-[20rem] lg:h-[4.75rem] lg:max-w-[24rem]"
                />
              </div>
            </Link>

            <div className="flex shrink-0 items-center justify-end gap-1.5 self-start pt-1 sm:pt-2">
              <Link
                aria-label="Open messages"
                className="relative inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-solid)] p-2 text-steel transition hover:border-slate-300 hover:text-ink md:px-4 md:py-2.5"
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
                className="rounded-full bg-orange px-3 py-2 text-[0.88rem] font-semibold text-white shadow-soft transition hover:bg-[#d8332d] sm:px-5 sm:py-2.5 sm:text-sm"
                type="button"
                onClick={() => openListing("WTS", "/dashboard")}
              >
                <span>Sell cards</span>
              </button>

              <button
                aria-label="Open navigation menu"
                className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-solid)] p-2 text-steel transition hover:border-slate-300 hover:text-ink lg:hidden"
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
                      className="relative inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-solid)] px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-slate-300"
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
                      <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[18rem] rounded-[24px] border border-[var(--line)] bg-[var(--surface-solid)] p-2 shadow-[0_18px_44px_-22px_rgba(15,23,42,0.28)] backdrop-blur-xl">
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
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-solid)] px-4 py-2.5 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
                    to="/auth"
                  >
                    Login / Sign Up
                  </Link>
                )}
              </div>
            </div>
          </div>

          <form className="relative mt-1 min-w-0 sm:mt-0" onSubmit={handleSubmit}>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-steel sm:left-5"
              size={17}
            />
            <input
            className="w-full rounded-[13px] border border-[var(--line)] bg-[var(--input-bg)] py-2.25 pl-10 pr-3 text-[0.88rem] text-ink outline-none transition focus:border-navy focus:bg-[var(--surface-solid)] sm:rounded-[20px] sm:py-3.5 sm:pl-11 sm:pr-4 sm:text-sm"
              placeholder="Search cards, set codes, variants, or sellers"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </form>

          <div className="mt-3 hidden flex-col gap-3 border-t border-[rgba(145,38,43,0.12)] pt-3 sm:flex lg:flex-row lg:items-center lg:justify-between">
            <div className="header-chip-scroll flex items-center gap-2 overflow-x-auto">
              {browseLinks.map((link) => (
                <NavLink
                  key={link.to}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-navy text-white"
                        : "border border-transparent bg-[var(--surface-hover)] text-steel hover:border-[var(--line)] hover:bg-[var(--surface-solid)] hover:text-ink"
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
            className="app-drawer-chrome absolute right-0 top-0 flex h-full w-full max-w-[22rem] flex-col shadow-lift"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="section-kicker">Navigation</p>
                <BrandLogo className="mt-3" imgClassName="h-8 w-auto max-w-[9.2rem] object-contain" />
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
                  className="rounded-2xl border border-slate-200 bg-[var(--surface-solid)] px-4 py-3 text-sm font-semibold text-ink"
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
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-[var(--surface-solid)] px-4 py-3 text-sm font-semibold text-ink"
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
                            : "border border-slate-200 bg-[var(--surface-solid)] text-ink"
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
                    <div className="rounded-2xl border border-slate-200 bg-[var(--surface-solid)] px-4 py-4">
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
                          className="inline-flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-[var(--surface-solid)] px-4 py-3 text-sm font-semibold text-ink"
                          to={item.to}
                          onClick={() => setMobileDrawerOpen(false)}
                        >
                          <Icon size={16} />
                          {item.label}
                        </Link>
                      );
                    })}
                    <button
                      className="inline-flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-[var(--surface-solid)] px-4 py-3 text-sm font-semibold text-ink"
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
                    className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-[var(--surface-solid)] px-4 py-3 text-sm font-semibold text-ink"
                    to="/auth"
                    onClick={() => setMobileDrawerOpen(false)}
                  >
                    Login / Sign Up
                  </Link>
                )}
              </div>

              {onToggleColorMode ? (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Appearance
                  </p>
                  <button
                    className="mt-3 inline-flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-[var(--surface-solid)] px-4 py-3 text-sm font-semibold text-ink"
                    type="button"
                    onClick={() => {
                      onToggleColorMode();
                      setMobileDrawerOpen(false);
                    }}
                  >
                    <ColorModeIcon size={16} />
                    {colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  </button>
                </div>
              ) : null}

              {canInstallApp ? (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    App
                  </p>
                  <button
                    className="mt-3 inline-flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-[var(--surface-solid)] px-4 py-3 text-sm font-semibold text-ink"
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      onOpenInstallPrompt?.();
                    }}
                  >
                    <Download size={16} />
                    Install app
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
