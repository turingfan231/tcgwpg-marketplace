import "dotenv/config";
import cors from "cors";
import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
const port = Number(process.env.PORT || 8787);
const supabaseAdmin =
  process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const API_VERSION = "v1.39.0";
const API_ROOT = `https://api.tcgplayer.com/${API_VERSION}`;
const TOKEN_ENDPOINT = "https://api.tcgplayer.com/token";
const TCGDEX_SEARCH_ENDPOINT = "https://api.tcgdex.net/v2/en/cards";
const TCGDEX_CARD_ENDPOINT = "https://api.tcgdex.net/v2/en/cards";
const OPTCG_ENDPOINT_CANDIDATES = {
  sets: [
    "https://www.optcgapi.com/api/sets/filtered/",
    "https://optcgapi.com/api/sets/filtered/",
  ],
  decks: [
    "https://www.optcgapi.com/api/decks/filtered/",
    "https://optcgapi.com/api/decks/filtered/",
  ],
  promos: [
    "https://www.optcgapi.com/api/promos/filtered/",
    "https://optcgapi.com/api/promos/filtered/",
  ],
};
const POKEMON_ENDPOINT = "https://api.pokemontcg.io/v2/cards";
const SCRYFALL_SEARCH_ENDPOINT = "https://api.scryfall.com/cards/search";
const SCRYFALL_NAMED_ENDPOINT = "https://api.scryfall.com/cards/named";
const PRICECHARTING_SEARCH_ENDPOINT =
  "https://www.pricecharting.com/search-products";
const BANK_OF_CANADA_ENDPOINT =
  "https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=5";
const FUSION_EVENTS_PAGE = "https://fusiongamingonline.com/pages/events";
const FUSION_BINDERPOS_ENDPOINT = "https://portal.binderpos.com/api/events/forStore";
const A_MUSE_EVENTS_ENDPOINT =
  "https://amusengames.ca/collections/events/products.json?limit=250";
const ARCTIC_HOME_PAGE = "https://www.arcticriftcards.ca/";
const ARCTIC_MAHINA_ENDPOINT = "https://mahina.app/app/5d7678.myshopify.com";
const ARCTIC_EVENTS_PAGE = ARCTIC_HOME_PAGE;
const GALAXY_EVENTS_PAGE = "https://www.galaxy-comics.ca/index.php/calendar/";
const GALAXY_FACEBOOK_EVENTS_PAGE = "https://www.facebook.com/galaxycomicscollectibles/events";
const SERVER_TIMEOUT_MS = 15000;
const FX_TIMEOUT_MS = 2500;

const CATEGORY_IDS = {
  magic: 1,
  pokemon: 3,
};

const SCRYFALL_HEADERS = {
  Accept: "application/json; charset=utf-8",
  "User-Agent": "TCGWPG/0.2 (local marketplace development)",
};
const ONE_PIECE_VARIANT_STOPWORDS = new Set([
  "sp",
  "alt",
  "alternate",
  "art",
  "gold",
  "foil",
  "wanted",
  "poster",
  "manga",
  "parallel",
]);
const MONTH_INDEX = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};
const WEEKDAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

let exchangeRateCache = {
  usdToCadRate: 1.38,
  asOf: null,
  fetchedAt: 0,
  source: "Fallback",
};

const tcgdexCardCache = new Map();

app.use(cors());
app.use(express.json());

function tcgplayerEnabled() {
  return Boolean(
    process.env.TCGPLAYER_PUBLIC_KEY && process.env.TCGPLAYER_PRIVATE_KEY,
  );
}

function normalizeGameName(game) {
  const rawValue = String(game || "").toLowerCase();

  if (rawValue.includes("pokemon")) {
    return "pokemon";
  }

  if (rawValue.includes("magic")) {
    return "magic";
  }

  if (rawValue.includes("one piece")) {
    return "one-piece";
  }

  return rawValue.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeLanguage(value) {
  const rawValue = String(value || "").toLowerCase().trim();
  return rawValue === "ja" || rawValue.includes("japanese") ? "japanese" : "english";
}

function getCategoryId(game) {
  return CATEGORY_IDS[String(game || "").toLowerCase()];
}

function getExtendedValue(product, fieldName) {
  const item = product.extendedData?.find(
    (entry) => entry.name?.toLowerCase() === fieldName.toLowerCase(),
  );
  return item?.value ?? null;
}

function parseNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toCad(value, usdToCadRate) {
  const numericValue = parseNumber(value);
  return numericValue ? Number((numericValue * usdToCadRate).toFixed(2)) : null;
}

function pickPokemonPrice(card) {
  const priceGroups = card.tcgplayer?.prices || {};
  const priority = [
    "holofoil",
    "reverseHolofoil",
    "normal",
    "1stEditionHolofoil",
    "1stEditionNormal",
  ];

  for (const key of priority) {
    const price = priceGroups[key];
    if (price?.market) {
      return {
        label: key,
        usdValue: parseNumber(price.market),
      };
    }
    if (price?.mid) {
      return {
        label: key,
        usdValue: parseNumber(price.mid),
      };
    }
  }

  return {
    label: "unknown",
    usdValue: null,
  };
}

function pickTcgdexPrice(card) {
  const tcgplayerPricing = card.pricing?.tcgplayer;
  if (!tcgplayerPricing || typeof tcgplayerPricing !== "object") {
    return {
      label: "unknown",
      usdValue: null,
    };
  }

  const priority = [
    "holofoil",
    "reverse-holofoil",
    "normal",
    "1st-edition-holofoil",
    "1st-edition-normal",
  ];

  for (const key of priority) {
    const price = tcgplayerPricing[key];
    if (price?.marketPrice) {
      return {
        label: key,
        usdValue: parseNumber(price.marketPrice),
      };
    }

    if (price?.midPrice) {
      return {
        label: key,
        usdValue: parseNumber(price.midPrice),
      };
    }
  }

  return {
    label: "unknown",
    usdValue: null,
  };
}

function buildPokemonHeaders() {
  const apiKey = process.env.VITE_POKEMONTCG_API_KEY || process.env.POKEMONTCG_API_KEY;
  return apiKey ? { "X-Api-Key": apiKey } : {};
}

function uniqueBy(items, keySelector) {
  const seen = new Set();
  const results = [];

  for (const item of items) {
    const key = keySelector(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    results.push(item);
  }

  return results;
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function rankSearchMatch(candidateParts, query) {
  const normalizedQuery = normalizeSearchText(query);
  const haystacks = candidateParts.map(normalizeSearchText).filter(Boolean);

  if (!normalizedQuery) {
    return 0;
  }

  if (haystacks.some((value) => value === normalizedQuery)) {
    return 100;
  }

  if (haystacks.some((value) => value.startsWith(normalizedQuery))) {
    return 80;
  }

  if (haystacks.some((value) => value.includes(normalizedQuery))) {
    return 60;
  }

  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryTerms.length && haystacks.some((value) => queryTerms.every((term) => value.includes(term)))) {
    return 45;
  }

  return 20;
}

function normalizeOnePieceCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "");
}

function looksLikeCardCode(value) {
  return /[A-Z]{2,}\d{2}-\d+/i.test(String(value || ""));
}

