import { Download, MoreHorizontal, Share, X } from "lucide-react";
import { useState } from "react";

export default function InstallPrompt({ installState, onDismiss, onInstall }) {
  const [showGuide, setShowGuide] = useState(false);

  if (!installState?.visible) {
    return null;
  }

  const isIosFallback = installState.mode === "ios";
  const isManualFallback = installState.mode === "manual";
  const isFallbackMode = isIosFallback || isManualFallback;
  const isMobile = installState.mobile !== false;

  const guideSteps = isIosFallback
    ? [
        "Tap the Share button in Safari.",
        "Scroll the menu until you see Add to Home Screen.",
        "Tap Add, then launch TCGWPG from your phone's home screen.",
      ]
    : [
        "Open your browser menu.",
        "Look for Install app or Add to Home Screen.",
        "Confirm the install so TCGWPG opens like a standalone app.",
      ];

  return (
    <>
      <div
        className={`fixed z-40 ${
          isMobile
            ? "inset-x-3 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] lg:hidden"
            : "bottom-6 right-6 left-auto hidden w-[24rem] lg:block"
        }`}
      >
        <div className="mx-auto max-w-xl rounded-[26px] border border-[var(--line)] bg-[var(--surface-solid)] px-4 py-4 shadow-[0_22px_44px_-24px_rgba(15,23,42,0.3)] backdrop-blur-xl">
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
                  ? "Install TCGWPG from Safari so it launches full-screen like an app."
                  : isManualFallback
                    ? isMobile
                      ? "Use your browser's install or Add to Home Screen action to pin TCGWPG to your phone."
                      : "Use your browser's install action to pin TCGWPG to your desktop like a standalone app."
                    : isMobile
                      ? "Install TCGWPG on your phone for faster launches, a cleaner full-screen view, and app-like navigation."
                      : "Install TCGWPG on this PC for a cleaner standalone window and a more native desktop feel."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
                  type="button"
                  onClick={isFallbackMode ? () => setShowGuide(true) : onInstall}
                >
                  {isFallbackMode ? "Show install steps" : "Install app"}
                </button>
                <button
                  className="rounded-full border border-[var(--line)] bg-[var(--surface-alt)] px-4 py-2 text-sm font-semibold text-steel"
                  type="button"
                  onClick={onDismiss}
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              aria-label="Dismiss install prompt"
              className="rounded-full border border-[var(--line)] bg-[var(--surface-alt)] p-2 text-steel"
              type="button"
              onClick={onDismiss}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
      {showGuide ? (
        <div
          className={`fixed inset-0 z-50 flex justify-center bg-slate-950/45 px-3 pt-6 backdrop-blur-sm ${
            isMobile
              ? "items-end pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden"
              : "items-center pb-6"
          }`}
        >
          <div className="w-full max-w-xl rounded-[28px] border border-[var(--line)] bg-[var(--surface-solid)] px-5 py-5 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-navy/65">
                  Install steps
                </p>
                <h3 className="mt-2 font-display text-[1.6rem] font-semibold tracking-[-0.04em] text-ink">
                  Add TCGWPG to your home screen
                </h3>
              </div>
              <button
                aria-label="Close install guide"
                className="rounded-full border border-[var(--line)] bg-[var(--surface-alt)] p-2 text-steel"
                type="button"
                onClick={() => setShowGuide(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {guideSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--surface-alt)] px-4 py-4"
                >
                  <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-solid)] text-xs font-semibold text-navy">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-ink">{step}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[20px] border border-[var(--line)] bg-[var(--surface-alt)] px-4 py-4">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                {isIosFallback ? <Share size={16} /> : <MoreHorizontal size={16} />}
                {isIosFallback ? "Safari Share menu" : "Browser menu"}
              </div>
              <p className="mt-2 text-sm leading-6 text-steel">
                {isIosFallback
                  ? "If you don't see the Share button immediately, scroll the bottom toolbar in Safari."
                  : "Browser wording varies a bit. Look for Install app, Install, or Add to Home Screen."}
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={() => setShowGuide(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
