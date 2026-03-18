import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
import EmptyState from "../components/ui/EmptyState";
import PageSkeleton from "../components/ui/PageSkeleton";
import { useMarketplace } from "../hooks/useMarketplace";

export default function WantToBuyPage() {
  const navigate = useNavigate();
  const { activeListings, loading, openCreateListing } = useMarketplace();
  const wtbListings = activeListings.filter((listing) => listing.type === "WTB");

  if (loading && !activeListings.length) {
    return <PageSkeleton cards={4} titleWidth="w-80" />;
  }

  if (!wtbListings.length) {
    return (
      <EmptyState
        action={
          <button
            className="rounded-full bg-orange px-5 py-3 text-sm font-semibold text-white"
            type="button"
            onClick={() => {
              const opened = openCreateListing({ type: "WTB" });
              if (!opened) {
                navigate("/auth", { state: { from: "/wtb" } });
              }
            }}
          >
            Post a WTB listing
          </button>
        }
        description="Use WTB listings for cards and cores you actively want local sellers to respond to."
        title="No WTB posts yet"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Want To Buy</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-ink">
              Local buyers looking for cards right now
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-8 text-steel">
              Browse active WTB posts for staples, deck cores, and hard-to-find printings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-[24px] bg-[#f8f5ee] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                Active WTB posts
              </p>
              <p className="mt-2 inline-flex items-center gap-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                <Search size={18} className="text-orange" />
                {wtbListings.length}
              </p>
            </div>
            <button
              className="rounded-full bg-orange px-5 py-3 text-sm font-semibold text-white shadow-soft"
              type="button"
              onClick={() => {
                const opened = openCreateListing({ type: "WTB" });
                if (!opened) {
                  navigate("/auth", { state: { from: "/wtb" } });
                }
              }}
            >
              Post a WTB
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {wtbListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </section>
    </div>
  );
}
