import {
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
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
  id: "",
  name: "",
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

function normalizePostalInput(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
}

function getPreferredListingGame(user) {
  return user?.defaultListingGame || user?.favoriteGames?.[0] || initialFormState.game;
}

export default function CreateListingModal({ onClose }) {
  const navigate = useNavigate();
  const {
    addListing,
    clearListingDraft,
    createListingPreset,
    currentUser,
    listingDraft,
    recordSearchQuery,
    saveListingDraft,
    searchHistory,
  } = useMarketplace();
  const [form, setForm] = useState(() => ({
    ...initialFormState,
    game: getPreferredListingGame(currentUser),
    neighborhood: currentUser?.neighborhood || initialFormState.neighborhood,
    postalCode: normalizePostalInput(currentUser?.postalCode || ""),
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
  const [pendingSearchSubmit, setPendingSearchSubmit] = useState(false);
  const searchRequestIdRef = useRef(0);
  const hydratedDraftKeyRef = useRef("");

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
    if (createListingPreset) {
      return;
    }

    if (!listingDraft) {
      hydratedDraftKeyRef.current = "";
      return;
    }

    const draftKey = `${listingDraft.id}:${listingDraft.updatedAt || ""}`;
    if (hydratedDraftKeyRef.current === draftKey) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      ...listingDraft,
      neighborhood:
        listingDraft.neighborhood || currentUser?.neighborhood || currentForm.neighborhood,
      postalCode: normalizePostalInput(
        listingDraft.postalCode || currentUser?.postalCode || "",
      ),
    }));
    setConditionPreviewImages(listingDraft.conditionImages || []);
    setSearchQuery(listingDraft.searchQuery || "");
    setSelectedPrintingId("");
    setSearchResults([]);
    setPendingSearchSubmit(false);
    setDraftMessage("Draft restored.");
    hydratedDraftKeyRef.current = draftKey;
  }, [createListingPreset, currentUser?.neighborhood, currentUser?.postalCode, listingDraft]);

  useEffect(() => {
    if (!createListingPreset) {
      return;
    }

    hydratedDraftKeyRef.current = "preset";
    setForm(() => ({
      ...initialFormState,
      ...createListingPreset,
      id: "",
      name: "",
      game: createListingPreset?.game || getPreferredListingGame(currentUser),
      neighborhood: currentUser?.neighborhood || initialFormState.neighborhood,
      postalCode: normalizePostalInput(currentUser?.postalCode || ""),
    }));
    setConditionPreviewImages([]);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPrintingId("");
    setPendingSearchSubmit(false);
    setDraftMessage("");
    setSearchError("");
  }, [createListingPreset, currentUser?.neighborhood, currentUser?.postalCode]);

  function updateField(field, value) {
    setDraftMessage("");
    setPendingSearchSubmit(false);
    setForm((currentForm) => ({
      ...currentForm,
      [field]: field === "postalCode" ? normalizePostalInput(value) : value,
    }));
  }

  async function handleSearch(event) {
    event?.preventDefault?.();
    const trimmedQuery = String(searchQuery || "").trim();
    if (!trimmedQuery || !liveSearchSupported) {
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setLoadingSearch(true);
    setSearchError("");
    setDraftMessage("");
    setPendingSearchSubmit(false);
    recordSearchQuery(trimmedQuery, { game: form.game, source: "create-listing" });

    try {
      const result = await searchCardPrintings({
        game: form.game,
        query: trimmedQuery,
      });

      if (searchRequestIdRef.current !== requestId) {
        return;
      }

      startTransition(() => {
        setSearchResults(result.results || []);
        setProviderLabel(result.providerLabel || "Live search");
        setSearchNote(
          result.note ||
            "Select a printing to autofill image, set details, and market value.",
        );
      });
    } catch (error) {
      if (searchRequestIdRef.current !== requestId) {
        return;
      }
      setSearchError(error.message);
      setSearchResults([]);
    } finally {
      if (searchRequestIdRef.current === requestId) {
        setLoadingSearch(false);
      }
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
    setPendingSearchSubmit(false);
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

  async function saveDraft(forceNew = false) {
    setSubmitError("");
    const result = await saveListingDraft({
      ...form,
      id: forceNew ? "" : form.id,
      name: form.name || form.title || `${form.game} draft`,
      searchQuery,
    });

    if (!result?.ok) {
      setDraftMessage("");
      setSubmitError(result?.error || "Draft could not be saved.");
      return;
    }

    if (result.draft?.id) {
      setForm((currentForm) => ({
        ...currentForm,
        id: result.draft.id,
        name: result.draft.name,
      }));
    }
    setDraftMessage(forceNew ? "New draft saved." : "Draft saved.");
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
      subtitle="Build the listing first, then pull in the exact printing and market data when you need it."
      title="Create Listing"
      wide
      onClose={onClose}
    >
      <form
        className="grid gap-0 bg-[linear-gradient(180deg,#fbf8f1_0%,#f5f1e8_100%)] 2xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]"
        onKeyDownCapture={(event) => {
          if (
            event.key === "Enter" &&
            pendingSearchSubmit &&
            !loadingSearch &&
            event.target.tagName !== "TEXTAREA"
          ) {
            event.preventDefault();
            void handleSearch(event);
          }
        }}
        onSubmit={handleSubmit}
      >
        <div className="order-2 space-y-4 border-b border-slate-200 p-4 sm:space-y-5 sm:p-6 lg:p-7 2xl:order-1 2xl:border-b-0 2xl:border-r">
          <section className="surface-card p-5 sm:p-6">
            <p className="section-kicker">Listing basics</p>
            <h3 className="mt-3 font-display text-[1.6rem] font-semibold tracking-[-0.04em] text-ink sm:text-[2rem]">
              Card details
            </h3>
            <p className="mt-2 hidden text-sm leading-7 text-steel sm:block">
              Fill in the local listing details first. Then search the live database on the
              right to pull in the exact printing and current market context.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <FieldLabel>Listing title</FieldLabel>
                <input
                  required
                  className="w-full rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="Card title or bundle name"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                />
              </label>

              <label className="block">
                <FieldLabel>Game</FieldLabel>
                <select
                  className="w-full rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
                  className="w-full rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
                  className="w-full rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
                  className="w-full rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
                  className="w-full rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={form.price}
                  onChange={(event) => updateField("price", event.target.value)}
                />
              </label>

              <label className="block">
                <FieldLabel>Quantity</FieldLabel>
                <input
                  min="1"
                  step="1"
                  type="number"
                  className="w-full rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={form.quantity}
                  onChange={(event) => updateField("quantity", Math.max(1, Number(event.target.value) || 1))}
                />
              </label>

              <label className="block md:col-span-2">
                <FieldLabel>Neighborhood</FieldLabel>
                <select
                  className="w-full rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={form.neighborhood}
                  onChange={(event) => updateField("neighborhood", event.target.value)}
                >
                  {neighborhoods.slice(1).map((neighborhood) => (
                    <option key={neighborhood}>{neighborhood}</option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <FieldLabel>Postal code area</FieldLabel>
                <input
                  maxLength={3}
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="Optional FSA, like R2P"
                  value={form.postalCode}
                  onChange={(event) => updateField("postalCode", event.target.value)}
                />
              </label>

              {form.listingFormat !== "single" ? (
                <label className="block md:col-span-2">
                  <FieldLabel>Bundle contents</FieldLabel>
                  <textarea
                  className="min-h-24 w-full rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                    placeholder="One item or note per line. Example: 4x Charizard ex&#10;Sleeved deck core&#10;Matching tokens"
                    value={form.bundleItems}
                    onChange={(event) => updateField("bundleItems", event.target.value)}
                  />
                </label>
              ) : null}

              <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3.5 md:col-span-2">
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

          <section className="surface-card p-5 sm:p-6">
            <p className="section-kicker">Photos and notes</p>
            <div className="mt-4 space-y-4">
              <label className="block">
                <FieldLabel>Description</FieldLabel>
                <textarea
                  required
                  className="min-h-32 w-full rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="Call out set, rarity, defects, meetup range, and trade interests."
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                />
              </label>

              <div className="block">
                <FieldLabel>Primary card image</FieldLabel>
                <label className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-dashed border-slate-300 bg-[#f8f5ee] px-4 py-4 text-steel transition hover:border-navy hover:text-ink">
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
                <label className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-dashed border-slate-300 bg-[#f8f5ee] px-4 py-4 text-steel transition hover:border-navy hover:text-ink">
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

        <div className="order-1 space-y-4 bg-[linear-gradient(180deg,#f7f3eb_0%,#efe8dd_100%)] p-4 sm:space-y-5 sm:p-6 lg:p-7 2xl:order-2">
          <section className="surface-card border-slate-200 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="section-kicker">Live print search</p>
                <h3 className="mt-3 font-display text-[1.6rem] font-semibold tracking-[-0.04em] text-ink sm:text-[2rem]">
                  Find the exact printing
                </h3>
                <p className="mt-3 hidden max-w-3xl text-sm leading-7 text-steel sm:block">
                  Search live printings for Pokemon, Magic, and One Piece. The search is
                  intentionally broad so product codes, variant terms, and partial names can
                  still surface the right printings.
                </p>
              </div>
                {selectedPrintingId ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  <CheckCircle2 size={14} />
                  Printing selected
                </span>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex items-center gap-2 rounded-[20px] border border-slate-200 bg-[#f8f5ee] p-2.5">
                <Search className="ml-2 text-steel" size={16} />
                <input
                  className="flex-1 border-0 bg-transparent px-1 py-2 text-sm text-ink outline-none placeholder:text-slate-400"
                  placeholder="Type a card name, code, or variant"
                  value={searchQuery}
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    setSearchQuery(nextQuery);
                    setPendingSearchSubmit(Boolean(String(nextQuery || "").trim()));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleSearch(event);
                    }
                  }}
                />
              </div>
              <button
                className="rounded-full bg-orange px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!searchQuery.trim() || !liveSearchSupported || loadingSearch}
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

            <div className="mt-4 rounded-[20px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 text-sm text-steel">
              <span className="font-semibold text-ink">{providerLabel}</span>
              <span className="mx-2 text-slate-300">|</span>
              {liveSearchSupported
                ? searchError || searchNote
                : "Live search is available only for Magic, Pokemon, and One Piece."}
            </div>

            {recentQueries.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {recentQueries.map((entry) => (
                  <button
                    key={entry.id}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-steel transition hover:border-slate-300 hover:text-ink"
                    type="button"
                    onClick={() => {
                      setSearchQuery(entry.query);
                      setPendingSearchSubmit(Boolean(String(entry.query || "").trim()));
                    }}
                  >
                    {entry.query}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)]">
            <section className="surface-card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-steel">Listing summary</p>
                  <p className="mt-1 hidden text-sm text-steel sm:block">
                    A lighter preview of what buyers will care about most.
                  </p>
                </div>
                {form.marketPrice ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    <Sparkles size={13} />
                    Market synced
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[120px_minmax(0,1fr)_220px]">
                <div className="hidden items-start justify-center lg:flex lg:justify-start">
                  {form.imageUrl ? (
                    <CardArtwork
                      className="aspect-[63/88] w-full max-w-[120px] rounded-[20px] object-cover"
                      game={form.game}
                      src={form.imageUrl}
                      title={form.title || "Selected card"}
                    />
                  ) : (
                    <div className="flex aspect-[63/88] w-full max-w-[120px] items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-[#f8f5ee] px-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-steel">
                      No image yet
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-display text-[1.8rem] font-semibold tracking-[-0.04em] text-ink sm:text-3xl">
                  {form.title || "Untitled listing"}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {form.game}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {form.type}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {form.condition}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                      Qty {form.quantity}x
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-steel">
                    {form.description
                      ? `${form.description.slice(0, 180)}${form.description.length > 180 ? "..." : ""}`
                      : "Search a printing or upload an image to make this listing feel complete."}
                  </p>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-[#f8f5ee] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                      Price context
                    </p>
                    <span className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                      {form.price ? formatCurrency(form.price, "CAD") : "$0"}
                    </span>
                  </div>
                  {form.marketPrice ? (
                    <p className="mt-2 text-sm font-semibold text-emerald-700">
                      Market {formatCurrency(form.marketPrice, form.marketPriceCurrency)}
                    </p>
                  ) : null}
                  <Sparkline className="mt-3 hidden w-full sm:block" points={comparisonSparkPoints} />
                </div>
              </div>
            </section>

            <section className="surface-card p-4 sm:p-5">
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

              <div className="grid max-h-[45dvh] gap-4 overflow-y-auto pr-1 sm:max-h-[34rem]">
                {searchResults.map((printing) => (
                  <button
                    key={printing.id}
                    className={`grid gap-0 overflow-hidden rounded-[24px] border bg-white text-left transition lg:grid-cols-[160px_minmax(0,1fr)] ${
                      selectedPrintingId === printing.id
                        ? "border-navy shadow-soft ring-2 ring-navy/10"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-soft"
                    }`}
                    type="button"
                    onClick={() => applyPrinting(printing)}
                  >
                      <div className="flex items-center justify-center bg-[linear-gradient(180deg,#faf7f0_0%,#f3efe7_100%)] p-3">
                        <CardArtwork
                        className="aspect-[63/88] w-full max-w-[7.2rem] rounded-[18px] object-cover sm:max-w-[8.5rem]"
                        game={form.game}
                        src={printing.imageUrl}
                        title={printing.title}
                      />
                    </div>

                    <div className="flex min-w-0 flex-col justify-between gap-4 p-4">
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
                          <h4 className="font-display text-xl font-semibold tracking-[-0.03em] text-ink">
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
                          <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
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
                <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-[#f8f5ee] px-5 py-12 text-center text-sm leading-7 text-steel">
                  Search a card name, code, or variant above to load live printings here.
                </div>
              ) : null}
            </section>
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-slate-200 bg-[#efe8dd] px-4 pb-4 pt-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 md:flex-row md:flex-wrap md:justify-end">
            <button
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
              type="button"
              onClick={() => void saveDraft(false)}
            >
              Save draft
            </button>
            <button
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
              type="button"
              onClick={() => void saveDraft(true)}
            >
              Save as new draft
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
          <div className="space-y-2">
            {draftMessage ? (
              <p className="text-sm font-semibold text-emerald-700 md:text-right">{draftMessage}</p>
            ) : null}
            {submitError ? (
              <p className="text-sm font-semibold text-rose-700 md:text-right">{submitError}</p>
            ) : null}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
