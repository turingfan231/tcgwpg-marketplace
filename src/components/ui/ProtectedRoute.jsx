import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";

export default function ProtectedRoute({ requireAdmin = false }) {
  const { authReady, isAdmin, isAuthenticated } = useMarketplace();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="panel flex min-h-64 items-center justify-center px-6 py-12 text-center text-steel">
        Loading account...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/auth" />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}
