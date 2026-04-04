import { Heart } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileWorkspaceNav from "../components/account/ProfileWorkspaceNav";
import SeoHead from "../components/seo/SeoHead";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import {
  EmptyBlock,
  InlineSearch,
  ListingRow,
  MobileScreen,
  PrimaryButton,
  ScreenHeader,
  ScreenSection,
} from "../mobile/primitives";

function WishlistStat({ label, value }) {
  return (
    <div
      className="rounded-[18px] px-4 py-3"
      style={{ background: m.surface, border: `1px solid ${m.border}` }}
    >
      <p className="text-[9px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
        {label}
      </p>
      <p className="mt-1 text-[20px] text-white" style={{ fontWeight: 700 }}>
        {value}
      </p>
    </div>
  );
}

export default function WishlistPage() {
  const navigate = useNavigate();
  const { currentUser, toggleWishlist, wishlistedListings, wishlist } = useMarketplace();
  const [query, setQuery] = useState("");

  const filteredListings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return wishlistedListings;
    }

    return wishlistedListings.filter((listing) =>
      [
        listing.title,
        listing.setName,
        listing.game,
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

  const pokemonCount = useMemo(
    () =>
      wishlistedListings.filter((listing) =>
        String(listing.game || "").toLowerCase().includes("pokemon"),
      ).length,
    [wishlistedListings],
  );

  return (
    <MobileScreen className="pb-[92px]">
      <SeoHead
        canonicalPath="/wishlist"
        description="Track saved local listings and jump back into promising card deals quickly."
        title="Wishlist"
      />

      <ProfileWorkspaceNav sellerId={currentUser?.id} />

      <ScreenHeader subtitle={`${wishlistedListings.length} saved listings`} title="Wishlist" />

      <ScreenSection className="pb-3">
        <InlineSearch
          onChange={setQuery}
          placeholder="Search saved cards, sellers, games..."
          value={query}
        />
      </ScreenSection>

      <ScreenSection className="grid grid-cols-2 gap-2 pb-2">
        <WishlistStat label="Saved now" value={wishlistedListings.length} />
        <WishlistStat label="Pokémon" value={pokemonCount} />
      </ScreenSection>

      <ScreenSection className="pb-3">
        <div
          className="flex items-center justify-between rounded-[18px] px-4 py-3"
          style={{ background: m.surfaceStrong, border: `1px solid ${m.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-[12px]"
              style={{ background: "rgba(239,68,68,0.12)" }}
            >
              <Heart size={15} style={{ color: m.red }} />
            </div>
            <div>
              <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                Personal watchlist
              </p>
              <p className="text-[10px]" style={{ color: m.textSecondary }}>
                Keep fast access to cards you plan to revisit
              </p>
            </div>
          </div>
          <button
            className="text-[11px]"
            style={{ color: m.textSecondary, fontWeight: 600 }}
            type="button"
            onClick={() => navigate("/market")}
          >
            Browse
          </button>
        </div>
      </ScreenSection>

      <ScreenSection className="flex-1 pb-2">
        {!wishlistedListings.length ? (
          <EmptyBlock
            action={
              <PrimaryButton className="w-full" onClick={() => navigate("/market")}>
                Browse market
              </PrimaryButton>
            }
            description="Save promising local listings here so we can come back and message quickly."
            title="No saved listings yet"
          />
        ) : !filteredListings.length ? (
          <EmptyBlock
            action={
              <button
                className="text-[11px]"
                style={{ color: m.textSecondary, fontWeight: 600 }}
                type="button"
                onClick={() => setQuery("")}
              >
                Clear search
              </button>
            }
            description="Try another card title, seller name, or game."
            title="Nothing matches that search"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {filteredListings.map((listing) => (
              <ListingRow
                key={listing.id}
                favorite={wishlist.includes(listing.id)}
                listing={listing}
                onFavorite={() => toggleWishlist(listing.id)}
              />
            ))}
          </div>
        )}
      </ScreenSection>
    </MobileScreen>
  );
}
