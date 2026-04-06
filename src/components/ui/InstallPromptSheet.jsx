import { Download, Share, Smartphone, X } from "lucide-react";
import { useInstallPrompt } from "../../hooks/useInstallPrompt";
import { m } from "../../mobile/design";
import { BottomSheet, PrimaryButton, SecondaryButton } from "../../mobile/primitives";

function InstructionRow({ icon: Icon, text }) {
  return (
    <div
      className="flex items-start gap-3 rounded-[16px] px-3 py-3"
      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${m.border}` }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
        style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}
      >
        <Icon size={16} />
      </div>
      <p className="text-[12px]" style={{ color: m.textSecondary, lineHeight: 1.55, fontWeight: 500 }}>
        {text}
      </p>
    </div>
  );
}

export default function InstallPromptSheet() {
  const { closePrompt, installResult, requestInstall, sheetMode, sheetOpen } = useInstallPrompt();

  return (
    <BottomSheet open={sheetOpen} onClose={closePrompt}>
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[16px] text-white" style={{ fontWeight: 800 }}>
              Add TCG WPG to your home screen
            </p>
            <p className="mt-1 text-[11px]" style={{ color: m.textSecondary, lineHeight: 1.5 }}>
              Launch faster, get the full app feel, and keep TCG WPG one tap away.
            </p>
          </div>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-[12px]"
            style={{ background: m.surfaceStrong, border: `1px solid ${m.border}` }}
            type="button"
            onClick={closePrompt}
          >
            <X size={16} style={{ color: m.textSecondary }} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {sheetMode === "ios" ? (
            <>
              <InstructionRow icon={Share} text="Open the browser share menu at the bottom or top of the screen." />
              <InstructionRow icon={Download} text={'Choose "Add to Home Screen," then confirm the install.'} />
              <InstructionRow icon={Smartphone} text="Once added, TCG WPG opens like a real app from your home screen." />
            </>
          ) : sheetMode === "manual" ? (
            <>
              <InstructionRow icon={Share} text={'Open your browser menu. On Chrome or Edge, look for "Install app" or "Add to Home Screen."'} />
              <InstructionRow icon={Download} text="If the browser does not show the install option immediately, revisit this page after a few moments or from the home screen." />
              <InstructionRow icon={Smartphone} text="After install, TCG WPG launches as a standalone app from your desktop or phone home screen." />
            </>
          ) : (
            <>
              <InstructionRow icon={Download} text="Install TCG WPG for faster launch, cleaner full-screen browsing, and a real app-style experience." />
              <InstructionRow icon={Smartphone} text="You can still use the website normally after installing. Nothing about your account changes." />
            </>
          )}
        </div>

        {installResult ? (
          <p className="mt-4 text-[11px]" style={{ color: m.textSecondary, fontWeight: 600 }}>
            {installResult}
          </p>
        ) : null}

        <div className="mt-5 flex gap-2">
          {sheetMode === "ios" || sheetMode === "manual" ? (
            <PrimaryButton className="flex-1" onClick={closePrompt}>
              Got it
            </PrimaryButton>
          ) : (
            <>
              <PrimaryButton className="flex-1" onClick={() => void requestInstall()}>
                Install App
              </PrimaryButton>
              <SecondaryButton className="min-w-[112px]" onClick={closePrompt}>
                Maybe later
              </SecondaryButton>
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
