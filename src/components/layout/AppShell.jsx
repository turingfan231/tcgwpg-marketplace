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

      <footer className="border-t border-slate-200/80 bg-white">
        <div className="page-shell grid gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="section-kicker">Built for Winnipeg</p>
            <h2 className="mt-3 font-display text-[2.4rem] font-semibold tracking-[-0.04em] text-ink">
              Local card deals without the usual clutter.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-steel">
              TCGWPG focuses on the parts generic marketplaces usually miss: exact
              printing search, CAD pricing context, local meetup details, and messaging
              that stays attached to the card.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="surface-muted p-5">
              <ShieldCheck className="text-navy" />
              <h3 className="mt-4 font-display text-[1.6rem] font-semibold tracking-[-0.03em] text-ink">
                Better trust signals
              </h3>
              <p className="mt-2 text-sm leading-7 text-steel">
                Ratings, badges, and listing photos give buyers real local context before
                the first message.
              </p>
            </div>
            <div className="surface-muted p-5">
              <MapPin className="text-orange" />
              <h3 className="mt-4 font-display text-[1.6rem] font-semibold tracking-[-0.03em] text-ink">
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