function buildOnePieceQueryVariants(query) {
  const trimmedQuery = String(query || "").trim();
  const variants = [];
  const seen = new Set();

  function addVariant(params) {
    const key = JSON.stringify(params);
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    variants.push(params);
  }

  if (!trimmedQuery) {
    return variants;
  }

  addVariant({ card_name: trimmedQuery });

  if (looksLikeCardCode(trimmedQuery)) {
    addVariant({ card_image_id: normalizeOnePieceCode(trimmedQuery) });
  }

  const strippedQuery = trimmedQuery
    .split(/\s+/)
    .filter((term) => !ONE_PIECE_VARIANT_STOPWORDS.has(term.toLowerCase()))
    .join(" ")
    .trim();

  if (strippedQuery && strippedQuery.toLowerCase() !== trimmedQuery.toLowerCase()) {
    addVariant({ card_name: strippedQuery });

    if (looksLikeCardCode(strippedQuery)) {
      addVariant({ card_image_id: normalizeOnePieceCode(strippedQuery) });
    }
  }

  return variants;
}

function getOnePieceImageUrl(card) {
  if (card.card_image) {
    return card.card_image;
  }

  return card.card_set_id
    ? `https://images.onepiece-cardgame.dev/cards/${card.card_set_id}.webp`
    : "";
}

function rankOnePieceMatch(card, query) {
  return rankSearchMatch(
    [card.card_name, card.card_set_id, card.card_image_id, card.set_name],
    query,
  );
}

async function fetchWithTimeout(url, init = {}, timeoutMs = SERVER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getBearerToken() {
  const now = Date.now();

  if (tokenCache.accessToken && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.accessToken;
  }

  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.TCGPLAYER_PUBLIC_KEY,
    client_secret: process.env.TCGPLAYER_PRIVATE_KEY,
  });

  const response = await fetchWithTimeout(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to authenticate with TCGplayer: ${errorText}`);
  }

  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + Number(data.expires_in || 0) * 1000,
  };

  return tokenCache.accessToken;
}

async function tcgFetch(pathname, options = {}) {
  const bearerToken = await getBearerToken();
  const response = await fetchWithTimeout(`${API_ROOT}${pathname}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `bearer ${bearerToken}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `TCGplayer request failed (${response.status}): ${errorText}`,
    );
  }

  return response.json();
}

async function searchTcgplayerCatalog(game, query, limit) {
  const categoryId = getCategoryId(game);

  if (!categoryId) {
    throw new Error("Unsupported TCGplayer search category.");
  }

  const searchResponse = await tcgFetch(`/catalog/categories/${categoryId}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sort: "Relevance",
      limit,
      offset: 0,
      filters: [
        {
          name: "ProductName",
          values: [query],
        },
      ],
    }),
  });

  const productIds = searchResponse.results?.slice(0, limit) || [];

  if (!productIds.length) {
    return [];
  }

  const [productsResponse, pricingResponse] = await Promise.all([
    tcgFetch(`/catalog/products/${productIds.join(",")}?getExtendedFields=true`),
    tcgFetch(`/pricing/product/${productIds.join(",")}`),
  ]);

  const pricingMap = new Map(
    (pricingResponse.results || []).map((entry) => [entry.productId, entry]),
  );

  return (productsResponse.results || []).map((product) => {
    const pricing = pricingMap.get(product.productId);
    const usdPrice =
      pricing?.marketPrice ?? pricing?.midPrice ?? pricing?.lowPrice ?? null;

    return {
      id: `tcgplayer-${product.productId}`,
      provider: "tcgplayer",
      providerLabel: "TCGplayer API",
      title: product.name,
      setName: product.groupName || getExtendedValue(product, "SetName"),
      rarity:
        product.rarityName ||
        getExtendedValue(product, "Rarity") ||
        "Unknown",
      imageUrl: product.imageUrl,
      url: product.url,
      productId: product.productId,
      printLabel: pricing?.subTypeName || getExtendedValue(product, "Printing"),
      originalMarketPriceUsd: usdPrice,
      originalMarketPriceCurrency: "USD",
      description: [
        product.groupName || getExtendedValue(product, "SetName"),
        getExtendedValue(product, "Number"),
        product.rarityName || getExtendedValue(product, "Rarity"),
      ]
        .filter(Boolean)
        .join(" | "),
    };
  });
}

async function getUsdToCadRate() {
  const now = Date.now();
  if (exchangeRateCache.fetchedAt && now - exchangeRateCache.fetchedAt < 6 * 60 * 60 * 1000) {
    return exchangeRateCache;
  }

  try {
    const response = await fetchWithTimeout(
      BANK_OF_CANADA_ENDPOINT,
      {
        headers: {
          Accept: "application/json",
        },
      },
      FX_TIMEOUT_MS,
    );

    if (!response.ok) {
      throw new Error("Bank of Canada exchange rate request failed.");
    }

    const data = await response.json();
    const latestObservation = [...(data.observations || [])]
      .reverse()
      .find((observation) => observation.FXUSDCAD?.v);
    const usdToCadRate = parseNumber(latestObservation?.FXUSDCAD?.v);

    if (!usdToCadRate) {
      throw new Error("No USD to CAD rate was returned.");
    }

    exchangeRateCache = {
      usdToCadRate,
      asOf: latestObservation?.d || null,
      fetchedAt: now,
      source: "Bank of Canada",
    };
  } catch {
    exchangeRateCache = {
      ...exchangeRateCache,
      fetchedAt: now,
    };
  }

  return exchangeRateCache;
}

function buildPokemonQueries(query) {
  const trimmedQuery = String(query || "").trim();
  const terms = trimmedQuery.split(/\s+/).filter(Boolean);
  const firstTerm = terms[0];

  return uniqueBy(
    [
      trimmedQuery ? `name:"${trimmedQuery}"` : null,
      terms.length ? terms.map((term) => `name:${term}`).join(" ") : null,
      firstTerm ? `name:${firstTerm}*` : null,
    ].filter(Boolean),
    (item) => item,
  );
}

async function fetchPokemonQuery(searchQuery, limit) {
  const url = new URL(POKEMON_ENDPOINT);
  url.searchParams.set("q", searchQuery);
  url.searchParams.set("pageSize", String(limit));
  url.searchParams.set("orderBy", "-set.releaseDate");
  url.searchParams.set(
    "select",
    "id,name,number,rarity,images,set,tcgplayer",
  );

  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/json",
      ...buildPokemonHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error("Pokemon TCG API search failed.");
  }

  const data = await response.json();
  return data.data || [];
}

async function fetchTcgdexCard(cardId) {
  if (tcgdexCardCache.has(cardId)) {
    return tcgdexCardCache.get(cardId);
  }

  const response = await fetchWithTimeout(`${TCGDEX_CARD_ENDPOINT}/${cardId}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("TCGdex card lookup failed.");
  }

  const data = await response.json();
  tcgdexCardCache.set(cardId, data);
  return data;
}

async function searchPokemonCardsViaTcgdex(query, limit, usdToCadRate) {
  const url = new URL(TCGDEX_SEARCH_ENDPOINT);
  url.searchParams.set("name", query);

  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("TCGdex search failed.");
  }

  const matches = await response.json();
  const resultLimit = Math.min(limit, 12);
  const detailedCards = (
    await Promise.allSettled(
      (matches || []).slice(0, resultLimit).map((card) => fetchTcgdexCard(card.id)),
    )
  )
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  if (!detailedCards.length) {
    throw new Error("TCGdex returned no usable card details.");
  }

  return detailedCards.map((card) => {
    const chosenPrice = pickTcgdexPrice(card);

    return {
      id: `tcgdex-${card.id}`,
      provider: "tcgdex",
      providerLabel: "TCGdex / TCGplayer",
      title: card.name,
      setName: card.set?.name || "Unknown set",
      rarity: card.rarity || "Unknown rarity",
      imageUrl: `${card.image}/high.webp`,
      marketPrice: toCad(chosenPrice.usdValue, usdToCadRate),
      marketPriceCurrency: "CAD",
      originalMarketPriceUsd: chosenPrice.usdValue,
      originalMarketPriceCurrency: "USD",
      priceHistory: [],
      language: "English",
      sourceUrl: "",
      printLabel: chosenPrice.label,
      description: [
        card.set?.name,
        card.rarity,
        card.localId ? `#${card.localId}` : null,
      ]
        .filter(Boolean)
        .join(" | "),
    };
  });
}

