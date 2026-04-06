import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const InstallPromptContext = createContext(null);

const AUTO_DISMISS_KEY = "tcgwpg-install-auto-dismissed-v1";
const MANUAL_HINT_KEY = "tcgwpg-install-manual-hint-v1";

function canUseDom() {
  return typeof window !== "undefined";
}

function isStandaloneMode() {
  if (!canUseDom()) {
    return false;
  }

  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator?.standalone === true
  );
}

function isIosDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";

  return /iphone|ipad|ipod/i.test(userAgent) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function InstallPromptProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneMode());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState("prompt");
  const [promptAvailable, setPromptAvailable] = useState(false);
  const [manualHintAvailable, setManualHintAvailable] = useState(() => {
    if (!canUseDom()) {
      return false;
    }
    return window.localStorage.getItem(MANUAL_HINT_KEY) === "1";
  });
  const [installResult, setInstallResult] = useState("");
  const autoPromptTimerRef = useRef(null);

  const ios = isIosDevice();

  const markAutoDismissed = useCallback(() => {
    if (!canUseDom()) {
      return;
    }
    window.localStorage.setItem(AUTO_DISMISS_KEY, "1");
  }, []);

  const wasAutoDismissed = useCallback(() => {
    if (!canUseDom()) {
      return false;
    }
    return window.localStorage.getItem(AUTO_DISMISS_KEY) === "1";
  }, []);

  const canInstall = Boolean(!isInstalled && (deferredPrompt || ios || manualHintAvailable));

  const openManualPrompt = useCallback(() => {
    if (!canInstall) {
      return false;
    }
    setInstallResult("");
    setSheetMode(deferredPrompt ? "prompt" : ios ? "ios" : "manual");
    setSheetOpen(true);
    return true;
  }, [canInstall, deferredPrompt, ios]);

  const closePrompt = useCallback(() => {
    setSheetOpen(false);
    markAutoDismissed();
  }, [markAutoDismissed]);

  const requestInstall = useCallback(async () => {
    if (isInstalled) {
      return { ok: true, installed: true };
    }

    if (!deferredPrompt) {
      setSheetMode(ios ? "ios" : "manual");
      setSheetOpen(true);
      return { ok: ios || manualHintAvailable, fallback: true };
    }

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice.catch(() => ({ outcome: "dismissed" }));
    setDeferredPrompt(null);
    setPromptAvailable(false);

    if (choiceResult?.outcome === "accepted") {
      setInstallResult("Installing app...");
      setSheetOpen(false);
      setIsInstalled(true);
      markAutoDismissed();
      return { ok: true, installed: true };
    }

    setInstallResult("Install was dismissed.");
    markAutoDismissed();
    return { ok: false, dismissed: true };
  }, [deferredPrompt, ios, isInstalled, manualHintAvailable, markAutoDismissed]);

  useEffect(() => {
    if (!canUseDom()) {
      return undefined;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setPromptAvailable(true);
      setManualHintAvailable(true);
      window.localStorage.setItem(MANUAL_HINT_KEY, "1");

      if (isStandaloneMode() || wasAutoDismissed()) {
        return;
      }

      if (autoPromptTimerRef.current) {
        window.clearTimeout(autoPromptTimerRef.current);
      }

      autoPromptTimerRef.current = window.setTimeout(() => {
        setSheetMode("prompt");
        setSheetOpen(true);
      }, 1400);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setPromptAvailable(false);
      setSheetOpen(false);
      markAutoDismissed();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    if (ios && !isStandaloneMode() && !wasAutoDismissed()) {
      autoPromptTimerRef.current = window.setTimeout(() => {
        setSheetMode("ios");
        setSheetOpen(true);
      }, 1800);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      if (autoPromptTimerRef.current) {
        window.clearTimeout(autoPromptTimerRef.current);
      }
    };
  }, [ios, markAutoDismissed, wasAutoDismissed]);

  useEffect(() => {
    if (!canUseDom()) {
      return undefined;
    }

    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    const handleDisplayMode = () => {
      setIsInstalled(isStandaloneMode());
    };

    handleDisplayMode();

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener("change", handleDisplayMode);
      return () => mediaQuery.removeEventListener("change", handleDisplayMode);
    }

    return undefined;
  }, []);

  const value = useMemo(
    () => ({
      canInstall,
      closePrompt,
      installResult,
      ios,
      isInstalled,
      manualHintAvailable,
      openManualPrompt,
      promptAvailable,
      requestInstall,
      sheetMode,
      sheetOpen,
    }),
    [canInstall, closePrompt, installResult, ios, isInstalled, manualHintAvailable, openManualPrompt, promptAvailable, requestInstall, sheetMode, sheetOpen],
  );

  return <InstallPromptContext.Provider value={value}>{children}</InstallPromptContext.Provider>;
}

export function useInstallPrompt() {
  const context = useContext(InstallPromptContext);

  if (!context) {
    throw new Error("useInstallPrompt must be used within an InstallPromptProvider.");
  }

  return context;
}
