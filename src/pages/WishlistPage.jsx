import { useNavigate } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
import EmptyState from "../components/ui/EmptyState";
import { useMarketplace } from "../hooks/useMarketplace";

export default function WishlistPage() {
  const navigate = useNavigate();
  const { openCreateListing, wishlistedListings } = useMarketplace();

  if (!wishlistedListings.length) {
    return (
      <EmptyState
        action={
          <button
            className="rounded-full bg-orange px-5 py-3 font-display text-sm font-bold uppercase tracking-[0.12em] text-white"
            type="button"
            onClick={() => {
              const opened = openCreateListing({ type: "WTS" });
              if (!opened) {
                navigate("/auth", { state: { from: "/wishlist" } });
              }
            }}
          >
            Add a listing instead
          </button>
        }
        description="Save interesting local posts here and circle back when you are ready to message a seller."
        title="Wishlist Is Empty"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-white p-6 shadow-soft">
        <p className="section-kicker">Wishlist</p>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-[0.08em] text-ink">
          Saved For Later
        </h1>
        <p className="mt-3 max-w-3xl text-base text-steel">
          Keep an eye on high-priority pickups, trade targets, and local prices
          worth revisiting.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {wishlistedListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </section>
    </div>
  );
}
