import { ArrowRight, CalendarRange, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { storeProfiles } from "../data/storefrontData";

export default function StoresPage() {
  return (
    <div className="space-y-8">
      <section className="console-shell p-6 sm:p-7">
        <p className="section-kicker">Meetup Spots</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-[3.2rem]">
          Approved local stores
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-steel">
          Browse the shops most people use for safe public meetups, store events, and quick local pickups.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {storeProfiles.map((store) => (
          <Link
            key={store.slug}
            className="console-panel overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-lift"
            to={`/stores/${store.slug}`}
          >
            <div className="relative h-48 overflow-hidden border-b border-[rgba(203,220,231,0.82)] bg-[linear-gradient(135deg,#11283a,#183a51)]">
              {store.bannerUrl ? (
                <img alt={store.name} className="h-full w-full object-contain p-8" src={store.bannerUrl} />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,18,28,0.08),rgba(7,18,28,0.28))]" />
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-kicker">Store profile</p>
                  <h2 className="mt-2 font-display text-[2rem] font-semibold tracking-[-0.04em] text-ink">
                    {store.name}
                  </h2>
                </div>
                {store.approvedMeetup ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    <ShieldCheck size={14} />
                    Approved meetup
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 text-sm text-steel">
                <span className="inline-flex items-center gap-2">
                  <MapPin size={16} />
                  {store.address}
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarRange size={16} />
                  Local event page and featured market listings
                </span>
              </div>

              <div className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
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
