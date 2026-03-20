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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />
      <div
        className={`relative h-[100dvh] w-full overflow-hidden rounded-none border border-white/15 bg-[#fcfaf5] shadow-lift sm:max-h-[94vh] sm:h-auto sm:rounded-[34px] ${
          wide ? "sm:max-w-[1600px]" : "sm:max-w-2xl"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-[#fcfaf5]/95 px-4 py-4 backdrop-blur sm:px-6 sm:py-5 lg:px-8">
          <div>
            <p className="section-kicker">Marketplace Flow</p>
            <h2 className="mt-2 font-display text-[1.65rem] font-bold uppercase tracking-[0.08em] text-ink sm:text-3xl">
              {title}
            </h2>
            {subtitle ? <p className="mt-2 text-sm text-steel sm:text-base">{subtitle}</p> : null}
          </div>
          <button
            className="rounded-full border border-slate-200 p-2 text-steel transition hover:border-slate-300 hover:text-ink"
            type="button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(100dvh-92px)] overflow-y-auto sm:max-h-[calc(94vh-106px)]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
