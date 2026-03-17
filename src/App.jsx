import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import { MarketplaceProvider } from "./hooks/useMarketplace";
import AccountPage from "./pages/AccountPage";
import AdminPage from "./pages/AdminPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import EventsPage from "./pages/EventsPage";
import HomePage from "./pages/HomePage";
import ListingDetailPage from "./pages/ListingDetailPage";
import MarketPage from "./pages/MarketPage";
import MessagesPage from "./pages/MessagesPage";
import NotificationsPage from "./pages/NotificationsPage";
import SellerProfilePage from "./pages/SellerProfilePage";
import WantToBuyPage from "./pages/WantToBuyPage";
import WishlistPage from "./pages/WishlistPage";

export default function App() {
  return (
    <MarketplaceProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/market/:gameSlug" element={<MarketPage />} />
            <Route path="/listing/:listingId" element={<ListingDetailPage />} />
            <Route path="/seller/:sellerId" element={<SellerProfilePage />} />
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
      </BrowserRouter>
    </MarketplaceProvider>
  );
}
