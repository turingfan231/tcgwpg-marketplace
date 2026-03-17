import {
  ArrowRight,
  CalendarRange,
  MapPin,
  MessageCircleMore,
  Search,
  Shield,
  Store,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import ListingCard from "../components/cards/ListingCard";
import { useMarketplace } from "../hooks/useMarketplace";
import { formatCompactCurrency, formatNumber } from "../utils/formatters";

export default function HomePage() {
  const navigate = useNavigate();
  const {
    activeListings,
    featuredMerchandising,
    formatCadPrice,
    gameCatalog,
    hotListings,
    openCreateListing,
    sellers,
    setGlobalSearch,
  } = useMarketplace();

  const featuredCategories = gameCatalog.filter((game) => game.slug !== "all");
  const verifiedSellerCount = sellers.filter((seller) => seller.verified).length;
  const marketValue = hotListings.reduce(
    (total, listing) => total + (listing.marketPriceCad || 0),
    0,
  );
  const categorySummaries = useMemo(
    () =>
      featuredCategories.map((game) => ({
        ...game,
        count: activeListings.filter((listing) => listing.gameSlug === game.slug).length,
      })),
    [activeListings, featuredCategories],
  );

  return (
    <div className="space-y-10">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="surface-card market-glow relative overflow-hidden p-8 lg:p-10">
          <div className="market-stripe absolute inset-x-0 top-0 h-px" />
          <p className="section-kicker">Winnipeg Marketplace</p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-bold leading-[0.94] tracking-[-0.05em] text-ink sm:text-6xl">
            Local cards, clean listings, and faster deals than the usual marketplace mess.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-steel">
            TCGWPG is built around in-person TCG deals in Winnipeg. Search exact
            printings, compare live market references in CAD, message inside the app, and
            meet where local players actually play.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3.5 text-sm font-semibold text-white shadow-soft"
              type="button"
              onClick={() => {
                setGlobalSearch("");
                navigate("/market");
              }}
            >
              Browse all listings
              <ArrowRight size={16} />
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-ink"
              type="button"
              onClick={() => {
                const opened = openCreateListing();
                if (!opened) {
                  navigate("/auth", { state: { from: "/" } });
                }
              }}
            >
              Start selling
            </button>
          </div>

          <div className="mt-9 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200/80 bg-white/88 p-5">
              <p className="text-sm text-steel">Active listings</p>
              <p className="mt-2 font-display text-4xl font-bold tracking-[-0.04em] text-ink">
                {formatNumber(activeListings.length)}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-white/88 p-5">
              <p className="text-sm text-steel">Verified sellers</p>
              <p className="mt-2 font-display text-4xl font-bold tracking-[-0.04em] text-ink">
                {formatNumber(verifiedSellerCount)}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-white/88 p-5">
              <p className="text-sm text-steel">Hot market value</p>
              <p className="mt-2 font-display text-4xl font-bold tracking-[-0.04em] text-ink">
                {formatCompactCurrency(marketValue, "CAD")}
              </p>
            </div>
          </div>
        </article>

        <div className="grid gap-6">
          <article className="surface-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Recent Activity</p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] text-ink">
                  What locals are watching
                </h2>
              </div>
              <TrendingUp className="text-orange" size={22} />
            </div>

            <div className="mt-5 space-y-3">
              {hotListings.slice(0, 4).map((listing) => (
                <button
                  key={listing.id}
                  className="flex w-full items-start justify-between gap-4 rounded-[22px] border border-slate-200 bg-[#fbf8f1] px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white"
                  type="button"
                  onClick={() => navigate(`/listing/${listing.id}`)}
                >
                  <div>
                    <p className="font-semibold text-ink">{listing.title}</p>
                    <p className="mt-1 text-sm text-steel">
                      {listing.game} | {listing.neighborhood}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">
                      {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-steel">
                      {listing.views} views
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="surface-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">Why Locals Use It</p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] text-ink">
                  Built around local TCG behavior
                </h2>
              </div>
              <Store className="text-navy" size={22} />
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-[22px] bg-[#f8f5ee] p-4">
                <p className="font-semibold text-ink">Exact print search</p>
                <p className="mt-1 text-sm leading-7 text-steel">
                  Pokemon, Magic, and One Piece searches are ranked broadly enough for set
                  codes, variants, and partial names.
                </p>
              </div>
              <div className="rounded-[22px] bg-[#f8f5ee] p-4">
                <p className="font-semibold text-ink">Internal messaging</p>
                <p className="mt-1 text-sm leading-7 text-steel">
                  No email handoff. Price talk and meetup planning stay in one thread.
                </p>
              </div>
              <div className="rounded-[22px] bg-[#f8f5ee] p-4">
                <p className="font-semibold text-ink">Condition-first listings</p>
                <p className="mt-1 text-sm leading-7 text-steel">
                  Front image plus condition photos make higher-value listings more credible.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="surface-card p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-kicker">Browse By Game</p>
              <h2 className="mt-2 font-display text-4xl font-bold tracking-[-0.04em] text-ink">
                Start where your binder already lives
              </h2>
            </div>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
              to="/market"
            >
              Open full feed
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {categorySummaries.map((game) => (
              <button
                key={game.slug}
                className="group rounded-[28px] border border-slate-200 bg-[#fbf8f1] p-5 text-left transition hover:-translate-y-1 hover:border-slate-300 hover:bg-white"
                type="button"
                onClick={() => {
                  setGlobalSearch("");
                  navigate(`/market/${game.slug}`);
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy/70">
                  {game.shortName}
                </p>
                <h3 className="mt-3 font-display text-3xl font-bold tracking-[-0.04em] text-ink">
                  {game.name}
                </h3>
                <p className="mt-3 text-sm leading-7 text-steel">{game.description}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {game.count} listings
                  </span>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-navy">
                    Browse
                    <ArrowRight size={15} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="surface-card p-7">
          <p className="section-kicker">How It Works</p>
          <h2 className="mt-2 font-display text-4xl font-bold tracking-[-0.04em] text-ink">
            High-signal tools for local deals
          </h2>

          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-4 rounded-[24px] bg-[#f8f5ee] p-5">
              <Search className="mt-1 text-navy" size={18} />
              <div>
                <p className="font-semibold text-ink">Search by name, code, or variant</p>
                <p className="mt-1 text-sm leading-7 text-steel">
                  `PRB02-006`, `Buggy SP`, or `Charizard ex` should all land on usable
                  printings.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-[24px] bg-[#f8f5ee] p-5">
              <MapPin className="mt-1 text-orange" size={18} />
              <div>
                <p className="font-semibold text-ink">Neighborhood-aware browsing</p>
                <p className="mt-1 text-sm leading-7 text-steel">
                  Winnipeg neighborhoods and postal codes make meetup planning faster.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-[24px] bg-[#f8f5ee] p-5">
              <CalendarRange className="mt-1 text-navy" size={18} />
              <div>
                <p className="font-semibold text-ink">Store events in one calendar</p>
                <p className="mt-1 text-sm leading-7 text-steel">
                  Fusion, A Muse, Arctic, and admin-managed Galaxy events are surfaced in one place.
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Featured Listings</p>
            <h2 className="section-title mt-2">Top picks from the local feed</h2>
          </div>
          <button
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
            type="button"
            onClick={() => {
              setGlobalSearch("");
              navigate("/market");
            }}
          >
            Open market feed
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {featuredMerchandising.hotThisWeek.length
            ? featuredMerchandising.hotThisWeek
            : hotListings
          .slice(0, 4)
          .map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {[
          {
            label: "Higher-End Listings",
            items: featuredMerchandising.highEndLocal.slice(0, 3),
          },
          {
            label: "Lower-Priced Finds",
            items: featuredMerchandising.budgetPickups.slice(0, 3),
          },
          {
            label: "Recently Added",
            items: featuredMerchandising.freshlyPosted.slice(0, 3),
          },
        ].map((section) => (
          <article key={section.label} className="surface-card p-6">
            <p className="section-kicker">{section.label}</p>
            <div className="mt-4 space-y-3">
              {section.items.map((listing) => (
                <button
                  key={listing.id}
                  className="flex w-full items-start justify-between gap-3 rounded-[22px] border border-slate-200 bg-[#fbf8f1] px-4 py-4 text-left transition hover:border-slate-300 hover:bg-white"
                  type="button"
                  onClick={() => navigate(`/listing/${listing.id}`)}
                >
                  <div>
                    <p className="font-semibold text-ink">{listing.title}</p>
                    <p className="mt-1 text-sm text-steel">
                      {listing.game} | {listing.neighborhood}
                    </p>
                  </div>
                  <span className="font-semibold text-ink">
                    {formatCadPrice(listing.price, listing.priceCurrency || "CAD")}
                  </span>
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <article className="surface-card p-7">
          <p className="section-kicker">Your Account</p>
          <h2 className="mt-2 font-display text-4xl font-bold tracking-[-0.04em] text-ink">
            Save time once you start trading here regularly
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-steel">
            Accounts now handle in-app messaging, seller management, account settings,
            neighborhood details, postal code updates, and password changes without
            sending you somewhere else.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white"
              type="button"
              onClick={() => navigate("/auth")}
            >
              Login or sign up
            </button>
            <button
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-steel"
              type="button"
              onClick={() => navigate("/account")}
            >
              Account settings
            </button>
          </div>
        </article>

        <div className="grid gap-5 sm:grid-cols-2">
          <article className="surface-card p-6">
            <MessageCircleMore className="text-orange" />
            <h3 className="mt-4 font-display text-2xl font-bold tracking-[-0.03em] text-ink">
              Internal inbox
            </h3>
            <p className="mt-2 text-sm leading-7 text-steel">
              Buyer questions, trade talk, and pickup details stay attached to the listing.
            </p>
          </article>
          <article className="surface-card p-6">
            <Shield className="text-navy" />
            <h3 className="mt-4 font-display text-2xl font-bold tracking-[-0.03em] text-ink">
              Trust and moderation
            </h3>
            <p className="mt-2 text-sm leading-7 text-steel">
              Seller badges, verification, moderation notes, and admin controls are built in.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
