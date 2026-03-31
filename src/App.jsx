import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import AppErrorBoundary from "./components/ui/AppErrorBoundary";
import AppLaunchScreen from "./components/ui/AppLaunchScreen";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import { MarketplaceProvider } from "./hooks/useMarketplace";
import AccountPageDev from "./pages/AccountPage";
import AdminPageDev from "./pages/AdminPage";
import AuthPageDev from "./pages/AuthPage";
import BugReportsPageDev from "./pages/BugReportsPage";
import CollectionPageDev from "./pages/CollectionPage";
import DashboardPageDev from "./pages/DashboardPage";
import EventsPageDev from "./pages/EventsPage";
import HomePageDev from "./pages/HomePage";
import ListingDetailPageDev from "./pages/ListingDetailPage";
import MarketPageDev from "./pages/MarketPage";
import MessagesPageDev from "./pages/MessagesPage";
import NotificationsPageDev from "./pages/NotificationsPage";
import SellerProfilePageDev from "./pages/SellerProfilePage";
import SellersPageDev from "./pages/SellersPage";
import StoreProfilePageDev from "./pages/StoreProfilePage";
import StoresPageDev from "./pages/StoresPage";
import WantToBuyPageDev from "./pages/WantToBuyPage";
import WishlistPageDev from "./pages/WishlistPage";

const isDev = import.meta.env.DEV;

const AccountPage = isDev ? AccountPageDev : lazy(() => import("./pages/AccountPage"));
const AdminPage = isDev ? AdminPageDev : lazy(() => import("./pages/AdminPage"));
const AuthPage = isDev ? AuthPageDev : lazy(() => import("./pages/AuthPage"));
const BugReportsPage = isDev ? BugReportsPageDev : lazy(() => import("./pages/BugReportsPage"));
const CollectionPage = isDev ? CollectionPageDev : lazy(() => import("./pages/CollectionPage"));
const DashboardPage = isDev ? DashboardPageDev : lazy(() => import("./pages/DashboardPage"));
const EventsPage = isDev ? EventsPageDev : lazy(() => import("./pages/EventsPage"));
const HomePage = isDev ? HomePageDev : lazy(() => import("./pages/HomePage"));
const ListingDetailPage = isDev
  ? ListingDetailPageDev
  : lazy(() => import("./pages/ListingDetailPage"));
const MarketPage = isDev ? MarketPageDev : lazy(() => import("./pages/MarketPage"));
const MessagesPage = isDev ? MessagesPageDev : lazy(() => import("./pages/MessagesPage"));
const NotificationsPage = isDev
  ? NotificationsPageDev
  : lazy(() => import("./pages/NotificationsPage"));
const SellerProfilePage = isDev
  ? SellerProfilePageDev
  : lazy(() => import("./pages/SellerProfilePage"));
const SellersPage = isDev ? SellersPageDev : lazy(() => import("./pages/SellersPage"));
const StoreProfilePage = isDev
  ? StoreProfilePageDev
  : lazy(() => import("./pages/StoreProfilePage"));
const StoresPage = isDev ? StoresPageDev : lazy(() => import("./pages/StoresPage"));
const WantToBuyPage = isDev ? WantToBuyPageDev : lazy(() => import("./pages/WantToBuyPage"));
const WishlistPage = isDev ? WishlistPageDev : lazy(() => import("./pages/WishlistPage"));

export default function App() {
  return (
    <AppErrorBoundary>
      <MarketplaceProvider>
        <BrowserRouter
          future={{
            v7_relativeSplatPath: true,
            v7_startTransition: true,
          }}
        >
          <Suspense fallback={<AppLaunchScreen compact />}>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/market" element={<MarketPage />} />
                <Route path="/market/:gameSlug" element={<MarketPage />} />
                <Route path="/listing/:listingId" element={<ListingDetailPage />} />
                <Route path="/seller/:sellerId" element={<SellerProfilePage />} />
                <Route path="/sellers" element={<SellersPage />} />
                <Route path="/stores" element={<StoresPage />} />
                <Route path="/stores/:storeSlug" element={<StoreProfilePage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/wtb" element={<WantToBuyPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/collection" element={<CollectionPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/messages/:threadId" element={<MessagesPage />} />
                </Route>
                <Route element={<ProtectedRoute />}>
                  <Route path="/beta/bugs" element={<BugReportsPage />} />
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
