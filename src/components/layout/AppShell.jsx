import {
  AlertTriangle,
  ArrowRight,
  MapPin,
  MessageSquareText,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { useMarketplace } from "../../hooks/useMarketplace";
import CreateListingModal from "../modals/CreateListingModal";
import ToastStack from "../ui/ToastStack";
import Header from "./Header";

export default function AppShell() {
  const {
    closeCreateListing,
    dismissToast,
    isCreateListingOpen,
    isSuspended,
    toastItems,
  } = useMarketplace();

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <Header />
      {isSuspended ? (
        <div className="border-b border-rose-200 bg-rose-50">
          <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div className="inline-flex items-center gap-2 font-semibold text-rose-800">
              <AlertTriangle size={16} />
              This account is suspended. Browsing is still available, but posting, messaging,
              offers, and seller actions are disabled until review is complete.
            </div>
            <Link
              className="rounded-full border border-rose-200 bg-white px-4 py-2 font-semibold text-rose-700"
              to="/account"
            >
              Appeal or review status
            </Link>
          </div>
        </div>
      ) : null}
      <main className="page-shell py-8 pb-24 lg:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200/80 bg-[#f8f4ec]">
        <div className="page-shell py-10">
          <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-soft">
            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,#17394a_0%,#1a5b78_58%,#245f7d_100%)] px-6 py-7 text-white lg:border-b-0 lg:border-r lg:border-white/10 lg:px-8 lg:py-8">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white/62">
                  Winnipeg card market
                </p>
                <h2 className="mt-3 max-w-xl font-display text-[2.2rem] font-semibold tracking-[-0.04em]">
                  Built for local deals, not endless marketplace digging.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/78">
                  Search exact printings, keep offers in one thread, and browse by the
                  neighborhoods you actually want to meet in.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Link
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink"
                    to="/market"
                  >
                    Browse market
                    <ArrowRight size={15} />
                  </Link>
                  <Link
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white"
                    to="/wtb"
                  >
                    Open WTB board
                  </Link>
                </div>
              </div>

              <div className="grid gap-0 sm:grid-cols-3">
                <div className="border-b border-slate-200/80 px-6 py-6 sm:border-b-0 sm:border-r">
                  <Search className="text-navy" size={18} />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Exact search
                  </p>
                  <p className="mt-2 text-sm leading-7 text-steel">
                    Find the right printing fast across Magic, Pokemon, and One Piece.
                  </p>
                </div>
                <div className="border-b border-slate-200/80 px-6 py-6 sm:border-b-0 sm:border-r">
                  <MessageSquareText className="text-orange" size={18} />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Attached messages
                  </p>
                  <p className="mt-2 text-sm leading-7 text-steel">
                    Keep offers, questions, and meetup details tied to the listing.
                  </p>
                </div>
                <div className="px-6 py-6">
                  <MapPin className="text-navy" size={18} />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Local filters
                  </p>
                  <p className="mt-2 text-sm leading-7 text-steel">
                    Narrow down by neighborhood, postal area, and trusted local sellers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {isCreateListingOpen ? (
        <CreateListingModal onClose={closeCreateListing} />
      ) : null}
      <ToastStack items={toastItems} onDismiss={dismissToast} />
    </div>
  );
}
