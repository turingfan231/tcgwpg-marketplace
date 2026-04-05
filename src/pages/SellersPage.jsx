import { Search, ShieldCheck, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import UserAvatar from "../components/shared/UserAvatar";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import {
  EmptyBlock,
  InlineSearch,
  MobileScreen,
  ScreenHeader,
  ScreenSection,
} from "../mobile/primitives";

function SellerCard({ seller, badgeLabels, followerCount }) {
  return (
    <Link
      className="block rounded-[18px] px-4 py-4"
      style={{ background: m.surface, border: `1px solid ${m.border}`, boxShadow: m.shadowPanel }}
      to={`/seller/${seller.id}`}
    >
      <div className="flex items-start gap-3">
        <UserAvatar className="h-12 w-12 shrink-0 rounded-[14px] text-[14px] font-bold" user={seller} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] text-white" style={{ fontWeight: 700 }}>
                {seller.publicName || seller.name}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                {seller.neighborhood}
              </p>
            </div>
            {seller.verified ? (
              <span
                className="rounded-full px-2 py-[3px] text-[8px] uppercase"
                style={{ background: "rgba(239,68,68,0.14)", color: "#fca5a5", fontWeight: 700 }}
              >
                Verified
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px]" style={{ color: m.textSecondary }}>
            <span className="inline-flex items-center gap-1">
              <Star size={11} style={{ color: "#fbbf24" }} />
              {Number(seller.overallRating || 0).toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={11} style={{ color: m.red }} />
              {seller.completedDeals} deals
            </span>
            <span>{followerCount} follows</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {(seller.favoriteGames || []).slice(0, 2).map((game) => (
              <span
                key={`${seller.id}-${game}`}
                className="rounded-full px-2 py-[4px] text-[9px]"
                style={{ background: m.surfaceStrong, color: m.textSecondary, fontWeight: 600 }}
              >
                {game}
              </span>
            ))}
            {badgeLabels.slice(0, 2).map((badge) => (
              <span
                key={`${seller.id}-${badge}`}
                className="rounded-full px-2 py-[4px] text-[9px]"
                style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", fontWeight: 700 }}
              >
                {badge}
              </span>
            ))}
          </div>

          <p className="mt-3 line-clamp-2 text-[11px] leading-5" style={{ color: m.textSecondary }}>
            {seller.bio || "Local seller storefront."}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function SellersPage() {
  const { ensureSellerTrustLoaded, reviewBadgeCatalog, sellers } = useMarketplace();
  const [query, setQuery] = useState("");

  useEffect(() => {
    void ensureSellerTrustLoaded();
  }, [ensureSellerTrustLoaded]);

  const sellerFollowerCounts = useMemo(
    () =>
      sellers.reduce((accumulator, seller) => {
        (seller.followedSellerIds || []).forEach((followedId) => {
          accumulator[followedId] = (accumulator[followedId] || 0) + 1;
        });
        return accumulator;
      }, {}),
    [sellers],
  );

  const filteredSellers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rows = [...sellers];

    rows.sort((left, right) => {
      const leftScore = Number(left.completedDeals || 0) * 10 + Number(left.overallRating || 0);
      const rightScore = Number(right.completedDeals || 0) * 10 + Number(right.overallRating || 0);
      return rightScore - leftScore;
    });

    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((seller) =>
      [
        seller.publicName,
        seller.name,
        seller.username,
        seller.neighborhood,
        seller.bio,
        ...(seller.favoriteGames || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, sellers]);

  return (
    <MobileScreen className="pb-[92px]">
      <SeoHead canonicalPath="/sellers" description="Browse local seller profiles, trust signals, and active deal reputations across Winnipeg." title="Sellers" />

      <ScreenHeader subtitle={`${sellers.length} local profiles`} title="Sellers" />

      <ScreenSection className="pb-3">
        <InlineSearch onChange={setQuery} placeholder="Search sellers, games, neighborhoods..." value={query} />
      </ScreenSection>

      <ScreenSection className="pb-3">
        <div
          className="flex items-center justify-between rounded-[18px] px-4 py-3"
          style={{ background: m.surfaceStrong, border: `1px solid ${m.border}` }}
        >
          <div>
            <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
              Trusted seller lane
            </p>
            <p className="text-[10px]" style={{ color: m.textSecondary }}>
              Sorted by local deal activity and review signal
            </p>
          </div>
          <Search size={14} style={{ color: m.textMuted }} />
        </div>
      </ScreenSection>

      <ScreenSection className="flex-1 pb-2">
        {filteredSellers.length ? (
          <div className="flex flex-col gap-2">
            {filteredSellers.map((seller) => (
              <SellerCard
                key={seller.id}
                badgeLabels={(seller.badges || []).map((badge) => reviewBadgeCatalog[badge]?.label || badge)}
                followerCount={sellerFollowerCounts[seller.id] || 0}
                seller={seller}
              />
            ))}
          </div>
        ) : (
          <EmptyBlock
            description="Try a different seller name, game, or neighborhood."
            title="No sellers match that search"
          />
        )}
      </ScreenSection>
    </MobileScreen>
  );
}
