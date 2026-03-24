import { ArrowRight, CalendarRange, MapPin, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { storeProfiles } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";

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
    <div className="space-y-6 sm:space-y-8">
      <section className="console-shell p-4 sm:p-7">
        <p className="section-kicker">Meetup Spots</p>
        <h1 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.05em] text-ink sm:text-[3.2rem]">
          Approved local stores
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-steel sm:mt-4 sm:text-base sm:leading-8">
          Browse the shops most people use for safe public meetups, store events, and quick local pickups.
        </p>
      </section>

      <section className="grid gap-3 sm:gap-5 xl:grid-cols-2">
        {storeProfiles.map((store) => (
          <Link
            key={store.slug}
            className="console-panel overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-lift"
            to={`/stores/${store.slug}`}
          >
            <div className="relative h-28 overflow-hidden border-b border-[rgba(145,38,43,0.12)] bg-[linear-gradient(135deg,#4d0f13,#7a181d)] p-4 sm:h-48 sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.09),transparent_22%),radial-gradient(circle_at_78%_18%,rgba(239,59,51,0.12),transparent_24%)]" />
              <div className="relative z-10 flex h-full items-center justify-center rounded-[18px] border border-[rgba(255,255,255,0.82)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,243,243,0.96))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.74),0_20px_50px_rgba(80,16,16,0.14)] sm:rounded-[28px] sm:px-8 sm:py-6">
              {store.bannerUrl ? (
                <img alt={store.name} className="h-full w-full object-contain" src={store.bannerUrl} />
              ) : null}
              </div>
            </div>
            <div className="space-y-3 p-4 sm:space-y-4 sm:p-6">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div>
                  <p className="section-kicker">Store profile</p>
                  <h2 className="mt-2 font-display text-[1.35rem] font-semibold tracking-[-0.04em] text-ink sm:text-[2rem]">
                    {store.name}
                  </h2>
                </div>
                {store.approvedMeetup ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-orange/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange sm:px-3 sm:text-xs sm:tracking-[0.18em]">
                    <ShieldCheck size={14} />
                    Approved meetup
                  </span>
                ) : null}
              </div>

              <div className="grid gap-2 text-[0.84rem] text-steel sm:gap-3 sm:text-sm">
                <span className="inline-flex items-center gap-2">
                  <MapPin size={16} />
                  {store.address}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarRange size={16} />
                  Local event page and featured market listings
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} />
                  {storeFollowerCounts[store.slug] || 0} follower{storeFollowerCounts[store.slug] === 1 ? "" : "s"}
                </span>
              </div>

              <div className="inline-flex items-center gap-2 text-[0.84rem] font-semibold text-navy sm:text-sm">
                Open store profile
                <ArrowRight size={14} />
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
