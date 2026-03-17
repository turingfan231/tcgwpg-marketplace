import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function ModalShell({
  children,
  title,
  subtitle,
  onClose,
  wide = false,
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />
      <div
        className={`relative max-h-[94vh] w-full overflow-hidden rounded-[34px] border border-white/15 bg-white shadow-lift ${
          wide ? "max-w-[1600px]" : "max-w-2xl"
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 lg:px-8">
          <div>
            <p className="section-kicker">Marketplace Flow</p>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-[0.08em] text-ink">
              {title}
            </h2>
            {subtitle ? <p className="mt-2 text-steel">{subtitle}</p> : null}
          </div>
          <button
            className="rounded-full border border-slate-200 p-2 text-steel transition hover:border-slate-300 hover:text-ink"
            type="button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(94vh-106px)] overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
