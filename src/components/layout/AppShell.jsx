import { AlertTriangle, MapPin, ShieldCheck } from "lucide-react";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,153,0,0.08),transparent_18%),linear-gradient(180deg,#fbf8f1_0%,#f1ede5_100%)]">
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

      <footer className="border-t border-slate-200/80 bg-white/85 backdrop-blur-sm">
        <div className="page-shell grid gap-8 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div>
            <p className="section-kicker">Built for Winnipeg</p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
              Local first, card-first, and made for same-day deals.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-steel">
              TCGWPG is focused on the part other marketplaces miss: clear card photos,
              live print search, real CAD context, and in-house messaging that keeps the
              deal inside one clean flow.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface-card p-6">
              <ShieldCheck className="text-navy" />
              <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                Better trust signals
              </h3>
              <p className="mt-2 text-sm leading-7 text-steel">
                Ratings, badges, and listing photos give buyers real local context before
                the first message.
              </p>
            </div>
            <div className="surface-card p-6">
              <MapPin className="text-orange" />
              <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                Neighborhood-aware browsing
              </h3>
              <p className="mt-2 text-sm leading-7 text-steel">
                Filter by St. Vital, Osborne, Transcona, Downtown, and more to actually
                find cards near you.
              </p>
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
