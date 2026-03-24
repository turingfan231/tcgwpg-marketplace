import { AlertTriangle, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";
import CreateListingModal from "../modals/CreateListingModal";
import OnboardingModal from "../modals/OnboardingModal";
import AppLaunchScreen from "../ui/AppLaunchScreen";
import InstallPrompt from "../ui/InstallPrompt";
import ToastStack from "../ui/ToastStack";
import Header from "./Header";
import MobileTabBar from "./MobileTabBar";

const INSTALL_DISMISS_KEY = "tcgwpg.installPromptDismissed";
const ONBOARDING_DISMISS_KEY = "tcgwpg.onboardingDismissed";

export default function AppShell() {
  const location = useLocation();
  const {
    authReady,
    closeCreateListing,
    currentUser,
    dismissToast,
    isCreateListingOpen,
    isViewingAs,
    isSuspended,
    stopViewAs,
    toastItems,
    viewedUserRecord,
  } = useMarketplace();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installVisible, setInstallVisible] = useState(false);
  const [appBooted, setAppBooted] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

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

    const dismissed = window.localStorage.getItem(INSTALL_DISMISS_KEY) === "1";
    const userAgent = window.navigator.userAgent || "";
    const isIos =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      if (!dismissed && !isStandalone) {
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

    if (!dismissed && !isStandalone) {
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
      return { visible: false, mode: "native", mobile: false };
    }

    const userAgent = window.navigator.userAgent || "";
    const isIos =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const mobile = window.matchMedia("(max-width: 1023px)").matches;

    return {
      visible: true,
      mobile,
      mode: deferredPrompt ? "native" : isIos ? "ios" : "manual",
    };
  }, [deferredPrompt, installVisible, isStandalone]);

  const activeTheme = useMemo(
    () => ({
      id: "collector-strip",
      primary: "#b11d23",
      primaryRgb: "177, 29, 35",
      accent: "#ef3b33",
      accentRgb: "239, 59, 51",
    }),
    [],
  );

  const themeStyle = useMemo(
    () => ({
      "--theme-primary": activeTheme.primary,
      "--theme-primary-rgb": activeTheme.primaryRgb,
      "--theme-accent": activeTheme.accent,
      "--theme-accent-rgb": activeTheme.accentRgb,
    }),
    [activeTheme],
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const root = document.documentElement;
    root.style.setProperty("--theme-primary", activeTheme.primary);
    root.style.setProperty("--theme-primary-rgb", activeTheme.primaryRgb);
    root.style.setProperty("--theme-accent", activeTheme.accent);
    root.style.setProperty("--theme-accent-rgb", activeTheme.accentRgb);

    return undefined;
  }, [activeTheme]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setAppBooted(true), 1400);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const dismissedUserId = window.localStorage.getItem(ONBOARDING_DISMISS_KEY) || "";
    setOnboardingDismissed(dismissedUserId === String(currentUser?.id || ""));
  }, [currentUser?.id]);

  useEffect(() => {
    if (!appBooted && authReady) {
      const timeout = window.setTimeout(() => setAppBooted(true), 180);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [appBooted, authReady]);

  const showLaunchScreen = !appBooted;
  const showOnboarding =
    authReady &&
    !showLaunchScreen &&
    Boolean(currentUser) &&
    !Boolean(currentUser?.onboardingComplete) &&
    !onboardingDismissed;

  function handleCloseOnboarding() {
    setOnboardingDismissed(true);
    if (typeof window !== "undefined" && currentUser?.id) {
      window.localStorage.setItem(ONBOARDING_DISMISS_KEY, String(currentUser.id));
    }
  }

  return (
    <div
      className="min-h-screen bg-transparent"
      data-theme-preset={activeTheme.id}
      style={themeStyle}
    >
      {showLaunchScreen ? <AppLaunchScreen /> : null}
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
      {isViewingAs && viewedUserRecord ? (
        <div className="border-b border-[rgba(177,29,35,0.18)] bg-[rgba(177,29,35,0.08)]">
          <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div className="inline-flex items-center gap-2 font-semibold text-ink">
              <ShieldCheck size={16} className="text-navy" />
              View-as mode: public troubleshooting view for {viewedUserRecord.publicName || viewedUserRecord.name}
            </div>
            <button
              className="rounded-full border border-[rgba(240,55,55,0.22)] bg-white px-4 py-2 font-semibold text-ink"
              type="button"
              onClick={() => void stopViewAs()}
            >
              Exit view-as mode
            </button>
          </div>
        </div>
      ) : null}
      <main className="page-shell py-5 pb-[calc(7.75rem+env(safe-area-inset-bottom))] sm:py-6 lg:py-10 lg:pb-24">
        <div key={location.pathname} className="app-page-transition">
          <Outlet />
        </div>
      </main>

      <footer className="hidden border-t border-[rgba(145,38,43,0.12)] bg-transparent md:block">
        <div className="page-shell py-10">
          <div className="console-shell px-6 py-7 sm:px-8">
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
                <div className="console-well px-4 py-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <MapPin size={16} className="text-navy" />
                    Winnipeg-first
                  </div>
                  <p className="mt-2 text-sm leading-6 text-steel">
                    Neighborhood filters and postal areas keep meetups practical.
                  </p>
                </div>
                <div className="console-well px-4 py-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <Clock3 size={16} className="text-orange" />
                    Faster deals
                  </div>
                  <p className="mt-2 text-sm leading-6 text-steel">
                    Messages, offers, and follow-up stay attached to the listing.
                  </p>
                </div>
                <div className="console-well px-4 py-4">
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

      <div className="border-t border-[rgba(145,38,43,0.12)] bg-[rgba(251,248,248,0.96)] px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-steel md:hidden">
        TCGWPG | Local cards, faster meetups
      </div>

      {isCreateListingOpen ? (
        <CreateListingModal onClose={closeCreateListing} />
      ) : null}
      {showOnboarding ? <OnboardingModal onClose={handleCloseOnboarding} /> : null}
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
