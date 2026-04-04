import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { m } from "../../mobile/design";

export default function ModalShell({
  children,
  title,
  subtitle,
  onClose,
  wide = false,
  mobileSheet = false,
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const items = [...focusable].filter(
          (element) => !element.hasAttribute("disabled") && !element.getAttribute("aria-hidden"),
        );
        if (!items.length) {
          return;
        }

        const first = items[0];
        const last = items[items.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => {
      const autoFocusTarget =
        panelRef.current?.querySelector('[data-autofocus="true"]') ||
        panelRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
      autoFocusTarget?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
        <motion.button
          aria-label="Close modal"
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
          type="button"
          onClick={onClose}
        />

        <motion.div
          ref={panelRef}
          aria-describedby={subtitle ? descriptionId : undefined}
          aria-labelledby={titleId}
          aria-modal="true"
          role="dialog"
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className={`relative w-full overflow-hidden ${
            mobileSheet
              ? "max-h-[84dvh] rounded-t-[28px] sm:rounded-[26px]"
              : "h-[100dvh] rounded-none sm:h-auto sm:max-h-[94vh] sm:rounded-[26px]"
          } ${wide ? "sm:max-w-[1280px]" : "sm:max-w-3xl"}`}
          style={{
            background: "#151519",
            color: m.text,
            border: `1px solid ${m.borderStrong}`,
            boxShadow: m.shadowFloating,
          }}
        >
          <div
            className="sticky top-0 z-10 px-4 py-3 sm:px-5"
            style={{
              background: "rgba(21,21,25,0.92)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderBottom: `1px solid ${m.border}`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
                  Marketplace flow
                </p>
                <h2
                  id={titleId}
                  className="mt-2 text-[22px] tracking-tight text-white"
                  style={{ fontWeight: 700, lineHeight: 1.05 }}
                >
                  {title}
                </h2>
                {subtitle ? (
                  <p id={descriptionId} className="mt-2 max-w-2xl text-[12px]" style={{ color: m.textSecondary, lineHeight: 1.55 }}>
                    {subtitle}
                  </p>
                ) : null}
              </div>

              <button
                aria-label="Close dialog"
                data-autofocus="true"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
                style={{ background: m.surfaceStrong, color: m.textSecondary, border: `1px solid ${m.border}` }}
                type="button"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div
            className={`overflow-y-auto ${
              mobileSheet ? "max-h-[calc(84dvh-96px)]" : "max-h-[calc(100dvh-96px)]"
            } sm:max-h-[calc(94vh-104px)]`}
          >
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
