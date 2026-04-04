import { Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import ProfileWorkspaceNav from "../components/account/ProfileWorkspaceNav";
import SeoHead from "../components/seo/SeoHead";
import CardArtwork from "../components/shared/CardArtwork";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import {
  BottomSheet,
  ChoicePill,
  EmptyBlock,
  MobileScreen,
  PrimaryButton,
  ScreenHeader,
  ScreenSection,
  SecondaryButton,
  TextField,
} from "../mobile/primitives";
import { searchCardPrintings } from "../services/cardDatabase";

const GAME_OPTIONS = ["Pokemon", "Magic", "One Piece", "Dragon Ball Super Fusion World", "Union Arena"];
const LANGUAGE_OPTIONS = ["english", "japanese"];

function CollectionStat({ label, value, hint }) {
  return (
    <div className="rounded-[18px] px-4 py-3" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
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

function SearchResultRow({ formatCadPrice, onAdd, result, searchGame }) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] px-3 py-3" style={{ background: m.surface, border: `1px solid ${m.border}` }}>
      <CardArtwork className="aspect-[63/88] w-[52px] shrink-0 rounded-[10px] object-cover" game={searchGame} src={result.imageUrl} title={result.title} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] text-white" style={{ fontWeight: 700 }}>
          {result.title}
        </p>
        <p className="mt-1 truncate text-[10px]" style={{ color: m.textSecondary }}>
          {[result.setName, result.printLabel, result.rarity].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-1 text-[9px]" style={{ color: m.textTertiary }}>
          {formatCadPrice(result.marketPrice || 0, result.marketPriceCurrency || "CAD")}
        </p>
      </div>
      <button className="inline-flex h-8 items-center justify-center gap-1 rounded-[12px] px-3 text-[10px]" style={{ background: m.redGradient, color: "#fff", fontWeight: 700 }} type="button" onClick={onAdd}>
        <Plus size={12} />
        Add
      </button>
    </div>
  );
}

