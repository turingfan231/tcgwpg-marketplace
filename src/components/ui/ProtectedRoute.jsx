import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";
import { m } from "../../mobile/design";
import { MobileScreen, ScreenSection } from "../../mobile/primitives";

export default function ProtectedRoute({ requireAdmin = false, requireBadge = "" }) {
  const { authReady, currentUser, isAdmin, isAuthenticated } = useMarketplace();
  const location = useLocation();

  if (!authReady) {
    return (
      <MobileScreen className="pb-24">
        <ScreenSection className="flex flex-1 items-center justify-center">
          <div
            className="w-full rounded-[22px] border px-5 py-8 text-center"
            style={{ background: m.surface, borderColor: m.border, boxShadow: m.shadowPanel }}
          >
            <div
              className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.08)] border-t-[var(--accent)]"
              style={{ "--accent": m.red }}
            />
            <p className="mt-4 text-[13px] text-white" style={{ fontWeight: 700 }}>
              Loading account
            </p>
            <p className="mt-1 text-[11px]" style={{ color: m.textSecondary }}>
              Pulling your marketplace workspace.
            </p>
          </div>
        </ScreenSection>
      </MobileScreen>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/auth" />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate replace to="/dashboard" />;
  }

  if (
    requireBadge &&
    !isAdmin &&
    (!Array.isArray(currentUser?.badges) || !currentUser.badges.includes(requireBadge))
  ) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}
