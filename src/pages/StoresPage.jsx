import { ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import { storeProfiles } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import { MobileScreen, ScreenHeader, ScreenSection } from "../mobile/primitives";

function StoreCard({ followerCount, store }) {
  return (
    <Link
      className="block rounded-[18px] px-4 py-4"
      style={{ background: m.surface, border: `1px solid ${m.border}`, boxShadow: m.shadowPanel }}
      to={`/stores/${store.slug}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px]"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          {store.logoUrl ? (
            <img alt={store.name} className="h-full w-full object-contain p-2" src={store.logoUrl} />
          ) : (
            <span className="text-sm text-white" style={{ fontWeight: 700 }}>
              {String(store.shortName || store.name).charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] text-white" style={{ fontWeight: 700 }}>
                {store.name}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                {store.neighborhood}
              </p>
            </div>
            {store.approvedMeetup ? (
              <span
                className="rounded-full px-2 py-[3px] text-[8px] uppercase"
                style={{ background: "rgba(239,68,68,0.14)", color: "#fca5a5", fontWeight: 700 }}
              >
                Approved
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid gap-1 text-[10px]" style={{ color: m.textSecondary }}>
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} />
              {store.address}
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={11} style={{ color: m.red }} />
              {followerCount} follows · meetup enabled
            </span>
          </div>

          {store.siteUrl ? (
            <span className="mt-3 inline-flex items-center gap-1 text-[10px]" style={{ color: m.textSecondary }}>
              Open store
              <ExternalLink size={11} />
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function StoresPage() {
  const { sellers } = useMarketplace();

  const storeFollowerCounts = useMemo(
    () =>
      sellers.reduce((accumulator, seller) => {
        (seller.followedStoreSlugs || []).forEach((slug) => {
          accumulator[slug] = (accumulator[slug] || 0) + 1;
        });
        return accumulator;
      }, {}),
    [sellers],
  );

  return (
    <MobileScreen className="pb-[92px]">
      <SeoHead canonicalPath="/stores" description="Browse approved Winnipeg meetup spots, local store profiles, and trusted pickup locations." title="Stores" />

      <ScreenHeader subtitle={`${storeProfiles.length} approved meetup spots`} title="Stores" />

      <ScreenSection className="pb-3">
        <div
          className="rounded-[18px] px-4 py-4"
          style={{
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
            border: `1px solid ${m.borderStrong}`,
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: "#fca5a5", fontWeight: 700 }}>
            Store network
          </p>
          <p className="mt-2 text-[18px] text-white" style={{ fontWeight: 700 }}>
            Local meetup-safe locations
          </p>
          <p className="mt-2 text-[11px] leading-5" style={{ color: m.textSecondary }}>
            These store profiles anchor public meetups, event discovery, and trusted handoffs across Winnipeg.
          </p>
        </div>
      </ScreenSection>

      <ScreenSection className="flex-1 pb-2">
        <div className="flex flex-col gap-2">
          {storeProfiles.map((store) => (
            <StoreCard key={store.slug} followerCount={storeFollowerCounts[store.slug] || 0} store={store} />
          ))}
        </div>
      </ScreenSection>
    </MobileScreen>
  );
}