async function searchPokemonCards(query, limit, usdToCadRate) {
  try {
    return await searchPokemonCardsViaTcgdex(query, limit, usdToCadRate);
  } catch {
    // Keep the previous provider as a fallback if TCGdex is unavailable.
  }

  const cards = [];
  const searchQueries = buildPokemonQueries(query);

  for (const searchQuery of searchQueries) {
    const results = await fetchPokemonQuery(searchQuery, limit);
    cards.push(...results);

    if (cards.length >= limit) {
      break;
    }
  }

  return uniqueBy(cards, (card) => card.id)
    .slice(0, limit)
    .map((card) => {
      const chosenPrice = pickPokemonPrice(card);
      return {
        id: `pokemon-${card.id}`,
        provider: "pokemon-tcg-api",
        providerLabel: "Pokemon TCG API / TCGplayer",
        title: card.name,
        setName: card.set?.name || "Unknown set",
        rarity: card.rarity || "Unknown rarity",
        imageUrl: card.images?.large || card.images?.small || "",
        marketPrice: toCad(chosenPrice.usdValue, usdToCadRate),
      marketPriceCurrency: "CAD",
      originalMarketPriceUsd: chosenPrice.usdValue,
      originalMarketPriceCurrency: "USD",
      priceHistory: [],
      language: "English",
      sourceUrl: card.tcgplayer?.url || "",
      printLabel: chosenPrice.label,
      description: [
        card.set?.name,
          card.rarity,
          card.number ? `#${card.number}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      };
    });
}

async function resolveScryfallName(query) {
  const url = new URL(SCRYFALL_NAMED_ENDPOINT);
  url.searchParams.set("fuzzy", query);

  const response = await fetchWithTimeout(url, {
    headers: SCRYFALL_HEADERS,
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data?.name || null;
}

async function fetchScryfallSearch(searchQuery) {
  const url = new URL(SCRYFALL_SEARCH_ENDPOINT);
  url.searchParams.set("q", searchQuery);
  url.searchParams.set("unique", "prints");
  url.searchParams.set("order", "released");
  url.searchParams.set("dir", "desc");

  const response = await fetchWithTimeout(url, {
    headers: SCRYFALL_HEADERS,
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function searchMagicCards(query, limit, usdToCadRate, language = "english") {
  const canonicalName = await resolveScryfallName(query);
  const isJapanese = language === "japanese";
  const searchQueries = uniqueBy(
    [
      isJapanese && canonicalName ? `!"${canonicalName}" lang:ja` : null,
      isJapanese && canonicalName ? `"${canonicalName}" lang:ja` : null,
      isJapanese ? `lang:ja ${query}` : null,
      isJapanese ? `printed:${query} lang:ja` : null,
      canonicalName ? `!"${canonicalName}"` : null,
      query,
    ].filter(Boolean),
    (item) => item,
  );

  let data = null;
  for (const searchQuery of searchQueries) {
    data = await fetchScryfallSearch(searchQuery);
    if (data?.data?.length) {
      break;
    }
  }

  return (data?.data || []).slice(0, limit).map((card) => {
    const usdPrice =
      parseNumber(card.prices?.usd) ||
      parseNumber(card.prices?.usd_foil) ||
      parseNumber(card.prices?.usd_etched);
    const imageUrl =
      card.image_uris?.normal ||
      card.card_faces?.[0]?.image_uris?.normal ||
      card.image_uris?.large ||
      "";

    return {
      id: `scryfall-${card.id}`,
      provider: "scryfall",
      providerLabel: "Scryfall",
      title: card.name,
      setName: card.set_name || "Unknown set",
      rarity: card.rarity
        ? card.rarity[0].toUpperCase() + card.rarity.slice(1)
        : "Unknown rarity",
      imageUrl,
      marketPrice: toCad(usdPrice, usdToCadRate),
      marketPriceCurrency: "CAD",
      originalMarketPriceUsd: usdPrice,
      originalMarketPriceCurrency: "USD",
      priceHistory: [],
      language: card.lang === "ja" ? "Japanese" : "English",
      sourceUrl: card.scryfall_uri || card.uri || "",
      printLabel:
        card.finishes?.includes("foil")
          ? "foil"
          : card.finishes?.[0] || card.set?.toUpperCase(),
      description: [
        card.set_name,
        card.collector_number ? `#${card.collector_number}` : null,
        card.type_line,
        isJapanese && card.printed_name && card.printed_name !== card.name
          ? `Printed name: ${card.printed_name}`
          : null,
      ]
        .filter(Boolean)
        .join(" | "),
      title: isJapanese ? card.printed_name || card.name : card.name,
    };
  });
}

