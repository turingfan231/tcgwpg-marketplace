import { BellRing, MessageSquareMore, X } from "lucide-react";
import { Link } from "react-router-dom";

const toneMap = {
  navy: "border-navy/15 bg-white text-ink",
  orange: "border-orange/20 bg-white text-ink",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  slate: "border-slate-200 bg-white text-ink",
};

export default function ToastStack({ items, onDismiss }) {
  if (!items?.length) {
    return null;
  }

  return (
    <div
      aria-atomic="false"
      aria-live="polite"
      className="pointer-events-none fixed right-5 top-24 z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-3"
      role="status"
    >
      {items.map((toast) => {
        const content = (
          <div
            className={`pointer-events-auto rounded-[24px] border px-4 py-4 shadow-lift backdrop-blur ${toneMap[toast.tone] || toneMap.slate}`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-navy/10 p-2 text-navy">
                {toast.tone === "navy" ? (
                  <MessageSquareMore size={16} />
                ) : (
                  <BellRing size={16} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{toast.title}</p>
                <p className="mt-1 text-sm leading-6 text-steel">{toast.body}</p>
              </div>
              <button
                className="rounded-full p-1 text-steel transition hover:bg-slate-100 hover:text-ink"
                type="button"
                onClick={() => onDismiss(toast.id)}
              >
                <X size={14} />
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
