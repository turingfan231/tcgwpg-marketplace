import { Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import ProfileWorkspaceNav from "../components/account/ProfileWorkspaceNav";
import SeoHead from "../components/seo/SeoHead";
import CardArtwork from "../components/shared/CardArtwork";
import EmptyState from "../components/ui/EmptyState";
import InlineSpinner from "../components/ui/InlineSpinner";
import { useMarketplace } from "../hooks/useMarketplace";
import { searchCardPrintings } from "../services/cardDatabase";

const gameOptions = [
  "Pokemon",
  "Magic",
  "One Piece",
  "Dragon Ball Super Fusion World",
  "Union Arena",
];

function SummaryTile({ label, value, detail }) {
  return (
    <div className="surface-muted rounded-[24px] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">{value}</p>
      {detail ? <p className="mt-2 text-sm text-steel">{detail}</p> : null}
    </div>
  );
}

export default function CollectionPage() {
  const {
    addCollectionItem,
    collectionItems,
    collectionSummary,
    currentUser,
    formatCadPrice,
    removeCollectionItem,
    updateCollectionItem,
  } = useMarketplace();
  const [query, setQuery] = useState("");
  const [searchGame, setSearchGame] = useState("Pokemon");
  const [searchLanguage, setSearchLanguage] = useState("english");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [filter, setFilter] = useState("");

  const filteredItems = useMemo(() => {
    const normalizedFilter = filter.trim().toLowerCase();
    if (!normalizedFilter) {
      return collectionItems;
    }

    return collectionItems.filter((item) =>
      [
        item.title,
        item.game,
        item.setName,
        item.printLabel,
        item.rarity,
        item.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedFilter),
    );
  }, [collectionItems, filter]);

  async function handleSearch(event) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    setSearching(true);
    setSearchError("");
    try {
      const result = await searchCardPrintings({
        game: searchGame,
        query: trimmedQuery,
        limit: 12,
        language: searchLanguage,
      });
      setSearchResults(Array.isArray(result?.results) ? result.results : []);
      if (!result?.results?.length) {
        setSearchError("No printings matched that search.");
      }
    } catch (error) {
      setSearchResults([]);
      setSearchError(error?.message || "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleAddFromSearch(result) {
    await addCollectionItem({
      game: searchGame,
      language: searchLanguage,
      title: result.title,
      setName: result.setName,
      printLabel: result.printLabel,
      rarity: result.rarity,
      marketPrice: result.marketPrice || 0,
      marketPriceCurrency: result.marketPriceCurrency || "CAD",
      imageUrl: result.imageUrl || "",
      sourceLabel: result.providerLabel || result.provider || "Live search",
      condition: "NM",
      quantity: 1,
    });
  }

  return (
    <div className="space-y-6">
      <SeoHead
        canonicalPath="/collection"
        description="Track your personal binder with live card lookups, saved quantities, and estimated collection value."
        title="Collection Tracker"
      />
      <ProfileWorkspaceNav sellerId={currentUser?.id} />
      <section className="surface-card p-6 sm:p-7">
        <p className="section-kicker">Personal binder</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-ink">
          Collection tracker
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-steel">
          Keep a clean running binder of singles, playsets, and personal inventory with quick market references in CAD.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <SummaryTile
            label="Tracked cards"
            value={collectionSummary.totalEntries}
            detail={`${collectionSummary.totalItems} total copies`}
          />
          <SummaryTile
            label="Estimated value"
            value={formatCadPrice(collectionSummary.estimatedValue, "CAD")}
            detail="Based on saved market references"
          />
          <SummaryTile
            label="Games"
            value={Object.keys(collectionSummary.gameBreakdown).length}
            detail={Object.entries(collectionSummary.gameBreakdown)
              .map(([key, count]) => `${key.replace("-", " ")} ${count}`)
              .slice(0, 2)
              .join(" | ") || "Start by adding your first card"}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-card p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <Sparkles className="text-navy" size={18} />
            <div>
              <p className="section-kicker">Live add</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                Search exact printings
              </h2>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSearch}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Game</span>
                <select
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy"
                  value={searchGame}
                  onChange={(event) => setSearchGame(event.target.value)}
                >
                  {gameOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Language</span>
                <select
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy"
                  value={searchLanguage}
                  onChange={(event) => setSearchLanguage(event.target.value)}
                >
                  <option value="english">English</option>
                  <option value="japanese">Japanese</option>
                </select>
              </label>
            </div>

            <div className="rounded-[22px] border border-[rgba(203,220,231,0.92)] bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <Search size={16} className="text-steel" />
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Card name, set code, or exact printing"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            <button
              className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
              disabled={searching || !query.trim()}
              type="submit"
            >
              {searching ? <InlineSpinner className="text-white" size={14} /> : <Search size={15} />}
              {searching ? "Searching..." : "Search database"}
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {searchError ? <p className="text-sm font-semibold text-rose-700">{searchError}</p> : null}
            {searchResults.map((result) => (
              <article
                key={result.id}
                className="flex items-center gap-3 rounded-[22px] border border-[rgba(203,220,231,0.92)] bg-white/90 px-4 py-4"
              >
                <CardArtwork
                  className="aspect-[63/88] w-[4.35rem] rounded-[16px] object-cover"
                  game={searchGame}
                  src={result.imageUrl}
                  title={result.title}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{result.title}</p>
                  <p className="mt-1 text-sm text-steel">
                    {[result.setName, result.printLabel, result.rarity].filter(Boolean).join(" | ")}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-steel">
                    {result.providerLabel || result.provider || "Live source"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-ink">
                    {formatCadPrice(result.marketPrice || 0, result.marketPriceCurrency || "CAD")}
                  </p>
                  <button
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-white"
                    type="button"
                    onClick={() => void handleAddFromSearch(result)}
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="surface-card p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-kicker">Tracked inventory</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                Binder entries
              </h2>
            </div>
            <div className="w-full sm:max-w-xs">
              <div className="rounded-[20px] border border-[rgba(203,220,231,0.92)] bg-white px-4 py-3">
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Filter your binder"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-4 rounded-[24px] border border-[rgba(203,220,231,0.92)] bg-white/92 p-4 sm:flex-row sm:items-center"
                >
                  <CardArtwork
                    className="aspect-[63/88] w-[5rem] rounded-[18px] object-cover"
                    game={item.game}
                    src={item.imageUrl}
                    title={item.title}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 text-sm text-steel">
                      {[item.game, item.setName, item.printLabel, item.rarity].filter(Boolean).join(" | ")}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-steel">
                      {item.sourceLabel}
                    </p>
                    {item.notes ? <p className="mt-2 text-sm text-steel">{item.notes}</p> : null}
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-steel">
                      Qty
                      <input
                        min="1"
                        className="w-16 rounded-[14px] border border-slate-200 bg-[#f7f7f8] px-3 py-2 text-center text-sm font-semibold text-ink outline-none transition focus:border-navy"
                        type="number"
                        value={item.quantity}
                        onChange={(event) =>
                          void updateCollectionItem(item.id, {
                            quantity: Math.max(1, Number(event.target.value) || 1),
                          })
                        }
                      />
                    </label>
                    <p className="font-semibold text-ink">
                      {formatCadPrice(
                        (Number(item.marketPrice) || 0) * Math.max(1, Number(item.quantity) || 1),
                        item.marketPriceCurrency || "CAD",
                      )}
                    </p>
                    <button
                      aria-label="Remove binder item"
                      className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white p-2 text-rose-700"
                      type="button"
                      onClick={() => void removeCollectionItem(item.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                description="Search a real printing on the left and add it to your binder."
                title="No cards tracked yet"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