async function searchOnePieceEndpoint(endpointCandidates, params) {
  let lastError = null;

  for (const endpoint of endpointCandidates) {
    try {
      const url = new URL(endpoint);
      for (const [key, value] of Object.entries(params)) {
        if (value) {
          url.searchParams.set(key, value);
        }
      }

      const response = await fetchWithTimeout(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("One Piece API search failed.");
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        return data;
      }

      if (data?.error) {
        return [];
      }

      return [];
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("One Piece API search failed.");
}

async function searchOnePieceCards(query, limit, usdToCadRate) {
  const normalizedCode = normalizeOnePieceCode(query);
  const queryVariants = buildOnePieceQueryVariants(query);
  const endpoints = [
    OPTCG_ENDPOINT_CANDIDATES.sets,
    OPTCG_ENDPOINT_CANDIDATES.decks,
    OPTCG_ENDPOINT_CANDIDATES.promos,
  ];

  const responses = await Promise.allSettled(
    endpoints.flatMap((endpoint) =>
      queryVariants.map((params) => searchOnePieceEndpoint(endpoint, params)),
    ),
  );

  const cards = responses
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value || []);

  const uniqueCards = uniqueBy(
    cards,
    (card) => card.card_image_id || `${card.card_set_id}-${card.card_name}`,
  );
  const rankedCards = [...uniqueCards].sort((left, right) => {
    const rightScore = rankOnePieceMatch(right, query);
    const leftScore = rankOnePieceMatch(left, query);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return (parseNumber(right.market_price) || 0) - (parseNumber(left.market_price) || 0);
  });

  if (!rankedCards.length) {
    throw new Error("No One Piece results were returned.");
  }

  return rankedCards.slice(0, limit).map((card) => {
    const usdPrice = parseNumber(card.market_price) || parseNumber(card.inventory_price);

    return {
      id: `one-piece-${card.card_image_id || card.card_set_id || card.card_name}`,
      provider: "optcgapi",
      providerLabel: "OPTCG API",
      title: card.card_name || "Unknown card",
      setName: card.set_name || "Unknown set",
      rarity: card.rarity || "Unknown rarity",
      imageUrl: getOnePieceImageUrl(card),
      marketPrice: toCad(usdPrice, usdToCadRate),
      marketPriceCurrency: "CAD",
      originalMarketPriceUsd: usdPrice,
      originalMarketPriceCurrency: "USD",
      priceHistory: [],
      language: "English",
      sourceUrl: "",
      printLabel: card.card_image_id || card.card_set_id || card.card_type || "One Piece",
      description: [
        card.set_name,
        card.card_set_id,
        card.card_type,
        card.card_color,
      ]
        .filter(Boolean)
        .join(" | "),
    };
  });
}

function extractPriceChartingRecentSales(html, usdToCadRate) {
  const sales = [];
  const saleRegex = /<tr id="ebay-(\d+)"[\s\S]*?<td class="date">([\s\S]*?)<\/td>[\s\S]*?<td class="title"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td class="numeric">\s*<span class="js-price"[^>]*>\$([0-9,]+(?:\.\d{2})?)/gi;

  for (const match of html.matchAll(saleRegex)) {
    const [, saleId, dateText, titleHtml, usdPriceText] = match;
    const rawDate = stripHtml(dateText);
    const title = stripHtml(titleHtml).replace(/\[eBay\]\s*$/i, "").trim();
    const usdPrice = parseNumber(String(usdPriceText || "").replace(/,/g, ""));
    const parsedDate = rawDate ? new Date(`${rawDate}T12:00:00Z`) : null;
    const saleCondition = classifySaleCondition(title);

    if (!usdPrice || !title) {
      continue;
    }

    sales.push({
      id: `pricecharting-sale-${saleId}`,
      price: toCad(usdPrice, usdToCadRate),
      originalPriceUsd: usdPrice,
      currency: "CAD",
      sourceLabel: "PriceCharting",
      label: rawDate || "Recent sold",
      title,
      conditionLabel: saleCondition.label,
      conditionType: saleCondition.type,
      sourceUrl: saleId ? `https://www.ebay.com/itm/${saleId}` : "",
      createdAt:
        parsedDate && Number.isFinite(parsedDate.getTime())
          ? parsedDate.toISOString()
          : new Date().toISOString(),
    });
  }

  return sales
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 3);
}

function classifySaleCondition(title) {
  const normalizedTitle = String(title || "").toUpperCase();
  const gradedPatterns = [
    /\bPSA\s*(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1)\b/,
    /\bBGS\s*(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1)\b/,
    /\bCGC\s*(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1)\b/,
    /\bSGC\s*(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1)\b/,
    /\bTAG\s*(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1)\b/,
    /\bACE\s*(10|9(?:\.5)?|8(?:\.5)?|7(?:\.5)?|6(?:\.5)?|5(?:\.5)?|4(?:\.5)?|3(?:\.5)?|2(?:\.5)?|1)\b/,
  ];

  for (const pattern of gradedPatterns) {
    const match = normalizedTitle.match(pattern);
    if (match) {
      return {
        type: "graded",
        label: match[0].replace(/\s+/g, " ").trim(),
      };
    }
  }

  if (/\bGRADED\b|\bSLABBED\b/.test(normalizedTitle)) {
    return {
      type: "graded",
      label: "Graded",
    };
  }

  return {
    type: "raw",
    label: "Raw",
  };
}

function extractPriceChartingCurrentUsdPrice(html) {
  const priceIds = ["used_price", "box_only_price", "new_price", "complete_price"];

  for (const id of priceIds) {
    const match = html.match(
      new RegExp(
        `<td id="${id}"[\\s\\S]*?<span class="price js-price">\\s*\\$([0-9,]+(?:\\.\\d{2})?)`,
        "i",
      ),
    );
    if (match?.[1]) {
      return parseNumber(match[1].replace(/,/g, ""));
    }
  }

  return null;
}

