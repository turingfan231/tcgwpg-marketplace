import { BellRing, MessageSquareMore, X } from "lucide-react";
import { Link } from "react-router-dom";
import { m } from "../../mobile/design";

const toneMap = {
  navy: m.red,
  orange: m.warning,
  rose: m.danger,
  slate: m.textSecondary,
};

export default function ToastStack({ items, onDismiss }) {
  if (!items?.length) {
    return null;
  }

  return (
    <div
      aria-atomic="false"
      aria-live="polite"
      className="pointer-events-none fixed right-3 top-20 z-50 flex w-[21rem] max-w-[calc(100vw-1.5rem)] flex-col gap-3 sm:right-5 sm:top-24"
      role="status"
    >
      {items.map((toast) => {
        const content = (
          <div className="pointer-events-auto rounded-[22px] border px-4 py-4 backdrop-blur-xl" style={{ borderColor: m.borderStrong, background: "rgba(12,12,14,0.92)", boxShadow: m.shadowFloating }}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]" style={{ background: m.surfaceStrong, color: toneMap[toast.tone] || toneMap.slate }}>
                {toast.tone === "navy" ? <MessageSquareMore size={15} /> : <BellRing size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">{toast.title}</p>
                <p className="mt-1 text-sm leading-6" style={{ color: m.textSecondary }}>{toast.body}</p>
              </div>
              <button
                className="flex h-7 w-7 items-center justify-center rounded-[10px] transition"
                style={{ color: m.textSecondary }}
                type="button"
                onClick={() => onDismiss(toast.id)}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        );

        return toast.href ? (
          <Link key={toast.id} to={toast.href}>
            {content}
          </Link>
        ) : (
          <div key={toast.id}>{content}</div>
        );
      })}
    </div>
  );
}
