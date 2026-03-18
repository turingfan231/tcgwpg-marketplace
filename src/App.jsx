import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import AppErrorBoundary from "./components/ui/AppErrorBoundary";
import PageSkeleton from "./components/ui/PageSkeleton";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import { MarketplaceProvider } from "./hooks/useMarketplace";

const AccountPage = lazy(() => import("./pages/AccountPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ListingDetailPage = lazy(() => import("./pages/ListingDetailPage"));
const MarketPage = lazy(() => import("./pages/MarketPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SellerProfilePage = lazy(() => import("./pages/SellerProfilePage"));
const SellersPage = lazy(() => import("./pages/SellersPage"));
const WantToBuyPage = lazy(() => import("./pages/WantToBuyPage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));

export default function App() {
  return (
    <AppErrorBoundary>
      <MarketplaceProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="page-shell py-8 pb-24 lg:py-10"><PageSkeleton cards={3} /></div>}>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/market" element={<MarketPage />} />
                <Route path="/market/:gameSlug" element={<MarketPage />} />
                <Route path="/listing/:listingId" element={<ListingDetailPage />} />
                <Route path="/seller/:sellerId" element={<SellerProfilePage />} />
                <Route path="/sellers" element={<SellersPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/wtb" element={<WantToBuyPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/messages/:threadId" element={<MessagesPage />} />
                </Route>
                <Route element={<ProtectedRoute requireAdmin />}>
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
                <Route path="*" element={<Navigate replace to="/" />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </MarketplaceProvider>
    </AppErrorBoundary>
  );
}