function extractPriceChartingImageUrl(html) {
  const imageMatches = [...html.matchAll(/https:\/\/storage\.googleapis\.com\/images\.pricecharting\.com\/[^"'\\s)]+/g)].map(
    (match) => match[0],
  );

  return (
    imageMatches.find((url) => /\/1600\./.test(url)) ||
    imageMatches.find((url) => /\/240\./.test(url)) ||
    imageMatches[0] ||
    ""
  );
}

function buildPriceChartingResult(
  pathname,
  html,
  query,
  usdToCadRate,
  { language = "Japanese", descriptionLabel = "PriceCharting card data", rarity = `${language} print` } = {},
) {
  const headingHtml = html.match(/<h1[^>]*id="product_name"[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
  const headingText = stripHtml(headingHtml);
  const setName = stripHtml(
    headingHtml.match(/<a[^>]+href="\/console\/[^"]+"[^>]*>([\s\S]*?)<\/a>/i)?.[1] || "",
  );
  const title = setName && headingText.endsWith(setName)
    ? headingText.slice(0, headingText.length - setName.length).trim()
    : headingText;
  const usdPrice = extractPriceChartingCurrentUsdPrice(html);
  const priceHistory = extractPriceChartingRecentSales(html, usdToCadRate);
  const imageUrl = extractPriceChartingImageUrl(html);
  const normalizedPath = decodeHtml(pathname);
  const productSlug = normalizedPath.split("/").pop() || title;
  const score = rankSearchMatch([title, setName, productSlug], query);

  if (!title) {
    return null;
  }

  return {
    id: `pricecharting-${productSlug}`,
    provider: "pricecharting",
    providerLabel: "PriceCharting",
    title,
    setName: setName || "Unknown set",
    rarity,
    imageUrl,
    marketPrice: toCad(usdPrice, usdToCadRate),
    marketPriceCurrency: "CAD",
    originalMarketPriceUsd: usdPrice,
    originalMarketPriceCurrency: "USD",
    priceHistory,
    language,
    sourceUrl: `https://www.pricecharting.com${normalizedPath}`,
    printLabel: title.match(/#\S+/)?.[0] || language,
    description: [setName, descriptionLabel].filter(Boolean).join(" | "),
    score,
  };
}

function extractPriceChartingProductPaths(html, prefix, excludePrefixes = []) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const productRegex = new RegExp(`\\/game\\/${escapedPrefix}[^\\/'"\\s<]+\\/[^"'\\s<]+`, "g");
  return uniqueBy(
    (html.match(productRegex) || [])
      .map((path) => decodeHtml(path))
      .filter(
        (path) =>
          !excludePrefixes.some((excludedPrefix) => path.startsWith(`/game/${excludedPrefix}`)),
      ),
    (item) => item,
  );
}

async function searchPriceChartingProducts({
  query,
  limit,
  usdToCadRate,
  searchQuery,
  pathPrefix,
  excludePrefixes = [],
  language = "Japanese",
  descriptionLabel,
  rarity,
}) {
  const searchUrl = new URL(PRICECHARTING_SEARCH_ENDPOINT);
  searchUrl.searchParams.set("type", "prices");
  searchUrl.searchParams.set("q", searchQuery);

  const response = await fetchWithTimeout(searchUrl, {
    headers: {
      Accept: "text/html",
      "User-Agent": "TCGWPG/0.2 (local marketplace development)",
    },
  });

  if (!response.ok) {
    throw new Error(`PriceCharting search failed (${response.status}).`);
  }

  const html = await response.text();
  const productPaths = extractPriceChartingProductPaths(html, pathPrefix, excludePrefixes).slice(
    0,
    Math.min(limit * 3, 15),
  );

  if (!productPaths.length) {
    throw new Error("PriceCharting returned no matches for this search.");
  }

  const products = (
    await Promise.allSettled(
      productPaths.map(async (pathname) => {
        const productResponse = await fetchWithTimeout(`https://www.pricecharting.com${pathname}`, {
          headers: {
            Accept: "text/html",
            "User-Agent": "TCGWPG/0.2 (local marketplace development)",
          },
        });

        if (!productResponse.ok) {
          throw new Error(`PriceCharting product fetch failed (${productResponse.status}).`);
        }

        const productHtml = await productResponse.text();
        return buildPriceChartingResult(pathname, productHtml, query, usdToCadRate, {
          language,
          descriptionLabel,
          rarity,
        });
      }),
    )
  )
    .filter((result) => result.status === "fulfilled" && result.value)
    .map((result) => result.value);

  if (!products.length) {
    throw new Error("PriceCharting returned no usable results.");
  }

  return products.sort((left, right) => right.score - left.score).slice(0, limit);
}

function getPriceChartingLookupConfig(game, language) {
  const normalizedGame = normalizeGameName(game);
  const normalizedLanguage = normalizeLanguage(language);

  if (normalizedGame === "pokemon" && normalizedLanguage === "japanese") {
    return {
      pathPrefix: "pokemon-japanese-",
      excludePrefixes: [],
      language: "Japanese",
      descriptionLabel: "PriceCharting Japanese Pokemon data",
      rarity: "Japanese print",
    };
  }

  if (normalizedGame === "pokemon") {
    return {
      pathPrefix: "pokemon-",
      excludePrefixes: ["pokemon-japanese-"],
      language: "English",
      descriptionLabel: "PriceCharting Pokemon data",
      rarity: "English print",
    };
  }

  if (normalizedGame === "one-piece" && normalizedLanguage === "japanese") {
    return {
      pathPrefix: "one-piece-japanese-",
      excludePrefixes: [],
      language: "Japanese",
      descriptionLabel: "PriceCharting Japanese One Piece data",
      rarity: "Japanese print",
    };
  }

  if (normalizedGame === "one-piece") {
    return {
      pathPrefix: "one-piece-",
      excludePrefixes: ["one-piece-japanese-"],
      language: "English",
      descriptionLabel: "PriceCharting One Piece data",
      rarity: "English print",
    };
  }

  if (normalizedGame === "magic") {
    return {
      pathPrefix: "magic-",
      excludePrefixes: [],
      language: normalizedLanguage === "japanese" ? "Japanese" : "English",
      descriptionLabel:
        normalizedLanguage === "japanese"
          ? "PriceCharting Japanese Magic data"
          : "PriceCharting Magic data",
      rarity: normalizedLanguage === "japanese" ? "Japanese print" : "English print",
    };
  }

  return null;
}

function buildPriceChartingLookupQuery({ title, setName, printLabel }) {
  return [title, printLabel || null, printLabel ? null : setName]
    .filter(Boolean)
    .map((part) => String(part).replace(/[|#]/g, " ").trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCardCode(value) {
  const match = String(value || "").toUpperCase().match(/[A-Z]{2,}\d{2}-\d+/);
  return match ? match[0] : "";
}

function extractVariantTokens(...values) {
  const variantTerms = ["sp", "alternate", "alt", "foil", "gold", "silver", "manga", "parallel"];
  const text = normalizeSearchText(values.filter(Boolean).join(" "));
  return variantTerms.filter((term) => text.includes(term));
}

function rankPriceChartingResultForPrinting(result, { title, setName, printLabel, rarity }) {
  let score = rankSearchMatch(
    [result.title, result.setName, result.printLabel, result.description],
    buildPriceChartingLookupQuery({ title, setName, printLabel }),
  );

  const normalizedTitle = normalizeSearchText(title);
  const normalizedPrintLabel = normalizeSearchText(printLabel);
  const normalizedRarity = normalizeSearchText(rarity);
  const normalizedResultTitle = normalizeSearchText(result.title);
  const normalizedResultSetName = normalizeSearchText(result.setName);
  const normalizedResultPrintLabel = normalizeSearchText(result.printLabel);
  const normalizedResultDescription = normalizeSearchText(result.description);
  const queryCode = extractCardCode(printLabel || title);
  const resultCode = extractCardCode(
    [result.title, result.printLabel, result.description, result.setName].join(" "),
  );
  const queryVariantTokens = extractVariantTokens(title, rarity, printLabel);
  const resultVariantTokens = extractVariantTokens(
    result.title,
    result.description,
    result.printLabel,
  );

  if (normalizedTitle && normalizedResultTitle === normalizedTitle) {
    score += 80;
  } else if (
    normalizedTitle &&
    normalizedTitle.split(/\s+/).every((term) => normalizedResultTitle.includes(term))
  ) {
    score += 40;
  }

  if (queryCode) {
    if (resultCode === queryCode) {
      score += 140;
    } else {
      score -= 120;
    }
  }

  if (
    normalizedPrintLabel &&
    (normalizedResultPrintLabel.includes(normalizedPrintLabel) ||
      normalizedResultDescription.includes(normalizedPrintLabel))
  ) {
    score += 50;
  }

  if (normalizedRarity && normalizedResultDescription.includes(normalizedRarity)) {
    score += 10;
  }

  if (
    normalizedResultSetName &&
    normalizedTitle &&
    normalizedResultSetName.includes(normalizedTitle)
  ) {
    score += 10;
  }

  if (queryVariantTokens.length) {
    const matchedVariantCount = queryVariantTokens.filter((token) =>
      resultVariantTokens.includes(token),
    ).length;
    score += matchedVariantCount * 40;
    if (!matchedVariantCount) {
      score -= 60;
    }
  }

  return score;
}

async function lookupPriceChartingSalesForPrinting(
  { game, language, title, setName, printLabel, rarity },
  usdToCadRate,
) {
  const config = getPriceChartingLookupConfig(game, language);
  if (!config || !title) {
    return null;
  }

  const query = title;
  const searchQuery = buildPriceChartingLookupQuery({ title, setName, printLabel }) || title;
  const results = await searchPriceChartingProducts({
    query,
    limit: 5,
    usdToCadRate,
    searchQuery,
    pathPrefix: config.pathPrefix,
    excludePrefixes: config.excludePrefixes,
    language: config.language,
    descriptionLabel: config.descriptionLabel,
    rarity: config.rarity,
  });

  const rankedResults = [...results].sort((left, right) => {
    const rightScore = rankPriceChartingResultForPrinting(right, {
      title,
      setName,
      printLabel,
      rarity,
    });
    const leftScore = rankPriceChartingResultForPrinting(left, {
      title,
      setName,
      printLabel,
      rarity,
    });
    return rightScore - leftScore;
  });

  return rankedResults[0] || null;
}

async function searchJapanesePokemonCards(query, limit, usdToCadRate) {
  return searchPriceChartingProducts({
    query,
    limit,
    usdToCadRate,
    searchQuery: /\bjapanese\b/i.test(query) ? `${query} pokemon` : `${query} pokemon japanese`,
    pathPrefix: "pokemon-japanese-",
    language: "Japanese",
    descriptionLabel: "PriceCharting Japanese Pokemon data",
    rarity: "Japanese print",
  });
}

async function searchJapaneseOnePieceCards(query, limit, usdToCadRate) {
  return searchPriceChartingProducts({
    query,
    limit,
    usdToCadRate,
    searchQuery: /\bjapanese\b/i.test(query)
      ? `${query} one piece`
      : `${query} one piece japanese`,
    pathPrefix: "one-piece-japanese-",
    language: "Japanese",
    descriptionLabel: "PriceCharting Japanese One Piece data",
    rarity: "Japanese print",
  });
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEventGame(value) {
  const rawValue = String(value || "");

  if (
    /(star wars unlimited|pathfinder|lorcana|yu[\s-]?gi[\s-]?oh|teenage mutant ninja turtles|\btmnt\b|riftbound|flesh and blood|digimon|dragon ball|union arena|final fantasy)/i.test(
      rawValue,
    )
  ) {
    return null;
  }

  if (/one\s*piece/i.test(rawValue)) {
    return "One Piece";
  }

  if (/pok[eé]mon/i.test(rawValue)) {
    return "Pokemon";
  }

  if (
    /(magic(?::|\s+the gathering)?|friday night magic|\bfnm\b|\bcommander\b|\bmodern\b|\bpioneer\b|standard showdown)/i.test(
      rawValue,
    )
  ) {
    return "Magic";
  }

  return null;
}

function normalizeEventFee(value) {
  if (value == null || value === "") {
    return "TBD";
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue === 0 ? "Free" : formatCurrencyValue(numericValue, "CAD");
  }

  return String(value).trim();
}

function formatCurrencyValue(value, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildEventId(prefix, value) {
  return `${prefix}-${String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

function isUpcomingDate(date) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 120);

  return date >= start && date <= end;
}

function parseMonthDayDate(title, referenceDate = new Date()) {
  const match = String(title || "").match(
    /\b(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?/i,
  );

  if (!match) {
    return null;
  }

  const monthIndex = MONTH_INDEX[match[1].toLowerCase()];
  const day = Number(match[2]);
  const year = Number(match[3] || new Date(referenceDate).getFullYear());
  const parsedDate = new Date(year, monthIndex, day);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function parseTimeLabel(value) {
  const match = String(value || "").match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3].toLowerCase();
  const displayHour = ((hour + 11) % 12) + 1;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${meridiem.toUpperCase()}`;
}

function findTimeLabel(value, fallback = "TBD") {
  const match = String(value || "").match(/@?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
  return match ? parseTimeLabel(match[1]) : fallback;
}

function nextDatesForWeekday(weekdayName, count, timeLabel = "6:00 PM") {
  const weekdayIndex = WEEKDAY_INDEX[String(weekdayName || "").toLowerCase()];
  if (weekdayIndex == null) {
    return [];
  }

  const results = [];
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  const offset = (weekdayIndex - current.getDay() + 7) % 7;
  current.setDate(current.getDate() + offset);

  for (let index = 0; index < count; index += 1) {
    const eventDate = new Date(current);
    eventDate.setDate(current.getDate() + index * 7);
    results.push({
      dateStr: eventDate.toISOString().slice(0, 10),
      time: timeLabel,
    });
  }

  return results;
}

function normalizeEventRecord(event) {
  return {
    sourceType: "live",
    neighborhood: "",
    note: "",
    fee: "TBD",
    ...event,
  };
}

const GALAXY_FACEBOOK_SNAPSHOT_EVENTS = [
  { title: "Magic: The Gathering Standard League", dateStr: "2026-03-20", time: "6:00 p.m.", game: "Magic" },
  { title: "Pokemon Mega Evolution Perfect Order Prerelease", dateStr: "2026-03-21", time: "10:00 a.m.", game: "Pokemon" },
  { title: "ONE PIECE CARD GAME Store Treasure Cup 2026 March", dateStr: "2026-03-22", time: "10:00 a.m.", game: "One Piece" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-03-22", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-03-27", time: "6:00 p.m.", game: "Magic" },
  { title: "ONE PIECE CARD GAME OP-15 Release Event", dateStr: "2026-03-29", time: "12:00 p.m.", game: "One Piece" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-04-03", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-04-05", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Teenage Mutant Ninja Turtles Commander Party", dateStr: "2026-04-06", time: "5:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-04-10", time: "6:00 p.m.", game: "Magic" },
  { title: "One Piece Store Championship April", dateStr: "2026-04-12", time: "10:00 a.m.", game: "One Piece" },
  { title: "Pokemon TCG League Challenge", dateStr: "2026-04-16", time: "6:00 p.m.", game: "Pokemon" },
  { title: "Magic: The Gathering Secrets of Strixhaven Two-Headed Prerelease!", dateStr: "2026-04-17", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-04-17", time: "6:00 p.m.", game: "Magic" },
  { title: "Pokemon TCG League Cup", dateStr: "2026-04-18", time: "10:00 a.m.", game: "Pokemon" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-04-19", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-04-24", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-05-01", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-05-03", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-05-08", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-05-15", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-05-17", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-05-22", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-05-29", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-05-31", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-06-05", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-06-12", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-06-14", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-06-19", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-06-26", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-06-28", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-07-03", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Standard League", dateStr: "2026-07-10", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-07-12", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-07-17", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-07-26", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-07-31", time: "6:00 p.m.", game: "Magic" },
  { title: "Sunday Evening Legacy Season 7", dateStr: "2026-08-09", time: "6:00 p.m.", game: "Magic" },
  { title: "Magic: The Gathering Pauper League", dateStr: "2026-08-14", time: "6:00 p.m.", game: "Magic" },
];

async function fetchFusionEvents() {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 127);
    const searchParams = new URLSearchParams({
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    });

    const response = await fetchWithTimeout(`${FUSION_BINDERPOS_ENDPOINT}?${searchParams.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "https://fusiongamingonline.com",
        Referer: FUSION_EVENTS_PAGE,
        "User-Agent": "TCGWPG/0.2 (local marketplace development)",
      },
    });

    if (!response.ok) {
      throw new Error(`Fusion BinderPOS request failed (${response.status}).`);
    }

    const payload = await response.json();
    const rawEvents = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.events)
        ? payload.events
        : [];
    const events = rawEvents
      .map((item) => {
        const title = stripHtml(item.title || item.name || "");
        const rawDate = String(item.date || item.startDate || "").slice(0, 10);
        const rawTime = String(item.time || item.startTime || "").slice(0, 8);
        const parsedDate = rawDate ? new Date(`${rawDate}T12:00:00`) : null;
        const parsedTime = rawDate && rawTime ? new Date(`${rawDate}T${rawTime}`) : null;
        const game = normalizeEventGame(item.game || item.gameName || title);

        if (!title || !parsedDate || Number.isNaN(parsedDate.getTime()) || !game) {
          return null;
        }

        return normalizeEventRecord({
          id: buildEventId("fusion", item.id || item.handle || `${title}-${rawDate}-${rawTime}`),
          title,
          store: "Fusion Gaming",
          source: "Fusion events calendar",
          sourceUrl: item.handle
            ? `https://fusiongamingonline.com/collections/events/products/${item.handle}`
            : FUSION_EVENTS_PAGE,
          dateStr: rawDate,
          time:
            parsedTime && !Number.isNaN(parsedTime.getTime())
              ? parsedTime.toLocaleTimeString("en-CA", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "TBD",
          game,
          fee: normalizeEventFee(item.ticketPrice ?? item.entryFee ?? item.buyin ?? item.price ?? item.cost),
          neighborhood: "Fort Garry",
          note:
            stripHtml(item.description || "") ||
            stripHtml(item.prizeStructure || "") ||
            stripHtml(item.buildingName || ""),
        });
      })
      .filter(Boolean)
      .filter((event) => isUpcomingDate(new Date(`${event.dateStr}T12:00:00`)));

    return {
      events,
      status: {
        id: "fusion",
        label: "Fusion Gaming",
        mode: events.length ? "Live pull" : "Live source / no current events",
        note: events.length
          ? `Pulled ${events.length} upcoming event(s) from Fusion's BinderPOS calendar.`
          : "Fusion's events page is reachable, but it did not return upcoming Magic, Pokemon, or One Piece events right now.",
        sourceUrl: FUSION_EVENTS_PAGE,
      },
    };
  } catch (error) {
    return {
      events: [],
      status: {
        id: "fusion",
        label: "Fusion Gaming",
        mode: "Source error",
        note: error.message,
        sourceUrl: FUSION_EVENTS_PAGE,
      },
    };
  }
}

async function fetchAMuseEvents() {
  try {
    const response = await fetchWithTimeout(A_MUSE_EVENTS_ENDPOINT, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify events request failed (${response.status}).`);
    }

    const payload = await response.json();
    const products = Array.isArray(payload.products) ? payload.products : [];
    const events = products
      .map((product) => {
        const title = stripHtml(product.title);
        const description = stripHtml(product.body_html);
        const tags = Array.isArray(product.tags)
          ? product.tags.join(" ")
          : String(product.tags || "");
        const game = normalizeEventGame(`${title} ${tags}`);
        const parsedDate = parseMonthDayDate(title, product.published_at || product.created_at);

        if (!game || !parsedDate || !isUpcomingDate(parsedDate)) {
          return null;
        }

        return normalizeEventRecord({
          id: buildEventId("amuse", product.id || product.handle || title),
          title,
          store: "A Muse N Games",
          source: "Shopify Events",
          sourceUrl: `https://amusengames.ca/products/${product.handle}`,
          dateStr: parsedDate.toISOString().slice(0, 10),
          time: findTimeLabel(title, "TBD"),
          game,
          fee: normalizeEventFee(product.variants?.[0]?.price),
          neighborhood: "West End",
          note: description,
        });
      })
      .filter(Boolean);

    return {
      events,
      status: {
        id: "amuse",
        label: "A Muse N Games",
        mode: events.length ? "Live pull" : "Live source / no current events",
        note: events.length
          ? `Pulled ${events.length} upcoming Shopify event product(s).`
          : "Shopify events endpoint is reachable, but it returned no upcoming Magic, Pokemon, or One Piece events inside the active window.",
        sourceUrl: A_MUSE_EVENTS_ENDPOINT,
      },
    };
  } catch (error) {
    return {
      events: [],
      status: {
        id: "amuse",
        label: "A Muse N Games",
        mode: "Source error",
        note: error.message,
        sourceUrl: A_MUSE_EVENTS_ENDPOINT,
      },
    };
  }
}

async function fetchArcticEvents() {
  try {
    const mahinaResponse = await fetchWithTimeout(ARCTIC_MAHINA_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "text/plain;charset=UTF-8",
        Referer: ARCTIC_HOME_PAGE,
      },
      body: JSON.stringify({
        shop: "5d7678.myshopify.com",
        selectedEventId: null,
        selectedRecurringDate: null,
        page: 1,
      }),
    });

    if (!mahinaResponse.ok) {
      throw new Error(`Arctic event feed failed (${mahinaResponse.status}).`);
    }

    const payload = await mahinaResponse.json();
    const eventTemplates = new Map(
      (Array.isArray(payload.events) ? payload.events : []).map((event) => [String(event.id), event]),
    );
    const rawEventDates = Array.isArray(payload.eventDates)
      ? payload.eventDates
      : (Array.isArray(payload.events) ? payload.events : []).map((event) => ({
          id: event.id,
          start: event.startDate,
          timezone: event.timezone,
          isRecurring: event.isRecurring,
        }));

    const events = rawEventDates
      .map((occurrence, index) => {
        const template = eventTemplates.get(String(occurrence.id));
        const title = stripHtml(template?.title || "");
        const game = normalizeEventGame(title);
        const startDate = occurrence.start ? new Date(occurrence.start) : null;

        if (!template || !title || !game || !startDate || Number.isNaN(startDate.getTime())) {
          return null;
        }

        if (!isUpcomingDate(startDate)) {
          return null;
        }

        const fee =
          template.tickets?.priceType === "free"
            ? "Free"
            : normalizeEventFee(
                template.tickets?.priceMin ||
                  template.tickets?.priceMax ||
                  template.tickets?.price,
              );

        return normalizeEventRecord({
          id: buildEventId("arctic", `${occurrence.id}-${startDate.toISOString()}-${index}`),
          title,
          store: "Arctic Rift Cards",
          source: "Arctic homepage feed",
          sourceUrl: template.tickets?.links?.[0]?.link || ARCTIC_HOME_PAGE,
          dateStr: startDate.toISOString().slice(0, 10),
          time: startDate.toLocaleTimeString("en-CA", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: occurrence.timezone || template.timezone || "America/Chicago",
          }),
          game,
          fee,
          neighborhood: "North End",
          note: stripHtml(template.description || "") || stripHtml(template.location?.name || ""),
        });
      })
      .filter(Boolean)
      .sort(
        (left, right) =>
          new Date(`${left.dateStr}T12:00:00`).getTime() -
          new Date(`${right.dateStr}T12:00:00`).getTime(),
      )
      .slice(0, 80);

    return {
      events,
      status: {
        id: "arctic",
        label: "Arctic Rift Cards",
        mode: events.length ? "Live homepage feed" : "Live source / no supported events",
        note: events.length
          ? `Pulled ${events.length} upcoming event occurrence(s) from Arctic Rift's homepage calendar feed.`
          : "Arctic Rift's homepage feed is reachable, but it did not return upcoming Magic, Pokemon, or One Piece events right now.",
        sourceUrl: ARCTIC_HOME_PAGE,
      },
    };

    /* const response = await fetchWithTimeout(ARCTIC_EVENTS_PAGE, {
      headers: {
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Arctic events page failed (${response.status}).`);
    }

    const html = await response.text();
    const descriptionMatch = html.match(/<meta name="description" content="([^"]+)"/i);
    const description = decodeHtml(descriptionMatch?.[1] || "");
    const events = [];

    if (/pok[eé]mon/i.test(description) && /monday at 6 pm/i.test(description)) {
      nextDatesForWeekday("monday", 8, "6:00 PM").forEach((date, index) => {
        events.push(
          normalizeEventRecord({
            id: buildEventId("arctic-pokemon", `${date.dateStr}-${index}`),
            title: "Pokemon Weekly League Night",
            store: "Arctic Rift Cards",
            source: "Public Events Page",
            sourceUrl: ARCTIC_EVENTS_PAGE,
            dateStr: date.dateStr,
            time: date.time,
            game: "Pokemon",
            fee: "TBD",
            neighborhood: "",
            note: "Recurring weekly event generated from Arctic Rift's public event page schedule.",
          }),
        );
      });
    }

    return {
      events,
      status: {
        id: "arctic",
        label: "Arctic Rift Cards",
        mode: events.length ? "Recurring page scrape" : "Live source / no supported events",
        note: events.length
          ? "Generated upcoming recurring Pokemon nights from the public events page."
          : "The public events page is reachable, but it does not currently expose upcoming Magic, Pokemon, or One Piece events beyond unsupported schedules.",
        sourceUrl: ARCTIC_EVENTS_PAGE,
      },
    }; */
  } catch (error) {
    return {
      events: [],
      status: {
        id: "arctic",
        label: "Arctic Rift Cards",
        mode: "Source error",
        note: error.message,
        sourceUrl: ARCTIC_EVENTS_PAGE,
      },
    };
  }
}

async function fetchGalaxyStatus() {
  try {
    const response = await fetchWithTimeout(GALAXY_EVENTS_PAGE, {
      headers: {
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Galaxy calendar page failed (${response.status}).`);
    }

    const events = GALAXY_FACEBOOK_SNAPSHOT_EVENTS.map((event) =>
      normalizeEventRecord({
        id: buildEventId("galaxy", `${event.title}-${event.dateStr}-${event.time}`),
        store: "Galaxy Comics",
        source: "Facebook events snapshot",
        sourceUrl: GALAXY_FACEBOOK_EVENTS_PAGE,
        neighborhood: "North Kildonan",
        note: "Imported from Galaxy's Facebook events feed snapshot supplied on March 19, 2026.",
        ...event,
      }),
    ).filter((event) => isUpcomingDate(new Date(`${event.dateStr}T12:00:00`)));

    return {
      events,
      status: {
        id: "galaxy",
        label: "Galaxy Comics",
        mode: events.length ? "Facebook snapshot" : "Manual override",
        note: events.length
          ? `Loaded ${events.length} upcoming Galaxy event(s) from the supplied Facebook snapshot.`
          : "The public calendar page is reachable, but it does not expose a stable structured event feed. Admin overrides are used for this store.",
        sourceUrl: GALAXY_FACEBOOK_EVENTS_PAGE,
      },
    };
  } catch (error) {
    return {
      events: [],
      status: {
        id: "galaxy",
        label: "Galaxy Comics",
        mode: "Manual override",
        note: `Fallback to admin-managed events. ${error.message}`,
        sourceUrl: GALAXY_EVENTS_PAGE,
      },
    };
  }
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    supportedGames: ["magic", "pokemon", "one-piece"],
  });
});

app.post("/api/admin/delete-user", async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(501).json({
      error:
        "Account deletion is not configured. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the API server.",
    });
  }

  const authHeader = String(req.headers.authorization || "");
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const targetUserId = String(req.body?.userId || "").trim();

  if (!accessToken) {
    return res.status(401).json({ error: "Missing access token." });
  }

  if (!targetUserId) {
    return res.status(400).json({ error: "Missing userId." });
  }

  const {
    data: { user: actingUser },
    error: actingUserError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (actingUserError || !actingUser) {
    return res.status(401).json({ error: "Invalid access token." });
  }

  const { data: actingProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", actingUser.id)
    .maybeSingle();

  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  const isSelfDelete = actingUser.id === targetUserId;
  const isAdminDelete = actingProfile?.role === "admin";

  if (!isSelfDelete && !isAdminDelete) {
    return res.status(403).json({ error: "You do not have permission to delete this account." });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ ok: true });
});

app.get("/api/live/exchange-rate", async (_req, res) => {
  const exchangeRate = await getUsdToCadRate();

  res.json({
    usdToCadRate: exchangeRate.usdToCadRate,
    asOf: exchangeRate.asOf,
    source: exchangeRate.source,
  });
});

app.get("/api/live/search", async (req, res) => {
  const game = normalizeGameName(req.query.game);
  const language = normalizeLanguage(req.query.language);
  const query = String(req.query.query || "").trim();
  const limit = Math.min(Number(req.query.limit || 24), 24);

  if (!query) {
    return res.json({
      providerLabel: "Live Search",
      results: [],
      note: "Enter a card name to search the live database.",
    });
  }

  try {
    const exchangeRate = await getUsdToCadRate();
    let providerLabel = "Live Search";
    let results = [];
    let note = `Market values are shown in CAD using USD/CAD ${exchangeRate.usdToCadRate}. Source-backed recent solds only appear when the source exposes them.`;

    if (game === "pokemon" && language === "japanese") {
      providerLabel = "PriceCharting";
      results = await searchJapanesePokemonCards(query, limit, exchangeRate.usdToCadRate);
      note = `Japanese Pokemon results are sourced from PriceCharting and normalized to CAD using USD/CAD ${exchangeRate.usdToCadRate}.`;
    } else if (game === "pokemon") {
      providerLabel = "TCGdex / TCGplayer";
      results = await searchPokemonCards(query, limit, exchangeRate.usdToCadRate);
    } else if (game === "magic") {
      providerLabel = language === "japanese" ? "Scryfall (Japanese)" : "Scryfall";
      results = await searchMagicCards(query, limit, exchangeRate.usdToCadRate, language);
    } else if (game === "one-piece" && language === "japanese") {
      providerLabel = "PriceCharting";
      results = await searchJapaneseOnePieceCards(query, limit, exchangeRate.usdToCadRate);
      note = `Japanese One Piece results are sourced from PriceCharting and normalized to CAD using USD/CAD ${exchangeRate.usdToCadRate}.`;
    } else if (game === "one-piece") {
      providerLabel = "OPTCG API";
      results = await searchOnePieceCards(query, limit, exchangeRate.usdToCadRate);
    } else {
      note = "Live search is currently implemented for Pokemon, Magic, and One Piece.";
    }

    return res.json({
      providerLabel,
      results,
      note,
      exchangeRate,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
});

app.get("/api/live/source-sales", async (req, res) => {
  const game = normalizeGameName(req.query.game);
  const language = normalizeLanguage(req.query.language);
  const title = String(req.query.title || "").trim();
  const setName = String(req.query.setName || "").trim();
  const printLabel = String(req.query.printLabel || "").trim();
  const rarity = String(req.query.rarity || "").trim();

  if (!game || !title) {
    return res.status(400).json({
      error: "Game and title are required.",
    });
  }

  const exchangeRate = await getUsdToCadRate();

  try {
    const result = await lookupPriceChartingSalesForPrinting(
      {
        game,
        language,
        title,
        setName,
        printLabel,
        rarity,
      },
      exchangeRate.usdToCadRate,
    );

    return res.json({
      providerLabel: result?.providerLabel || "PriceCharting",
      result,
      note: result
        ? `Recent solds are sourced from PriceCharting and normalized to CAD using USD/CAD ${exchangeRate.usdToCadRate}.`
        : "No recent solds were found from the source for this printing.",
      exchangeRate,
    });
  } catch (error) {
    return res.json({
      providerLabel: "PriceCharting",
      result: null,
      note: `Recent sold lookup is currently unavailable for this printing. ${error.message}`,
      exchangeRate,
    });
  }
});

app.get("/api/events/local", async (_req, res) => {
  const results = await Promise.all([
    fetchFusionEvents(),
    fetchAMuseEvents(),
    fetchArcticEvents(),
    fetchGalaxyStatus(),
  ]);

  const events = uniqueBy(
    results.flatMap((result) => result.events || []),
    (event) => `${event.store}-${event.title}-${event.dateStr}-${event.time}`,
  ).sort((left, right) => {
    const leftTime = new Date(`${left.dateStr}T12:00:00`).getTime();
    const rightTime = new Date(`${right.dateStr}T12:00:00`).getTime();
    return leftTime - rightTime;
  });

  res.json({
    events,
    sources: results.map((result) => result.status),
    fetchedAt: new Date().toISOString(),
  });
});

app.listen(port, () => {
  console.log(`TCGWPG proxy listening on http://localhost:${port}`);
});
