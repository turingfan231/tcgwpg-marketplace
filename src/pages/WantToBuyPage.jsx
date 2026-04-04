import { ArrowRight, Search, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import {
  EmptyBlock,
  ListingRow,
  MobileScreen,
  PrimaryButton,
  ScreenHeader,
  ScreenSection,
} from "../mobile/primitives";

function DemandStat({ label, value, hint }) {
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
      <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
        {hint}
      </p>
    </div>
  );
}

export default function WantToBuyPage() {
  const navigate = useNavigate();
  const { activeListings, wishlist, toggleWishlist } = useMarketplace();

  const wtbListings = useMemo(
    () =>
      activeListings
        .filter((listing) => listing.type === "WTB")
        .sort((left, right) => Number(right.sortTimestamp || 0) - Number(left.sortTimestamp || 0)),
    [activeListings],
  );

  const distinctGames = useMemo(
    () => new Set(wtbListings.map((listing) => listing.game).filter(Boolean)).size,
    [wtbListings],
  );

  const averageBudget = useMemo(() => {
    if (!wtbListings.length) {
      return 0;
    }
    const total = wtbListings.reduce((sum, listing) => sum + Number(listing.price || 0), 0);
    return Math.round(total / wtbListings.length);
  }, [wtbListings]);

  return (
    <MobileScreen className="pb-[92px]">
      <SeoHead
        canonicalPath="/wtb"
        description="Browse active local want-to-buy requests across Winnipeg and match sellers to live buyer demand."
        title="Want To Buy"
      />

      <ScreenHeader subtitle="Live local buyer demand" title="Want To Buy" />

      <ScreenSection className="pb-3">
        <div
          className="rounded-[20px] px-4 py-4"
          style={{
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
            border: `1px solid ${m.borderStrong}`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: "#fca5a5", fontWeight: 700 }}>
                Buyer board
              </p>
              <p className="mt-2 text-[18px] text-white" style={{ fontWeight: 700 }}>
                Match into real local demand
              </p>
              <p className="mt-2 text-[11px] leading-5" style={{ color: m.textSecondary }}>
                Sellers can scan current asks, budget ranges, and hard-to-find wants before posting inventory blind.
              </p>
            </div>
            <PrimaryButton className="h-9 px-3" onClick={() => navigate("/sell", { state: { presetType: "WTB" } })}>
              Post WTB
            </PrimaryButton>
          </div>
        </div>
      </ScreenSection>

      <ScreenSection className="grid grid-cols-2 gap-2 pb-3">
        <DemandStat hint="Open request posts" label="Open posts" value={wtbListings.length} />
        <DemandStat hint="Average request budget" label="Average" value={`$${averageBudget}`} />
        <DemandStat hint="Distinct games on the board" label="Games" value={distinctGames} />
        <DemandStat hint="Freshest local asks" label="Updated" value="Live" />
      </ScreenSection>

      <ScreenSection className="pb-2">
        <div className="flex items-center gap-2 rounded-[16px] px-4 py-3" style={{ background: m.surfaceStrong, border: `1px solid ${m.border}` }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: "rgba(239,68,68,0.12)" }}>
            <Search size={14} style={{ color: m.red }} />
          </div>
          <p className="min-w-0 flex-1 text-[11px]" style={{ color: m.textSecondary }}>
            Most requests come from players hunting deck staples, sealed product, and event-ready singles.
          </p>
          <Sparkles size={14} style={{ color: m.textTertiary }} />
        </div>
      </ScreenSection>

      <ScreenSection className="flex-1 pb-2">
        {wtbListings.length ? (
          <div className="flex flex-col gap-2">
            {wtbListings.map((listing) => (
              <ListingRow
                key={listing.id}
                favorite={wishlist.includes(listing.id)}
                listing={listing}
                meta={[listing.game, listing.condition || "Target", listing.neighborhood].filter(Boolean).join(" · ")}
                onFavorite={() => toggleWishlist(listing.id)}
                trailing={
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: "transparent" }}
                    type="button"
                    onClick={() => navigate(`/listing/${listing.id}`)}
                  >
                    <ArrowRight size={14} style={{ color: m.textSecondary }} />
                  </button>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyBlock
            action={
              <PrimaryButton className="w-full" onClick={() => navigate("/sell", { state: { presetType: "WTB" } })}>
                Start first request
              </PrimaryButton>
            }
            description="Use WTB posts to surface missing staples, deck cores, and sealed product to local sellers."
            title="No active requests yet"
          />
        )}
      </ScreenSection>
    </MobileScreen>
  );
}
