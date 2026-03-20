import { Download, Share, X } from "lucide-react";

export default function InstallPrompt({ installState, onDismiss, onInstall }) {
  if (!installState?.visible) {
    return null;
  }

  const isIosFallback = installState.mode === "ios";
  const isManualFallback = installState.mode === "manual";

  return (
    <div className="fixed inset-x-3 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-40 lg:hidden">
      <div className="mx-auto max-w-xl rounded-[26px] border border-slate-200 bg-white px-4 py-4 shadow-[0_22px_44px_-24px_rgba(15,23,42,0.3)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-navy text-white">
            <Download size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-navy/65">
              Add to home screen
            </p>
            <p className="mt-2 text-sm leading-6 text-ink">
              {isIosFallback
                ? "Open the Share menu in Safari and choose Add to Home Screen to install TCGWPG like an app."
                : isManualFallback
                  ? "Your browser may not show a native install button here. Use the browser menu and choose Add to Home Screen if it is available."
                  : "Install TCGWPG on your phone for faster launches, a cleaner full-screen view, and app-like navigation."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {isIosFallback ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-[#f7f3ec] px-4 py-2 text-sm font-semibold text-ink">
                  <Share size={15} />
                  Share then Add to Home Screen
                </div>
              ) : isManualFallback ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-[#f7f3ec] px-4 py-2 text-sm font-semibold text-ink">
                  <Download size={15} />
                  Browser menu then Add to Home Screen
                </div>
              ) : (
                <button
                  className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
                  type="button"
                  onClick={onInstall}
                >
                  Install app
                </button>
              )}
              <button
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel"
                type="button"
                onClick={onDismiss}
              >
                Not now
              </button>
            </div>
          </div>
          <button
            aria-label="Dismiss install prompt"
            className="rounded-full border border-slate-200 p-2 text-steel"
            type="button"
            onClick={onDismiss}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
