import { Home, LayoutGrid, MessageCircle, Plus, UserRound } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";

function navClass(isActive) {
  return `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-[11px] font-semibold transition ${
    isActive ? "bg-[var(--surface-solid)] text-navy shadow-sm" : "text-steel"
  }`;
}

export default function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, openCreateListing, unreadMessageCount } = useMarketplace();

  const unread = Number(unreadMessageCount) || 0;

  function handleSell() {
    const opened = openCreateListing({ type: "WTS" });
    if (!opened) {
      navigate("/auth", { state: { from: location.pathname } });
    }
  }

  return (
    <nav className="app-footer-chrome fixed inset-x-0 bottom-0 z-40 border-t px-3 pb-[calc(0.8rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl lg:hidden">
      <div className="mx-auto flex max-w-xl items-end gap-2 rounded-[24px] border border-[var(--line)] bg-[var(--surface-alt)] px-2 py-2 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)]">
        <NavLink className={({ isActive }) => navClass(isActive)} to="/">
          <Home size={18} />
          Home
        </NavLink>

        <NavLink className={({ isActive }) => navClass(isActive)} to="/market">
          <LayoutGrid size={18} />
          Browse
        </NavLink>

        <button
          aria-label="Create listing"
          className="relative -mt-7 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange text-white shadow-[0_20px_32px_-18px_rgba(177,29,35,0.55)] transition hover:bg-[#d8332d]"
          type="button"
          onClick={handleSell}
        >
          <Plus size={22} />
        </button>

        <NavLink className={({ isActive }) => navClass(isActive)} to="/messages">
          <span className="relative inline-flex">
            <MessageCircle size={18} />
            {unread ? (
              <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-orange px-1 text-[9px] font-semibold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </span>
          Inbox
        </NavLink>

        <NavLink className={({ isActive }) => navClass(isActive)} to={currentUser ? "/account" : "/auth"}>
          <UserRound size={18} />
          {currentUser ? "Account" : "Login"}
        </NavLink>
      </div>
    </nav>
  );
}
