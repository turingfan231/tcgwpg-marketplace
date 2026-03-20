import { AlertTriangle, Clock3, MapPin, ShieldCheck } from "lucide-react";
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
          <div className="rounded-[30px] border border-slate-200/80 bg-white px-6 py-7 shadow-soft sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr_0.8fr]">
              <div>
                <p className="section-kicker">TCGWPG</p>
                <h2 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.04em] text-ink">
                  Local cards, local meetups, less clutter.
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-7 text-steel">
                  Built for Winnipeg players who want a cleaner way to buy, sell, trade,
                  and plan meetups without leaving the city.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Browse
                  </p>
                  <div className="mt-4 grid gap-3 text-sm font-semibold text-ink">
                    <Link to="/market">All listings</Link>
                    <Link to="/wtb">WTB board</Link>
                    <Link to="/sellers">Sellers</Link>
                    <Link to="/events">Events</Link>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    Account
                  </p>
                  <div className="mt-4 grid gap-3 text-sm font-semibold text-ink">
                    <Link to="/messages">Messages</Link>
                    <Link to="/dashboard">Dashboard</Link>
                    <Link to="/wishlist">Wishlist</Link>
                    <Link to="/account">Settings</Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-[22px] bg-[#f8f5ee] px-4 py-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <MapPin size={16} className="text-navy" />
                    Winnipeg-first
                  </div>
                  <p className="mt-2 text-sm leading-6 text-steel">
                    Neighborhood filters and postal areas keep meetups practical.
                  </p>
                </div>
                <div className="rounded-[22px] bg-[#f8f5ee] px-4 py-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <Clock3 size={16} className="text-orange" />
                    Faster deals
                  </div>
                  <p className="mt-2 text-sm leading-6 text-steel">
                    Messages, offers, and follow-up stay attached to the listing.
                  </p>
                </div>
                <div className="rounded-[22px] bg-[#f8f5ee] px-4 py-4">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    <ShieldCheck size={16} className="text-navy" />
                    Trust tools
                  </div>
                  <p className="mt-2 text-sm leading-6 text-steel">
                    Reviews, badges, and admin moderation help keep the market clean.
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
