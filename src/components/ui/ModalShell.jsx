import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

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
    const handleKeyDown = (event) => {
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
    };

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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        aria-describedby={subtitle ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        role="dialog"
        className={`relative w-full overflow-hidden border border-[var(--line)] bg-[linear-gradient(180deg,var(--panel-top)_0%,var(--panel-bottom)_100%)] text-ink shadow-lift ${
          mobileSheet
            ? "max-h-[84dvh] rounded-t-[28px] border-b-0"
            : "h-[100dvh] rounded-none"
        } sm:max-h-[94vh] sm:h-auto sm:rounded-[34px] ${
          wide ? "sm:max-w-[1600px]" : "sm:max-w-2xl"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-solid)_92%,transparent)] px-4 py-4 backdrop-blur sm:px-6 sm:py-5 lg:px-8">
          <div>
            <p className="section-kicker">Marketplace Flow</p>
            <h2 id={titleId} className="mt-2 font-display text-[1.65rem] font-bold uppercase tracking-[0.08em] text-ink sm:text-3xl">
              {title}
            </h2>
            {subtitle ? <p id={descriptionId} className="mt-2 text-sm text-steel sm:text-base">{subtitle}</p> : null}
          </div>
          <button
            aria-label="Close create listing dialog"
            data-autofocus="true"
            className="rounded-full border border-slate-200 bg-[var(--surface-alt)] p-2 text-steel transition hover:border-slate-300 hover:text-ink"
            type="button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div
          className={`overflow-y-auto ${
            mobileSheet
              ? "max-h-[calc(84dvh-92px)]"
              : "max-h-[calc(100dvh-92px)]"
          } sm:max-h-[calc(94vh-106px)]`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
