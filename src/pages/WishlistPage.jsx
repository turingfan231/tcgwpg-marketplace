import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileWorkspaceNav from "../components/account/ProfileWorkspaceNav";
import ListingCard from "../components/cards/ListingCard";
import SeoHead from "../components/seo/SeoHead";
import EmptyState from "../components/ui/EmptyState";
import { useMarketplace } from "../hooks/useMarketplace";

export default function WishlistPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { currentUser, openCreateListing, wishlistedListings } = useMarketplace();
  const filteredListings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return wishlistedListings;
    }

    return wishlistedListings.filter((listing) =>
      [
        listing.title,
        listing.game,
        listing.description,
        listing.condition,
        listing.neighborhood,
        listing.seller?.publicName,
        listing.seller?.username,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, wishlistedListings]);

  if (!wishlistedListings.length) {
    return (
      <div className="space-y-6">
        <SeoHead
          canonicalPath="/wishlist"
          description="Keep track of saved local listings and revisit cards you want to message about later."
          title="Wishlist"
        />
        <ProfileWorkspaceNav sellerId={currentUser?.id} />
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SeoHead
        canonicalPath="/wishlist"
        description="Keep track of saved local listings and revisit cards you want to message about later."
        title="Wishlist"
      />
      <ProfileWorkspaceNav sellerId={currentUser?.id} />
      <section className="rounded-[32px] bg-white p-6 shadow-soft">
        <p className="section-kicker">Wishlist</p>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-[0.08em] text-ink">
          Saved For Later
        </h1>
        <p className="mt-3 max-w-3xl text-base text-steel">
          Keep an eye on high-priority pickups, trade targets, and local prices
          worth revisiting.
        </p>
        <div className="relative mt-5 max-w-xl">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-steel"
            size={16}
          />
          <input
            className="w-full rounded-[20px] border border-slate-200 bg-[#f2f3f5] py-3 pl-11 pr-4 outline-none transition focus:border-navy focus:bg-white"
            placeholder="Search saved listings"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </section>

      {filteredListings.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </section>
      ) : (
        <EmptyState
          description="Try a different card name, seller, or neighborhood."
          title="No wishlist matches"
        />
      )}
    </div>
  );
}


