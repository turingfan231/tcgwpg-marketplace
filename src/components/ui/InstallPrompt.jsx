import { Download, MoreHorizontal, Share, X } from "lucide-react";
import { useState } from "react";
import { m } from "../../mobile/design";

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
        "Scroll until you see Add to Home Screen.",
        "Tap Add, then launch TCG WPG from your home screen.",
      ]
    : [
        "Open your browser menu.",
        "Look for Install app or Add to Home Screen.",
        "Confirm the install so TCG WPG opens like a standalone app.",
      ];

  return (
    <>
      <div
        className={`fixed z-40 ${
          isMobile
            ? "inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:hidden"
            : "bottom-5 right-5 left-auto hidden w-[23rem] lg:block"
        }`}
      >
        <div className="rounded-[22px] border px-4 py-4 backdrop-blur-xl" style={{ borderColor: m.borderStrong, background: "rgba(12,12,14,0.92)", boxShadow: m.shadowFloating }}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-white" style={{ background: m.redGradient }}>
              <Download size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>Add to home screen</p>
              <p className="mt-2 text-[12px]" style={{ color: m.textSecondary, lineHeight: 1.6 }}>
                {isIosFallback
                  ? "Install from Safari so TCG WPG launches full-screen like an app."
                  : isManualFallback
                    ? isMobile
                      ? "Use your browser's Add to Home Screen action to pin TCG WPG to your phone."
                      : "Use your browser's install action to pin TCG WPG to your desktop."
                    : isMobile
                      ? "Install TCG WPG on your phone for faster launches and cleaner app-style navigation."
                      : "Install TCG WPG on this PC for a cleaner standalone window and desktop workspace."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-[40px] items-center justify-center rounded-[14px] px-4 text-[12px] text-white"
                  style={{ background: m.redGradient, fontWeight: 700 }}
                  type="button"
                  onClick={isFallbackMode ? () => setShowGuide(true) : onInstall}
                >
                  {isFallbackMode ? "Show Steps" : "Install App"}
                </button>
                <button className="inline-flex h-[40px] items-center justify-center rounded-[14px] px-4 text-[12px]" style={{ background: m.surfaceStrong, color: m.textSecondary, border: `1px solid ${m.border}`, fontWeight: 600 }} type="button" onClick={onDismiss}>
                  Not Now
                </button>
              </div>
            </div>
            <button
              aria-label="Dismiss install prompt"
              className="flex h-8 w-8 items-center justify-center rounded-[12px]"
              style={{ color: m.textSecondary }}
              type="button"
              onClick={onDismiss}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {showGuide ? (
        <div
          className={`fixed inset-0 z-50 flex justify-center bg-black/70 px-3 pt-6 backdrop-blur-sm ${
            isMobile ? "items-end pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden" : "items-center pb-6"
          }`}
        >
          <div className="w-full max-w-xl rounded-[26px] border px-5 py-5" style={{ borderColor: m.borderStrong, background: m.surface, boxShadow: m.shadowFloating }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>Install steps</p>
                <h3 className="mt-2 text-[26px] tracking-tight text-white" style={{ fontWeight: 700, lineHeight: 1.05 }}>
                  Add TCG WPG to your home screen
                </h3>
              </div>
              <button
                aria-label="Close install guide"
                className="flex h-8 w-8 items-center justify-center rounded-[12px]"
                style={{ color: m.textSecondary, background: m.surfaceStrong }}
                type="button"
                onClick={() => setShowGuide(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {guideSteps.map((step, index) => (
                <div key={step} className="flex items-start gap-3 rounded-[18px] px-4 py-4" style={{ background: m.surfaceStrong }}>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", fontWeight: 700 }}>
                    {index + 1}
                  </div>
                  <p className="text-[12px]" style={{ color: m.textSecondary, lineHeight: 1.6 }}>{step}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[18px] px-4 py-4" style={{ background: m.surfaceStrong }}>
              <div className="inline-flex items-center gap-2 text-[12px] text-white" style={{ fontWeight: 700 }}>
                {isIosFallback ? <Share size={15} /> : <MoreHorizontal size={15} />}
                {isIosFallback ? "Safari Share menu" : "Browser menu"}
              </div>
              <p className="mt-2 text-[12px]" style={{ color: m.textSecondary, lineHeight: 1.6 }}>
                {isIosFallback
                  ? "If you don't see the Share button immediately, scroll the bottom Safari toolbar."
                  : "Browser wording varies a bit. Look for Install app, Install, or Add to Home Screen."}
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button className="inline-flex h-[40px] items-center justify-center rounded-[14px] px-4 text-[12px] text-white" style={{ background: m.redGradient, fontWeight: 700 }} type="button" onClick={() => setShowGuide(false)}>
                Got It
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
