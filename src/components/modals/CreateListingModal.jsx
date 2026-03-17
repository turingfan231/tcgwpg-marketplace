import {
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { neighborhoods } from "../../data/mockData";
import { useMarketplace } from "../../hooks/useMarketplace";
import {
  searchCardPrintings,
  supportsLiveSearch,
} from "../../services/cardDatabase";
import { formatCurrency } from "../../utils/formatters";
import CardArtwork from "../shared/CardArtwork";
import Sparkline from "../ui/Sparkline";
import ModalShell from "../ui/ModalShell";

const initialFormState = {
  title: "",
  game: "Pokemon",
  type: "WTS",
  condition: "NM",
  price: "",
  marketPrice: "",
  marketPriceCurrency: "CAD",
  neighborhood: "St. Vital",
  postalCode: "",
  acceptsTrade: false,
  listingFormat: "single",
  quantity: 1,
  bundleItems: "",
  description: "",
  imageUrl: "",
  conditionImages: [],
};

function FieldLabel({ children }) {
  return <span className="mb-2 block text-sm font-semibold text-steel">{children}</span>;
}

export default function CreateListingModal({ onClose }) {
  const navigate = useNavigate();
  const {
    addListing,
    clearListingDraft,
    currentUser,
    listingDraft,
    recordSearchQuery,
    saveListingDraft,
    searchHistory,
  } = useMarketplace();
  const [form, setForm] = useState(() => ({
    ...initialFormState,
    neighborhood: currentUser?.neighborhood || initialFormState.neighborhood,
    postalCode: currentUser?.postalCode || "",
  }));
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [providerLabel, setProviderLabel] = useState("Live search");
  const [searchNote, setSearchNote] = useState(
    "Search a live card database and choose the exact printing you want to autofill.",
  );
  const [selectedPrintingId, setSelectedPrintingId] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [conditionPreviewImages, setConditionPreviewImages] = useState([]);
  const [draftMessage, setDraftMessage] = useState("");

  const liveSearchSupported = useMemo(
    () => supportsLiveSearch(form.game),
    [form.game],
  );
  const recentQueries = useMemo(
    () =>
      searchHistory
        .filter((entry) => String(entry.query || "").trim())
        .slice(0, 6),
    [searchHistory],
  );
  const comparisonSparkPoints = useMemo(() => {
    const market = Number(form.marketPrice) || 0;
    const asking = Number(form.price) || 0;
    const anchor = market || asking || 0;
    return [
      { value: anchor * 0.92 || 1 },
      { value: anchor * 0.98 || 1.2 },
      { value: market || anchor || 1.1 },
      { value: asking || anchor || 1.3 },
    ];
  }, [form.marketPrice, form.price]);

  useEffect(() => {
    if (!listingDraft) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      ...listingDraft,
      neighborhood:
        listingDraft.neighborhood || currentUser?.neighborhood || currentForm.neighborhood,
      postalCode: listingDraft.postalCode || currentUser?.postalCode || "",
    }));
    setConditionPreviewImages(listingDraft.conditionImages || []);
    setSearchQuery(listingDraft.searchQuery || "");
    setDraftMessage("Draft restored.");
  }, [currentUser?.neighborhood, currentUser?.postalCode, listingDraft]);

  function updateField(field, value) {
    setDraftMessage("");
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function handleSearch(event) {
    event.preventDefault();
    setLoadingSearch(true);
    setSearchError("");
    setDraftMessage("");
    recordSearchQuery(searchQuery, { game: form.game, source: "create-listing" });

    try {
      const result = await searchCardPrintings({
        game: form.game,
        query: searchQuery,
      });

      startTransition(() => {
        setSearchResults(result.results || []);
        setProviderLabel(result.providerLabel || "Live search");
        setSearchNote(
          result.note ||
            "Select a printing to autofill image, set details, and market value.",
        );
      });
    } catch (error) {
      setSearchError(error.message);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  }

  function handlePrimaryFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("imageUrl", reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleConditionFileUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          }),
      ),
    ).then((images) => {
      const validImages = images.filter(Boolean);

      setConditionPreviewImages((currentImages) => [...currentImages, ...validImages]);
      setForm((currentForm) => ({
        ...currentForm,
        conditionImages: [...currentForm.conditionImages, ...validImages],
      }));
    });
  }

  function applyPrinting(printing) {
    setSelectedPrintingId(printing.id);
    setForm((currentForm) => ({
      ...currentForm,
      title: printing.title,
      imageUrl: printing.imageUrl || currentForm.imageUrl,
      marketPrice: printing.marketPrice ?? "",
      marketPriceCurrency: printing.marketPriceCurrency || "CAD",
      price:
        currentForm.price ||
        (printing.marketPrice ? Math.round(printing.marketPrice) : ""),
      description: [
        printing.description,
        printing.providerLabel ? `Source: ${printing.providerLabel}` : null,
      ]
        .filter(Boolean)
        .join(". "),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    setDraftMessage("");
    const result = await addListing({
      ...form,
      bundleItems: form.bundleItems
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      imageGallery: [form.imageUrl, ...form.conditionImages].filter(Boolean),
    });

    if (!result?.ok) {
      setSubmitError(result?.error || "Listing could not be posted.");
      return;
    }

    const createdListing = result.listing;
    onClose();
    navigate(`/listing/${createdListing.id}`);
  }

  return (
    <ModalShell
      subtitle="Create a local listing with live print search, cleaner card framing, and extra condition photos."
      title="Create Listing"
      wide
      onClose={onClose}
    >
      <form
        className="grid gap-0 bg-[linear-gradient(180deg,#fbf8f1_0%,#f3efe7_100%)] 2xl:grid-cols-[minmax(380px,0.74fr)_minmax(0,1.26fr)]"
        onSubmit={handleSubmit}
      >
        <div className="space-y-6 border-b border-slate-200 p-6 lg:p-8 2xl:border-b-0 2xl:border-r">
          <section className="surface-card p-6">
            <p className="section-kicker">Listing basics</p>
            <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
              Card details
            </h3>
            <p className="mt-2 text-sm leading-7 text-steel">
              Fill in the local listing details first. Then search the live database on the
              right to pull in the exact printing and current market context.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block md:col-span-2">
                <FieldLabel>Listing title</FieldLabel>
                <input
                  required
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="Card title or bundle name"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                />
              </label>

              <label className="block">
                <FieldLabel>Game</FieldLabel>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5 outline-none transition focus:border-navy focus:bg-white"
                  value={form.game}
                  onChange={(event) => updateField("game", event.target.value)}
                >
                  <option>Pokemon</option>
                  <option>Magic</option>
                  <option>One Piece</option>
                </select>
              </label>

              <label className="block">
                <FieldLabel>Listing type</FieldLabel>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5 outline-none transition focus:border-navy focus:bg-white"
                  value={form.type}
                  onChange={(event) => updateField("type", event.target.value)}
                >
                  <option>WTS</option>
                  <option>WTB</option>
                  <option>WTT</option>
                </select>
              </label>

              <label className="block">
                <FieldLabel>Format</FieldLabel>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5 outline-none transition focus:border-navy focus:bg-white"
                  value={form.listingFormat}
                  onChange={(event) => updateField("listingFormat", event.target.value)}
                >
                  <option value="single">Single card</option>
                  <option value="playset">Playset / multiples</option>
                  <option value="bundle">Bundle</option>
                  <option value="deck">Deck / core</option>
                  <option value="sealed">Sealed product</option>
                  <option value="binder">Binder page</option>
                </select>
              </label>

              <label className="block">
                <FieldLabel>Condition</FieldLabel>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5 outline-none transition focus:border-navy focus:bg-white"
                  value={form.condition}
                  onChange={(event) => updateField("condition", event.target.value)}
                >
                  <option>NM</option>
                  <option>LP</option>
                  <option>MP</option>
                  <option>HP</option>
                </select>
              </label>

              <label className="block">
                <FieldLabel>Asking price (CAD)</FieldLabel>
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5 outline-none transition focus:border-navy focus:bg-white"
                  value={form.price}
                  onChange={(event) => updateField("price", event.target.value)}
                />
              </label>

              <label className="block">
                <FieldLabel>Quantity</FieldLabel>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5 outline-none transition focus:border-navy focus:bg-white"
                  value={form.quantity}
                  onChange={(event) => updateField("quantity", event.target.value)}
                >
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                  <option value={8}>8x</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <FieldLabel>Neighborhood</FieldLabel>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5 outline-none transition focus:border-navy focus:bg-white"
                  value={form.neighborhood}
                  onChange={(event) => updateField("neighborhood", event.target.value)}
                >
                  {neighborhoods.slice(1).map((neighborhood) => (
                    <option key={neighborhood}>{neighborhood}</option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <FieldLabel>Postal code</FieldLabel>
                <input
                  maxLength={7}
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="Optional meetup postal code"
                  value={form.postalCode}
                  onChange={(event) => updateField("postalCode", event.target.value)}
                />
              </label>

              {form.listingFormat !== "single" ? (
                <label className="block md:col-span-2">
                  <FieldLabel>Bundle contents</FieldLabel>
                  <textarea
                    className="min-h-28 w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5 outline-none transition focus:border-navy focus:bg-white"
                    placeholder="One item or note per line. Example: 4x Charizard ex&#10;Sleeved deck core&#10;Matching tokens"
                    value={form.bundleItems}
                    onChange={(event) => updateField("bundleItems", event.target.value)}
                  />
                </label>
              ) : null}

              <label className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-4 md:col-span-2">
                <input
                  checked={form.acceptsTrade}
                  className="h-4 w-4 accent-navy"
                  type="checkbox"
                  onChange={(event) => updateField("acceptsTrade", event.target.checked)}
                />
                <span className="text-sm font-semibold text-ink">Accepts trades</span>
              </label>
            </div>
          </section>

          <section className="surface-card p-6">
            <p className="section-kicker">Photos and notes</p>
            <div className="mt-5 space-y-5">
              <label className="block">
                <FieldLabel>Description</FieldLabel>
                <textarea
                  required
                  className="min-h-40 w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="Call out set, rarity, defects, meetup range, and trade interests."
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                />
              </label>

              <div className="block">
                <FieldLabel>Primary card image</FieldLabel>
                <label className="flex cursor-pointer items-center gap-3 rounded-[22px] border border-dashed border-slate-300 bg-[#f8f5ee] px-4 py-5 text-steel transition hover:border-navy hover:text-ink">
                  <ImagePlus size={18} />
                  <span className="text-sm font-semibold">
                    Upload the front-facing card image or let live search fill it in
                  </span>
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={handlePrimaryFileUpload}
                  />
                </label>
              </div>

              <div className="block">
                <FieldLabel>Condition photos</FieldLabel>
                <label className="flex cursor-pointer items-center gap-3 rounded-[22px] border border-dashed border-slate-300 bg-[#f8f5ee] px-4 py-5 text-steel transition hover:border-navy hover:text-ink">
                  <ImagePlus size={18} />
                  <span className="text-sm font-semibold">
                    Upload close-ups of corners, edges, back, or surface wear
                  </span>
                  <input
                    multiple
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={handleConditionFileUpload}
                  />
                </label>

                {conditionPreviewImages.length ? (
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {conditionPreviewImages.map((image, index) => (
                      <img
                        key={`${image}-${index}`}
                        alt={`Condition preview ${index + 1}`}
                        className="aspect-square w-full rounded-[18px] border border-slate-200 object-cover"
                        src={image}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6 bg-[linear-gradient(180deg,#f7f3eb_0%,#efe8dd_100%)] p-6 lg:p-8">
          <section className="rounded-[34px] bg-[#17394a] p-6 text-white shadow-lift">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="section-kicker text-white/65">Live print search</p>
                <h3 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
                  Find the exact printing
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/82">
                  Search live printings for Pokemon, Magic, and One Piece. The search is
                  intentionally broad so product codes, variant terms, and partial names can
                  still surface the right printings.
                </p>
              </div>
              {selectedPrintingId ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  <CheckCircle2 size={14} />
                  Printing selected
                </span>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex items-center gap-2 rounded-[24px] border border-white/12 bg-white/10 p-2.5">
                <Search className="ml-2 text-white/65" size={16} />
                <input
                  className="flex-1 border-0 bg-transparent px-1 py-2 text-sm text-white outline-none placeholder:text-white/45"
                  placeholder="Type a card name, code, or variant"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <button
                className="rounded-full bg-orange px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!searchQuery.trim() || loadingSearch || !liveSearchSupported}
                type="button"
                onClick={handleSearch}
              >
                {loadingSearch ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="animate-spin" size={14} />
                    Searching
                  </span>
                ) : (
                  "Search database"
                )}
              </button>
            </div>

            <div className="mt-4 rounded-[24px] border border-white/12 bg-white/10 px-4 py-3 text-sm text-white/82">
              <span className="font-semibold text-white">{providerLabel}</span>
              <span className="mx-2 text-white/30">|</span>
              {liveSearchSupported
                ? searchError || searchNote
                : "Live search is available only for Magic, Pokemon, and One Piece."}
            </div>

            {recentQueries.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {recentQueries.map((entry) => (
                  <button
                    key={entry.id}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:bg-white/16"
                    type="button"
                    onClick={() => setSearchQuery(entry.query)}
                  >
                    {entry.query}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]">
            <section className="surface-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-steel">Listing preview</p>
                  <p className="mt-1 text-sm text-steel">
                    Buyers see the title image as the main card face.
                  </p>
                </div>
                {form.marketPrice ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    <Sparkles size={13} />
                    Market synced
                  </span>
                ) : null}
              </div>

              <CardArtwork
                className="mt-4 aspect-[63/88] w-full rounded-[26px] object-cover"
                game={form.game}
                src={form.imageUrl}
                title={form.title || "Your card preview"}
              />

              <div className="mt-5 space-y-3">
                <h4 className="font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  {form.title || "Untitled listing"}
                </h4>
                <p className="text-sm leading-7 text-steel">
                  {form.description ||
                    "Add a description to show local buyers what matters about this card and where you can meet."}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <span className="font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                    {form.price ? formatCurrency(form.price, "CAD") : "$0"}
                  </span>
                  {form.marketPrice ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      <Sparkles size={13} />
                      Market {formatCurrency(form.marketPrice, form.marketPriceCurrency)}
                    </span>
                  ) : null}
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-[#f8f5ee] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                      Price context
                    </p>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                      Qty {form.quantity}x
                    </span>
                  </div>
                  <Sparkline className="mt-3 w-full" points={comparisonSparkPoints} />
                </div>
              </div>
            </section>

            <section className="surface-card p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-steel">Matching printings</p>
                  <p className="mt-1 max-w-2xl text-sm leading-7 text-steel">
                    Results are ranked broadly so variant terms, partial names, and product
                    codes still surface usable printings.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {searchResults.length} results
                </span>
              </div>

              <div className="grid max-h-[42rem] gap-4 overflow-y-auto pr-1">
                {searchResults.map((printing) => (
                  <button
                    key={printing.id}
                    className={`grid gap-0 overflow-hidden rounded-[28px] border bg-white text-left transition lg:grid-cols-[200px_minmax(0,1fr)] ${
                      selectedPrintingId === printing.id
                        ? "border-navy shadow-soft ring-2 ring-navy/10"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-soft"
                    }`}
                    type="button"
                    onClick={() => applyPrinting(printing)}
                  >
                    <div className="flex items-center justify-center bg-[linear-gradient(180deg,#faf7f0_0%,#f3efe7_100%)] p-4">
                      <CardArtwork
                        className="aspect-[63/88] w-full max-w-[10.5rem] rounded-[22px] object-cover"
                        game={form.game}
                        src={printing.imageUrl}
                        title={printing.title}
                      />
                    </div>

                    <div className="flex min-w-0 flex-col justify-between gap-4 p-5">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                            {printing.printLabel || printing.providerLabel}
                          </span>
                          <span className="rounded-full bg-orange/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange">
                            {printing.setName}
                          </span>
                          <span className="rounded-full bg-navy/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-navy">
                            {printing.rarity}
                          </span>
                          {selectedPrintingId === printing.id ? (
                            <span className="rounded-full bg-navy/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-navy">
                              Selected
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <h4 className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                            {printing.title}
                          </h4>
                          <p className="mt-2 text-sm leading-7 text-steel">
                            {printing.setName} | {printing.rarity}
                          </p>
                          <p className="mt-2 text-xs leading-6 text-slate-500">
                            {printing.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                            Market reference
                          </p>
                          <p className="mt-1 font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
                            {printing.marketPrice
                              ? formatCurrency(
                                  printing.marketPrice,
                                  printing.marketPriceCurrency || "USD",
                                )
                              : "No market"}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-orange/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange">
                          Tap to autofill
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {!searchResults.length && !loadingSearch ? (
                <div className="mt-4 rounded-[28px] border border-dashed border-slate-200 bg-[#f8f5ee] px-5 py-16 text-center text-sm leading-7 text-steel">
                  Search a card name, code, or variant above to load live printings here.
                </div>
              ) : null}
            </section>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-2">
            <button
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
              type="button"
              onClick={async () => {
                setSubmitError("");
                const result = await saveListingDraft({ ...form, searchQuery });
                if (!result?.ok) {
                  setDraftMessage("");
                  setSubmitError(result?.error || "Draft could not be saved.");
                  return;
                }
                setDraftMessage("Draft saved.");
              }}
            >
              Save draft
            </button>
            {listingDraft ? (
              <button
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
                type="button"
                onClick={async () => {
                  setSubmitError("");
                  const result = await clearListingDraft();
                  if (!result?.ok) {
                    setDraftMessage("");
                    setSubmitError(result?.error || "Draft could not be cleared.");
                    return;
                  }
                  setDraftMessage("Draft cleared.");
                }}
              >
                Clear draft
              </button>
            ) : null}
            <button
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white"
              type="submit"
            >
              Post listing
            </button>
          </div>
          {draftMessage ? (
            <p className="text-right text-sm font-semibold text-emerald-700">{draftMessage}</p>
          ) : null}
          {submitError ? (
            <p className="text-right text-sm font-semibold text-rose-700">{submitError}</p>
          ) : null}
        </div>
      </form>
    </ModalShell>
  );
}
