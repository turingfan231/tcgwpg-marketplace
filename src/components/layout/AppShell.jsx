import { AlertTriangle, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";
import CreateListingModal from "../modals/CreateListingModal";
import AppLaunchScreen from "../ui/AppLaunchScreen";
import InstallPrompt from "../ui/InstallPrompt";
import ToastStack from "../ui/ToastStack";
import Header from "./Header";
import MobileTabBar from "./MobileTabBar";

const INSTALL_DISMISS_KEY = "tcgwpg.installPromptDismissed";

export default function AppShell() {
  const location = useLocation();
  const {
    authReady,
    closeCreateListing,
    dismissToast,
    isCreateListingOpen,
    isSuspended,
    loading,
    toastItems,
  } = useMarketplace();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installVisible, setInstallVisible] = useState(false);
  const [appBooted, setAppBooted] = useState(false);

  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    const dismissed = window.localStorage.getItem(INSTALL_DISMISS_KEY) === "1";
    const userAgent = window.navigator.userAgent || "";
    const isIos =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      if (!dismissed && isMobile && !isStandalone) {
        setInstallVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setInstallVisible(false);
      setDeferredPrompt(null);
      window.localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (!dismissed && isMobile && !isStandalone) {
      setInstallVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isStandalone]);

  function dismissInstallPrompt() {
    setInstallVisible(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    }
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      dismissInstallPrompt();
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => null);
    setDeferredPrompt(null);
    dismissInstallPrompt();
  }

  const installState = useMemo(() => {
    if (!installVisible || typeof window === "undefined" || isStandalone) {
      return { visible: false, mode: "native" };
    }

    const userAgent = window.navigator.userAgent || "";
    const isIos =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

    return {
      visible: true,
      mode: deferredPrompt ? "native" : isIos ? "ios" : "manual",
    };
  }, [deferredPrompt, installVisible, isStandalone]);

  useEffect(() => {
    if (authReady && !loading) {
      const timeout = window.setTimeout(() => setAppBooted(true), 180);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [authReady, loading]);

  const showLaunchScreen = !appBooted && (!authReady || loading);
  const showTopProgress = appBooted && loading;

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      {showLaunchScreen ? <AppLaunchScreen /> : null}
      {showTopProgress ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] bg-transparent">
          <div className="h-full w-full overflow-hidden">
            <div className="app-top-loader" />
          </div>
        </div>
      ) : null}
      <Header />
      {isSuspended ? (
        <div className="border-b border-rose-200 bg-rose-50">
          <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div className="inline-flex items-center gap-2 font-semibold text-rose-800">
              <AlertTriangle size={16} />
              This account is suspended. Browsing is still available, but posting, messaging,
              offers, and seller actions are disabled until review is complete.
            </div>
            <Link
              className="rounded-full border border-rose-200 bg-white px-4 py-2 font-semibold text-rose-700"
              to="/account"
            >
              Appeal or review status
            </Link>
          </div>
        </div>
      ) : null}
      <main className="page-shell py-5 pb-[calc(7.75rem+env(safe-area-inset-bottom))] sm:py-6 lg:py-10 lg:pb-24">
        <div key={location.pathname} className="app-page-transition">
          <Outlet />
        </div>
      </main>

      <footer className="hidden border-t border-slate-200/80 bg-[#f8f4ec] md:block">
        <div className="page-shell py-10">
          <div className="rounded-[30px] border border-slate-200/80 bg-white px-6 py-7 shadow-soft sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr_0.8fr]">
              <div>
                <p className="section-kicker">TCGWPG</p>
                <h2 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.04em] text-ink">
                  Local cards, local meetups, less clutter.
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-7 text-steel">
                  Built for Winnipeg players who want a cleaner way to buy, sell, trade,
                  and plan meetups without leaving the city.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Browse
                  </p>
                  <div className="mt-4 grid gap-3 text-sm font-semibold text-ink">
                    <Link to="/market">All listings</Link>
                    <Link to="/wtb">WTB board</Link>
                    <Link to="/sellers">Sellers</Link>
                    <Link to="/events">Events</Link>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Account
                  </p>
                  <div className="mt-4 grid gap-3 text-sm font-semibold text-ink">
                    <Link to="/messages">Messages</Link>
                    <Link to="/dashboard">Dashboard</Link>
                    <Link to="/wishlist">Wishlist</Link>
                    <Link to="/account">Settings</Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-[22px] bg-[#f8f5ee] px-4 py-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <MapPin size={16} className="text-navy" />
                    Winnipeg-first
                  </div>
                  <p className="mt-2 text-sm leading-6 text-steel">
                    Neighborhood filters and postal areas keep meetups practical.
                  </p>
                </div>
                <div className="rounded-[22px] bg-[#f8f5ee] px-4 py-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <Clock3 size={16} className="text-orange" />
                    Faster deals
                  </div>
                  <p className="mt-2 text-sm leading-6 text-steel">
                    Messages, offers, and follow-up stay attached to the listing.
                  </p>
                </div>
                <div className="rounded-[22px] bg-[#f8f5ee] px-4 py-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <ShieldCheck size={16} className="text-navy" />
                    Trust tools
                  </div>
                  <p className="mt-2 text-sm leading-6 text-steel">
                    Reviews, badges, and admin moderation help keep the market clean.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <div className="border-t border-slate-200/70 bg-white/90 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-steel md:hidden">
        TCGWPG | Local cards, faster meetups
      </div>

      {isCreateListingOpen ? (
        <CreateListingModal onClose={closeCreateListing} />
      ) : null}
      <InstallPrompt
        installState={installState}
        onDismiss={dismissInstallPrompt}
        onInstall={handleInstall}
      />
      <MobileTabBar />
      <ToastStack items={toastItems} onDismiss={dismissToast} />
    </div>
  );
}