function BinderRow({ formatCadPrice, item, onQuantityChange, onRemove }) {
  return (
    <article className="rounded-[18px] px-4 py-4" style={{ background: m.surface, border: `1px solid ${m.border}`, boxShadow: m.shadowPanel }}>
      <div className="flex gap-3">
        <CardArtwork className="aspect-[63/88] w-[58px] shrink-0 rounded-[12px] object-cover" game={item.game} src={item.imageUrl} title={item.title} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] text-white" style={{ fontWeight: 700 }}>
                {item.title}
              </p>
              <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                {[item.game, item.setName, item.printLabel].filter(Boolean).join(" · ")}
              </p>
            </div>
            <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
              {formatCadPrice((Number(item.marketPrice) || 0) * Math.max(1, Number(item.quantity) || 1), item.marketPriceCurrency || "CAD")}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button className="inline-flex h-7 w-7 items-center justify-center rounded-[10px]" style={{ background: m.surfaceStrong, color: m.text }} type="button" onClick={() => onQuantityChange(item.id, { quantity: Math.max(1, Number(item.quantity) - 1 || 1) })}>
                -
              </button>
              <span className="min-w-[1.5rem] text-center text-[11px] text-white" style={{ fontWeight: 700 }}>
                {item.quantity}
              </span>
              <button className="inline-flex h-7 w-7 items-center justify-center rounded-[10px]" style={{ background: m.surfaceStrong, color: m.text }} type="button" onClick={() => onQuantityChange(item.id, { quantity: Math.max(1, Number(item.quantity) + 1 || 1) })}>
                +
              </button>
            </div>
            <button className="inline-flex h-8 items-center justify-center gap-1 rounded-[12px] px-3 text-[10px]" style={{ background: "transparent", color: m.textSecondary, fontWeight: 600 }} type="button" onClick={onRemove}>
              <Trash2 size={12} />
              Remove
            </button>
          </div>
        </div>
      </div>
    </article>
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
  const [filter, setFilter] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const normalizedFilter = filter.trim().toLowerCase();
    if (!normalizedFilter) {
      return collectionItems;
    }
    return collectionItems.filter((item) =>
      [item.title, item.game, item.setName, item.printLabel, item.notes].filter(Boolean).join(" ").toLowerCase().includes(normalizedFilter),
    );
  }, [collectionItems, filter]);

  async function handleSearch() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const result = await searchCardPrintings({
        game: searchGame,
        query: trimmedQuery,
        limit: 10,
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
    setSearchError("");
    const response = await addCollectionItem({
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
    if (!response?.ok) {
      setSearchError(response?.error || "Could not add that card to your binder.");
      return;
    }
    setPickerOpen(false);
    setQuery("");
    setSearchResults([]);
  }

  return (
    <MobileScreen className="pb-[92px]">
      <SeoHead canonicalPath="/collection" description="Track your binder with live printings, quantities, and collection value snapshots." title="Collection" />

      <ProfileWorkspaceNav sellerId={currentUser?.id} />
      <ScreenHeader subtitle={`${collectionSummary.totalEntries} tracked entries`} title="Collection" />

      <ScreenSection className="grid grid-cols-2 gap-2 pb-3">
        <CollectionStat hint={`${collectionSummary.totalItems} total copies`} label="Tracked" value={collectionSummary.totalEntries} />
        <CollectionStat hint="Saved market references" label="Value" value={formatCadPrice(collectionSummary.estimatedValue, "CAD")} />
      </ScreenSection>

      <ScreenSection className="pb-3">
        <div className="flex gap-2">
          <TextField className="flex-1" onChange={setFilter} placeholder="Search your binder..." value={filter} />
          <PrimaryButton className="h-[42px] px-4" onClick={() => setPickerOpen(true)}>
            <Plus size={14} />
            Add
          </PrimaryButton>
        </div>
      </ScreenSection>

      <ScreenSection className="flex-1 pb-2">
        {filteredItems.length ? (
          <div className="flex flex-col gap-2">
            {filteredItems.map((item) => (
              <BinderRow key={item.id} formatCadPrice={formatCadPrice} item={item} onQuantityChange={updateCollectionItem} onRemove={() => removeCollectionItem(item.id)} />
            ))}
          </div>
        ) : (
          <EmptyBlock
            action={
              <PrimaryButton className="w-full" onClick={() => setPickerOpen(true)}>
                Add first card
              </PrimaryButton>
            }
            description="Search exact printings and start tracking your binder one entry at a time."
            title="No collection entries yet"
          />
        )}
      </ScreenSection>

      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] text-white" style={{ fontWeight: 700 }}>
                Add collection item
              </p>
              <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                Search a live printing and drop it into your binder
              </p>
            </div>
            <SecondaryButton className="h-8 px-3" onClick={() => setPickerOpen(false)}>
              Close
            </SecondaryButton>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {GAME_OPTIONS.map((option) => (
              <ChoicePill key={option} active={searchGame === option} onClick={() => setSearchGame(option)}>
                {option}
              </ChoicePill>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            {LANGUAGE_OPTIONS.map((option) => (
              <ChoicePill key={option} active={searchLanguage === option} onClick={() => setSearchLanguage(option)}>
                {option}
              </ChoicePill>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <div className="flex-1">
              <TextField onChange={setQuery} placeholder="Search card name" value={query} />
            </div>
            <PrimaryButton className="h-[42px] px-4" onClick={handleSearch}>
              <Search size={14} />
              Search
            </PrimaryButton>
          </div>

          {searching ? (
            <p className="mt-4 text-[11px]" style={{ color: m.textSecondary }}>
              Searching live printings...
            </p>
          ) : null}
          {searchError ? (
            <p className="mt-4 text-[11px]" style={{ color: "#fca5a5" }}>
              {searchError}
            </p>
          ) : null}

          <div className="mt-4 flex max-h-[44vh] flex-col gap-2 overflow-y-auto pr-1">
            {searchResults.map((result) => (
              <SearchResultRow
                key={`${result.provider || "source"}-${result.id || result.printLabel || result.title}`}
                formatCadPrice={formatCadPrice}
                onAdd={() => handleAddFromSearch(result)}
                result={result}
                searchGame={searchGame}
              />
            ))}
          </div>
        </div>
      </BottomSheet>
    </MobileScreen>
  );
}
