import {
  Camera,
  Check,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import { approvedMeetupSpots } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";
import { retryStorageUpload } from "../lib/mediaUploads";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { m } from "../mobile/design";
import {
  BottomActionBar,
  ChoicePill,
  DetailHeader,
  EmptyBlock,
  PrimaryButton,
  ScreenSection,
  SecondaryButton,
  TextArea,
  TextField,
} from "../mobile/primitives";
import { searchCardPrintings } from "../services/cardDatabase";

const STEPS = ["Card", "Photos", "Details", "Meetup", "Review"];
const CONDITIONS = ["Mint", "NM", "LP", "MP", "HP"];
const MAX_PHOTOS = 6;
const MAX_LOCAL_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1800;
const LISTING_TYPES = [
  { id: "WTB", label: "Want To Buy" },
  { id: "WTS", label: "For Sale" },
  { id: "WTT", label: "For Trade" },
  { id: "WTS/WTT", label: "Sale + Trade" },
];
const MEDIA_BUCKET = "listing-media";

function dedupeUrls(urls) {
  return urls.filter(Boolean).filter((value, index, array) => array.indexOf(value) === index);
}

function buildListingGallery(selectedPrinting, uploadedPhotos, includeSelectedPrintingImage = true) {
  const selectedImage = includeSelectedPrintingImage ? selectedPrinting?.imageUrl || "" : "";
  const mergedGallery = dedupeUrls([selectedImage, ...uploadedPhotos]);
  return {
    primaryImage: selectedImage || uploadedPhotos[0] || "",
    imageUrl: selectedImage || uploadedPhotos[0] || "",
    imageGallery: mergedGallery,
    conditionImages: uploadedPhotos,
    photoUrls: uploadedPhotos,
  };
}

async function compressLargeImage(file) {
  if (!file?.type?.startsWith("image/") || file.size <= MAX_LOCAL_IMAGE_BYTES || typeof document === "undefined") {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Image could not be processed."));
      nextImage.src = objectUrl;
    });
    const longestEdge = Math.max(image.width, image.height) || 1;
    const scale = Math.min(1, MAX_IMAGE_EDGE / longestEdge);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob), "image/jpeg", 0.86);
    });
    if (!blob) {
      return file;
    }
    const nextName = file.name.replace(/\.[^.]+$/, "") || "listing-photo";
    return new File([blob], `${nextName}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function StepRail({ step }) {
  return (
    <div className="flex items-center gap-1 px-4 pb-2">
      {STEPS.map((label, index) => (
        <div key={label} className="flex-1">
          <div className="h-[3px] overflow-hidden rounded-full" style={{ background: m.surfaceStrong }}>
            <motion.div
              animate={{ width: index <= step ? "100%" : "0%" }}
              className="h-full rounded-full"
              style={{ background: index < step ? m.red : "#f87171" }}
              transition={{ duration: 0.22 }}
            />
          </div>
          <p
            className="mt-1 text-center text-[8px]"
            style={{ color: index <= step ? m.textSecondary : m.textMuted, fontWeight: index <= step ? 700 : 500 }}
          >
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

function UploadTile({ onSelect }) {
  return (
    <motion.button
      className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-[16px] border border-dashed"
      style={{ background: m.surfaceStrong, borderColor: m.borderStrong, color: m.textSecondary }}
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
    >
      <ImagePlus size={18} />
      <span className="text-[10px]" style={{ fontWeight: 600 }}>
        Add Photo
      </span>
    </motion.button>
  );
}

function buildInitialDraft(draft, currentUser, fallbackGame, preset = null) {
  const presetType = preset?.type || preset?.presetType || null;
  const normalizeArea = (value) =>
    approvedMeetupSpots.find((spot) => spot.id === value || spot.label === value)?.label || value;
  const draftMeetupAreas = Array.isArray(draft?.meetupAreas) ? draft.meetupAreas.map(normalizeArea).filter(Boolean) : [];
  const trustedMeetupAreas = Array.isArray(currentUser?.trustedMeetupSpots)
    ? currentUser.trustedMeetupSpots.map(normalizeArea).filter(Boolean)
    : [];
  return {
    draftId: draft?.id || "",
    manualEntry: Boolean(draft?.manualEntry),
    query: draft?.query || "",
    game: draft?.game || preset?.game || fallbackGame,
    title: draft?.title || "",
    price: draft?.price ? String(draft.price) : "",
    condition: draft?.condition || "NM",
    quantity: String(draft?.quantity || 1),
    description: draft?.description || "",
    listingType: draft?.type || presetType || "WTS",
    acceptTrades: Boolean(draft?.acceptsTrade),
    shipping: false,
    neighborhood: draft?.neighborhood || currentUser?.neighborhood || "Winnipeg",
    postalCode: draft?.postalCode || currentUser?.postalCode || "",
    meetupAreas: draftMeetupAreas.length
      ? draftMeetupAreas
      : trustedMeetupAreas.length
        ? trustedMeetupAreas
        : ["Downtown"],
    selectedPrinting: draft?.selectedPrinting || null,
    includeSelectedPrintingImage: draft?.includeSelectedPrintingImage !== false,
  };
}

function serializeDraft(state) {
  return {
    id: state.draftId || undefined,
    manualEntry: Boolean(state.manualEntry),
    query: state.query,
    game: state.game,
    title: state.title,
    price: state.price ? Number(state.price) : 0,
    condition: state.condition,
    quantity: Number(state.quantity) || 1,
    description: state.description,
    type: state.listingType,
    acceptsTrade: state.acceptTrades,
    shippingAvailable: false,
    neighborhood: state.neighborhood,
    postalCode: state.postalCode,
    meetupAreas: state.meetupAreas,
    selectedPrinting: state.selectedPrinting,
    includeSelectedPrintingImage: state.includeSelectedPrintingImage !== false,
    updatedAt: new Date().toISOString(),
  };
}

async function uploadListingPhotos(userId, photos) {
  if (!photos.length || !isSupabaseConfigured || !supabase) {
    return photos.map((photo) => photo.storedUrl || photo.previewUrl).filter(Boolean);
  }

  const uploads = [];

  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    if (!photo.file) {
      if (photo.storedUrl || photo.previewUrl) {
        uploads.push(photo.storedUrl || photo.previewUrl);
      }
      continue;
    }
    const extension = String(photo.file?.name || "jpg").split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `listing/${userId}/${Date.now()}-${index + 1}.${extension}`;
    const uploadResult = await retryStorageUpload(() =>
      supabase.storage.from(MEDIA_BUCKET).upload(filePath, photo.file, {
        cacheControl: "3600",
        upsert: true,
        contentType: photo.file?.type || undefined,
      }).then(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data;
      }),
    );
    const { data: publicData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(uploadResult.path);
    uploads.push(publicData.publicUrl);
  }

  return uploads;
}

export default function CreateListingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeListings,
    addListing,
    createListingPreset,
    currentUser,
    gameCatalog,
    listingDraft,
    saveListingDraft,
  } = useMarketplace();

  const fallbackGame = gameCatalog?.find((game) => game.slug === "pokemon")?.name || gameCatalog?.[0]?.name || "Pokemon";
  const routePreset = location.state || null;
  const activePreset = createListingPreset || routePreset;
  const [step, setStep] = useState(0);
  const [state, setState] = useState(() => buildInitialDraft(listingDraft, currentUser, fallbackGame, activePreset));
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [photos, setPhotos] = useState([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [successTitle, setSuccessTitle] = useState("");
  const syncedStateKeyRef = useRef("");
  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    const presetKey = activePreset?.id || activePreset?.title || activePreset?.game || "";
    const nextSyncKey = [currentUser?.id || "", listingDraft?.id || "", presetKey, fallbackGame].join("|");
    if (nextSyncKey === syncedStateKeyRef.current) {
      return;
    }
    setState(buildInitialDraft(listingDraft, currentUser, fallbackGame, activePreset));
    setPhotos(
      Array.isArray(listingDraft?.photoUrls)
        ? listingDraft.photoUrls.slice(0, 6).map((url, index) => ({
            id: `draft-photo-${index}-${String(url).slice(-12)}`,
            file: null,
            previewUrl: url,
            storedUrl: url,
          }))
        : [],
    );
    syncedStateKeyRef.current = nextSyncKey;
  }, [activePreset?.game, activePreset?.id, activePreset?.title, currentUser?.id, fallbackGame, listingDraft?.id]);

  useEffect(() => {
    const normalizedQuery = state.query.trim();
    if (normalizedQuery.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setSearching(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setSearching(true);
        setSearchError("");
        const result = await searchCardPrintings({
          game: state.game,
          query: normalizedQuery,
          limit: 12,
        });
        setSearchResults(Array.isArray(result?.results) ? result.results : []);
      } catch (nextError) {
        setSearchError(nextError.message || "Card search failed.");
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => window.clearTimeout(timeoutId);
  }, [state.game, state.query]);

  useEffect(() => () => {
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
  }, [photos]);

  const popularCards = useMemo(
    () =>
      [...activeListings]
        .filter((listing) => listing.game === state.game)
        .sort((left, right) => Number(right.views || 0) - Number(left.views || 0))
        .slice(0, 4)
        .map((listing) => ({
          id: `listing-seed-${listing.id}`,
          title: listing.title,
          setName: listing.setName || listing.set || listing.game,
          imageUrl: listing.primaryImage || listing.imageUrl,
          marketPrice: listing.marketPriceCad || listing.priceCad || listing.price || 0,
          marketPriceCurrency: "CAD",
          language: listing.language || "English",
          description: listing.description || "",
          game: listing.game,
        })),
    [activeListings, state.game],
  );

  const meetupOptions = useMemo(() => {
    const labels = approvedMeetupSpots.map((spot) => spot.label).filter(Boolean);
    const neighborhood = currentUser?.neighborhood ? [currentUser.neighborhood] : [];
    return [...new Set([...neighborhood, ...labels])].slice(0, 10);
  }, [currentUser?.neighborhood]);

  const canContinue = useMemo(() => {
    if (step === 0) {
      return Boolean(state.selectedPrinting) || Boolean(state.manualEntry);
    }
    if (step === 1) {
      return photos.length > 0;
    }
    if (step === 2) {
      return Boolean(state.title.trim()) && Boolean(Number(state.price));
    }
    if (step === 3) {
      return Boolean(state.meetupAreas.length);
    }
    return true;
  }, [photos.length, state, step]);

  function updateField(field, value) {
    setState((current) => ({ ...current, [field]: value }));
  }

  function selectPrinting(printing) {
    setState((current) => ({
      ...current,
      manualEntry: false,
      title: printing.title || current.title,
      game: printing.game || current.game,
      selectedPrinting: printing,
      includeSelectedPrintingImage: true,
      query: printing.title || current.query,
      description: current.description || printing.description || "",
      price: current.price || (printing.marketPrice ? String(Math.round(printing.marketPrice)) : ""),
    }));
  }

  function enableManualEntry() {
    setState((current) => ({
      ...current,
      manualEntry: true,
      selectedPrinting: null,
      includeSelectedPrintingImage: false,
      title: current.title || current.query || "",
    }));
  }

  function disableManualEntry() {
    setState((current) => ({
      ...current,
      manualEntry: false,
    }));
  }

  function toggleMeetupArea(area) {
    setState((current) => ({
      ...current,
      meetupAreas: current.meetupAreas.includes(area)
        ? current.meetupAreas.filter((item) => item !== area)
        : [...current.meetupAreas, area].slice(0, 4),
    }));
  }

  async function onPhotoInput(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) {
      return;
    }

    const remainingSlots = Math.max(0, MAX_PHOTOS - photos.length);
    if (!remainingSlots) {
      setError(`You can add up to ${MAX_PHOTOS} photos per listing.`);
      return;
    }

    const nextFiles = await Promise.all(files.slice(0, remainingSlots).map((file) => compressLargeImage(file)));
    setPhotos((current) => [
      ...current,
      ...nextFiles.map((file, index) => ({
        id: `photo-${Date.now()}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);

    if (files.length > remainingSlots) {
      setError(`Only the first ${MAX_PHOTOS} photos were kept for this listing.`);
    } else {
      setError("");
    }
  }

  function removePhoto(photoId) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === photoId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((photo) => photo.id !== photoId);
    });
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    setError("");
    try {
      const uploadedPhotos = currentUser?.id ? await uploadListingPhotos(currentUser.id, photos) : [];
      const galleryPayload = buildListingGallery(
        state.selectedPrinting,
        uploadedPhotos,
        state.includeSelectedPrintingImage !== false,
      );
      const result = await saveListingDraft({
        ...serializeDraft(state),
        ...galleryPayload,
      });
      setSavingDraft(false);
      if (!result?.ok) {
        setError(result?.error || "Draft could not be saved.");
        return;
      }
      setPhotos((current) =>
        current.map((photo, index) => ({
          ...photo,
          storedUrl: uploadedPhotos[index] || photo.storedUrl || photo.previewUrl,
          previewUrl: uploadedPhotos[index] || photo.previewUrl,
        })),
      );
      setState((current) => ({ ...current, draftId: result.draft?.id || current.draftId }));
      navigate("/dashboard#drafts");
    } catch (nextError) {
      setSavingDraft(false);
      setError(nextError.message || "Draft could not be saved.");
    }
  }

  async function handlePublish() {
    if (!currentUser?.id || publishing) {
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const uploadedPhotos = await uploadListingPhotos(currentUser.id, photos);
      const galleryPayload = buildListingGallery(
        state.selectedPrinting,
        uploadedPhotos,
        state.includeSelectedPrintingImage !== false,
      );
      const payload = {
        id: state.draftId || undefined,
        manualEntry: Boolean(state.manualEntry),
        title: state.title.trim(),
        type: state.listingType,
        game: state.selectedPrinting?.game || state.game,
        listingFormat: "single",
        bundleItems: [],
        acceptsTrade: state.acceptTrades || state.listingType !== "WTS",
        condition: state.condition,
        language: state.selectedPrinting?.language || "English",
        quantity: Number(state.quantity) || 1,
        price: Number(state.price) || 0,
        neighborhood: state.neighborhood,
        postalCode: state.postalCode,
        description: state.description.trim(),
        ...galleryPayload,
        marketPrice: state.selectedPrinting?.marketPrice || 0,
        marketPriceCurrency: state.selectedPrinting?.marketPriceCurrency || "CAD",
      };
      const result = await addListing(payload);
      if (!result?.ok) {
        setError(result?.error || "Listing could not be published.");
        setPublishing(false);
        return;
      }
      setSuccessTitle(payload.title);
      window.setTimeout(() => {
        navigate(result.listing?.id ? `/listing/${result.listing.id}` : "/account/dashboard");
      }, 1200);
    } catch (nextError) {
      setError(nextError.message || "Listing could not be published.");
      setPublishing(false);
    }
  }

  if (successTitle) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-8" style={{ background: m.bg }}>
        <SeoHead canonicalPath="/sell" description="Create a listing on TCG WPG." title="Listing Published" />
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.18)" }}
        >
          <CheckCircle2 size={26} style={{ color: "#6ee7b7" }} />
        </div>
        <p className="text-center text-[18px] text-white" style={{ fontWeight: 700 }}>
          Listing Published
        </p>
        <p className="mt-2 text-center text-[12px]" style={{ color: m.textSecondary }}>
          {successTitle} is now live in the market.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: m.bg }}>
      <SeoHead canonicalPath="/sell" description="Create and publish a new listing on TCG WPG." title="Create Listing" />
      <DetailHeader
        onBack={() => (step > 0 ? setStep((current) => current - 1) : navigate(-1))}
        right={
          <SecondaryButton className="h-9 px-3 text-[10px]" disabled={savingDraft} onClick={() => void handleSaveDraft()}>
            {savingDraft ? <LoaderCircle className="animate-spin" size={12} /> : null}
            Save Draft
          </SecondaryButton>
        }
        subtitle={`Step ${step + 1} of ${STEPS.length}`}
        title="Create Listing"
      />
      <StepRail step={step} />

      {step === 0 ? (
        <>
          <ScreenSection className="pt-2">
            <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {gameCatalog.slice(0, 5).map((game) => (
                <ChoicePill
                  key={game.slug}
                  active={state.game === game.name}
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      game: game.name,
                      manualEntry:
                        current.manualEntry && current.game !== game.name ? true : current.manualEntry,
                      selectedPrinting: current.selectedPrinting?.game === game.name ? current.selectedPrinting : null,
                    }))
                  }
                >
                  {game.shortName || game.name}
                </ChoicePill>
              ))}
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: m.textMuted }} />
              <input
                className="h-[42px] w-full rounded-[14px] border pl-9 pr-3 text-[12.5px] outline-none"
                style={{ background: m.surfaceStrong, borderColor: m.border, color: m.text }}
                placeholder="Search card, set, or printing..."
                value={state.query}
                onChange={(event) => updateField("query", event.target.value)}
              />
            </div>
          </ScreenSection>

          <ScreenSection className="pt-4">
            <div className="mb-3 rounded-[18px] border p-3" style={{ background: m.surface, borderColor: m.border }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                    Can’t find your card?
                  </p>
                  <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                    Switch to manual mode and create the listing yourself. You can set the title, price, details, and
                    photos in the next steps.
                  </p>
                </div>
                {state.manualEntry ? (
                  <SecondaryButton className="shrink-0 px-3 py-2 text-[10px]" onClick={disableManualEntry}>
                    Use search
                  </SecondaryButton>
                ) : (
                  <PrimaryButton className="shrink-0 px-3 py-2 text-[10px]" onClick={enableManualEntry}>
                    Manual listing
                  </PrimaryButton>
                )}
              </div>
            </div>
            {state.selectedPrinting ? (
              <div className="rounded-[18px] border p-3" style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.12)" }}>
                <div className="flex gap-3">
                  <img alt={state.selectedPrinting.title} className="h-20 w-16 rounded-[12px] object-cover" src={state.selectedPrinting.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] text-white" style={{ fontWeight: 700 }}>
                          {state.selectedPrinting.title}
                        </p>
                        <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                          {state.selectedPrinting.setName}
                        </p>
                      </div>
                      <button
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ background: m.surfaceStrong }}
                        type="button"
                        onClick={() => updateField("selectedPrinting", null)}
                      >
                        <X size={11} style={{ color: m.textSecondary }} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-full px-2 py-[3px] text-[9px]" style={{ background: m.surfaceStrong, color: m.textSecondary, fontWeight: 700 }}>
                        {state.selectedPrinting.game}
                      </span>
                      {state.selectedPrinting.marketPrice ? (
                        <span className="text-[10px]" style={{ color: m.textSecondary }}>
                          Avg ${Math.round(Number(state.selectedPrinting.marketPrice))}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        className="rounded-full px-2.5 py-[5px] text-[9px]"
                        style={{
                          background: state.includeSelectedPrintingImage !== false ? "rgba(239,68,68,0.12)" : m.surfaceStrong,
                          border: `1px solid ${state.includeSelectedPrintingImage !== false ? "rgba(239,68,68,0.18)" : m.border}`,
                          color: state.includeSelectedPrintingImage !== false ? "#fca5a5" : m.textSecondary,
                          fontWeight: 700,
                        }}
                        type="button"
                        onClick={() =>
                          setState((current) => ({
                            ...current,
                            includeSelectedPrintingImage: !current.includeSelectedPrintingImage,
                          }))
                        }
                      >
                        {state.includeSelectedPrintingImage !== false ? "Using card art" : "Card art removed"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : state.manualEntry ? (
              <div className="rounded-[18px] border p-3" style={{ background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.14)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] text-white" style={{ fontWeight: 700 }}>
                      Manual listing active
                    </p>
                    <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                      {state.game} card not in the database? Continue and enter the details manually.
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-[3px] text-[9px]"
                    style={{ background: m.surfaceStrong, color: m.textSecondary, fontWeight: 700 }}
                  >
                    {state.game}
                  </span>
                </div>
              </div>
            ) : null}
          </ScreenSection>

          <ScreenSection className="pt-4">
            <p className="mb-2 text-[10px] uppercase" style={{ color: m.textTertiary, fontWeight: 700, letterSpacing: "0.08em" }}>
              {state.query.trim().length >= 2 ? "Results" : "Popular now"}
            </p>
            <div className="flex max-h-[min(52vh,24rem)] flex-col gap-2 overflow-y-auto pr-1">
              {searching ? (
                <div className="flex h-24 items-center justify-center rounded-[18px]" style={{ background: m.surfaceStrong }}>
                  <LoaderCircle className="animate-spin" size={16} style={{ color: m.textSecondary }} />
                </div>
              ) : null}
              {!searching && searchError ? <EmptyBlock description={searchError} title="Search unavailable" /> : null}
              {!searching && !searchError && state.query.trim().length >= 2 && !searchResults.length ? (
                <EmptyBlock
                  title="No matching cards"
                  description="Switch to manual listing if your card is not in the database yet."
                />
              ) : null}
              {!searching &&
                !(searchError || "").length &&
                (state.query.trim().length >= 2 ? searchResults : popularCards).map((item) => (
                  <motion.button
                    key={item.id}
                    className="flex items-center gap-3 rounded-[16px] border p-2.5 text-left"
                    style={{ background: m.surface, borderColor: m.border }}
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    onClick={() => selectPrinting(item)}
                  >
                    <img alt={item.title} className="h-14 w-12 rounded-[10px] object-cover" src={item.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] text-white" style={{ fontWeight: 700 }}>
                        {item.title}
                      </p>
                      <p className="mt-1 truncate text-[10px]" style={{ color: m.textSecondary }}>
                        {item.setName}
                      </p>
                    </div>
                    {item.marketPrice ? (
                      <span className="text-[11px] text-white" style={{ fontWeight: 700 }}>
                        ${Math.round(Number(item.marketPrice))}
                      </span>
                    ) : null}
                  </motion.button>
                ))}
            </div>
          </ScreenSection>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <ScreenSection className="pt-2">
            <p className="text-[11px]" style={{ color: m.textSecondary }}>
              Add up to 6 photos. The first image becomes the listing cover.
            </p>
          </ScreenSection>
          <ScreenSection className="pt-4">
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div key={photo.id} className="relative overflow-hidden rounded-[16px]" style={{ border: index === 0 ? "1px solid rgba(239,68,68,0.16)" : `1px solid ${m.border}` }}>
                  <img alt={`Listing upload ${index + 1}`} className="aspect-[3/4] w-full object-cover" src={photo.previewUrl} />
                  <button
                    aria-label="Remove photo"
                    className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                  >
                    <X size={11} />
                  </button>
                  {index === 0 ? (
                    <span className="absolute bottom-1.5 left-1.5 rounded-full px-2 py-[3px] text-[8px] text-white" style={{ background: m.redGradient, fontWeight: 700 }}>
                      Cover
                    </span>
                  ) : null}
                </div>
              ))}
              {photos.length < 6 ? (
                <>
                  <input ref={uploadInputRef} accept="image/*" className="hidden" multiple type="file" onChange={onPhotoInput} />
                  <UploadTile onSelect={() => uploadInputRef.current?.click()} />
                </>
              ) : null}
            </div>
          </ScreenSection>
          <ScreenSection className="pt-4">
            <div className="grid grid-cols-2 gap-2">
              <>
                <input ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" type="file" onChange={onPhotoInput} />
                <SecondaryButton className="w-full" onClick={() => cameraInputRef.current?.click()}>
                  <Camera size={14} />
                  Camera
                </SecondaryButton>
              </>
              <>
                <input ref={galleryInputRef} accept="image/*" className="hidden" multiple type="file" onChange={onPhotoInput} />
                <SecondaryButton className="w-full" onClick={() => galleryInputRef.current?.click()}>
                  <ImagePlus size={14} />
                  Gallery
                </SecondaryButton>
              </>
            </div>
          </ScreenSection>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <ScreenSection className="pt-3">
            <p className="mb-2 text-[10px] uppercase" style={{ color: m.textTertiary, fontWeight: 700, letterSpacing: "0.08em" }}>
              Listing type
            </p>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {LISTING_TYPES.map((option) => (
                <ChoicePill key={option.id} active={state.listingType === option.id} onClick={() => updateField("listingType", option.id)}>
                  {option.label}
                </ChoicePill>
              ))}
            </div>
          </ScreenSection>
          <ScreenSection className="grid gap-3 pt-4">
            <div>
              <p className="mb-2 text-[10px] uppercase" style={{ color: m.textTertiary, fontWeight: 700, letterSpacing: "0.08em" }}>
                Title
              </p>
              <TextField placeholder="Card title" value={state.title} onChange={(value) => updateField("title", value)} />
            </div>
            <div className="grid grid-cols-[1.2fr_0.8fr] gap-2">
              <div>
                <p className="mb-2 text-[10px] uppercase" style={{ color: m.textTertiary, fontWeight: 700, letterSpacing: "0.08em" }}>
                  Price
                </p>
                <TextField inputMode="decimal" placeholder="0" prefix="$" value={state.price} onChange={(value) => updateField("price", value.replace(/[^0-9.]/g, ""))} />
              </div>
              <div>
                <p className="mb-2 text-[10px] uppercase" style={{ color: m.textTertiary, fontWeight: 700, letterSpacing: "0.08em" }}>
                  Qty
                </p>
                <TextField inputMode="numeric" placeholder="1" value={state.quantity} onChange={(value) => updateField("quantity", value.replace(/[^0-9]/g, ""))} />
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] uppercase" style={{ color: m.textTertiary, fontWeight: 700, letterSpacing: "0.08em" }}>
                Condition
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CONDITIONS.map((condition) => (
                  <ChoicePill key={condition} active={state.condition === condition} onClick={() => updateField("condition", condition)}>
                    {condition}
                  </ChoicePill>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] uppercase" style={{ color: m.textTertiary, fontWeight: 700, letterSpacing: "0.08em" }}>
                Description
              </p>
              <TextArea
                placeholder="Condition notes, whitening, centering, or print details..."
                rows={4}
                value={state.description}
                onChange={(value) => updateField("description", value)}
              />
            </div>
          </ScreenSection>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <ScreenSection className="grid gap-3 pt-3">
            <div>
              <p className="mb-2 text-[10px] uppercase" style={{ color: m.textTertiary, fontWeight: 700, letterSpacing: "0.08em" }}>
                Meetup areas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {meetupOptions.map((area) => (
                  <ChoicePill key={area} active={state.meetupAreas.includes(area)} onClick={() => toggleMeetupArea(area)}>
                    {area}
                  </ChoicePill>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="rounded-[16px] border p-3" style={{ background: m.surface, borderColor: m.border }}>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: "rgba(239,68,68,0.09)" }}>
                    <MapPin size={14} style={{ color: "#fca5a5" }} />
                  </div>
                  <div>
                    <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                      Local meetup
                    </p>
                    <p className="text-[10px]" style={{ color: m.textSecondary }}>
                      {state.neighborhood || "Winnipeg"}
                    </p>
                  </div>
                </div>
              </div>

              <button
                className="flex items-center justify-between rounded-[16px] border p-3 text-left"
                style={{ background: m.surface, borderColor: m.border }}
                type="button"
                onClick={() => updateField("acceptTrades", !state.acceptTrades)}
              >
                <div>
                  <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                    Open to trades
                  </p>
                  <p className="text-[10px]" style={{ color: m.textSecondary }}>
                    Buyers can send trade or cash+trade offers
                  </p>
                </div>
                <div className="flex h-[22px] w-[40px] items-center rounded-full px-[3px]" style={{ background: state.acceptTrades ? m.redGradient : "rgba(255,255,255,0.08)" }}>
                  <motion.div
                    animate={{ x: state.acceptTrades ? 16 : 0 }}
                    className="h-4 w-4 rounded-full"
                    style={{ background: state.acceptTrades ? "#fff" : "#4a4a52" }}
                    transition={{ type: "spring", damping: 18, stiffness: 280 }}
                  />
                </div>
              </button>
            </div>
          </ScreenSection>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <ScreenSection className="pt-3">
            <div className="overflow-hidden rounded-[20px] border" style={{ background: m.surface, borderColor: m.border }}>
              <div className="relative">
                {photos[0]?.previewUrl || (state.includeSelectedPrintingImage !== false ? state.selectedPrinting?.imageUrl : "") ? (
                  <img
                    alt={state.title || "Listing preview"}
                    className="aspect-[16/11] w-full object-cover"
                    src={photos[0]?.previewUrl || (state.includeSelectedPrintingImage !== false ? state.selectedPrinting?.imageUrl : "")}
                  />
                ) : (
                  <div
                    className="aspect-[16/11] w-full"
                    style={{
                      background:
                        "radial-gradient(circle at top left, rgba(120,24,24,0.24) 0%, rgba(24,18,22,0.92) 48%, rgba(12,12,14,1) 100%)",
                    }}
                  />
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 55%, rgba(12,12,14,0.72) 100%)" }} />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-[18px] text-white" style={{ fontWeight: 700 }}>
                    {state.title || "Untitled listing"}
                  </p>
                  <p className="mt-1 text-[11px]" style={{ color: m.textSecondary }}>
                    {state.selectedPrinting?.setName || state.game}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <ChoicePill active>{state.condition}</ChoicePill>
                    <ChoicePill active={false}>{state.listingType}</ChoicePill>
                    {state.acceptTrades ? <ChoicePill active={false}>Trades OK</ChoicePill> : null}
                  </div>
                  <span className="text-[18px] text-white" style={{ fontWeight: 700 }}>
                    ${state.price || "0"}
                  </span>
                </div>
                <p className="text-[11px] leading-6" style={{ color: m.textSecondary }}>
                  {state.description || "No additional condition notes added yet."}
                </p>
                <div className="grid gap-2 border-t pt-3" style={{ borderColor: m.border }}>
                  <div className="flex items-center gap-2 text-[10px]" style={{ color: m.textSecondary }}>
                    <MapPin size={11} />
                    {state.meetupAreas.join(", ") || state.neighborhood}
                  </div>
                  <div className="flex items-center gap-2 text-[10px]" style={{ color: m.textSecondary }}>
                    <Camera size={11} />
                    {photos.length} photo{photos.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </div>
          </ScreenSection>
          <ScreenSection className="pt-4">
            <div className="rounded-[18px] border p-3" style={{ background: m.surfaceStrong, borderColor: m.border }}>
              <p className="mb-2 text-[10px] uppercase" style={{ color: m.textTertiary, fontWeight: 700, letterSpacing: "0.08em" }}>
                Checklist
              </p>
              {[
                { ok: Boolean(state.selectedPrinting) || Boolean(state.manualEntry), label: state.manualEntry ? "Manual entry enabled" : "Card selected" },
                { ok: photos.length > 0, label: "Photos attached" },
                { ok: Boolean(state.title.trim()), label: "Title set" },
                { ok: Boolean(Number(state.price)), label: "Price set" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 py-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: item.ok ? "rgba(52,211,153,0.12)" : m.surface, border: `1px solid ${item.ok ? "rgba(52,211,153,0.18)" : m.border}` }}>
                    <Check size={10} style={{ color: item.ok ? "#6ee7b7" : m.textMuted }} />
                  </div>
                  <span className="text-[11px]" style={{ color: item.ok ? m.textSecondary : m.textTertiary, fontWeight: 500 }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </ScreenSection>
        </>
      ) : null}

      {error ? (
        <ScreenSection className="pt-4">
          <div className="rounded-[16px] border px-3 py-3 text-[11px]" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.12)", color: "#fca5a5", fontWeight: 600 }}>
            {error}
          </div>
        </ScreenSection>
      ) : null}

      <BottomActionBar>
        <div className="flex gap-2">
          {step === STEPS.length - 1 ? (
            <>
              <SecondaryButton className="flex-1" disabled={savingDraft || publishing} onClick={() => void handleSaveDraft()}>
                {savingDraft ? <LoaderCircle className="animate-spin" size={14} /> : null}
                Save Draft
              </SecondaryButton>
              <PrimaryButton className="flex-[1.4]" disabled={publishing} onClick={() => void handlePublish()}>
                {publishing ? <LoaderCircle className="animate-spin" size={14} /> : null}
                Publish
              </PrimaryButton>
            </>
          ) : (
            <PrimaryButton className="w-full" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>
              Continue
            </PrimaryButton>
          )}
        </div>
      </BottomActionBar>
    </div>
  );
}
