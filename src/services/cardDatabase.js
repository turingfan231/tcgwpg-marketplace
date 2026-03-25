const LIVE_SEARCH_PATH = "/api/live/search";
const SOURCE_SALES_PATH = "/api/live/source-sales";
const EXCHANGE_RATE_PATH = "/api/live/exchange-rate";
const LOCAL_EVENTS_PATH = "/api/events/local";
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
const FALLBACK_USD_TO_CAD_RATE = 1.38;
const CLIENT_TIMEOUT_MS = 15000;
const DEPLOY_API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "")
  .trim()
  .replace(/\/$/, "");
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

function buildLiveApiUrls(path) {
  if (DEPLOY_API_BASE_URL) {
    return [new URL(path, `${DEPLOY_API_BASE_URL}/`)];
  }

  if (!import.meta.env.DEV) {
    return [new URL(path, window.location.origin)];
  }

  const urls = [new URL(path, window.location.origin)];
  const currentHostUrl = new URL(window.location.origin);
  currentHostUrl.protocol = "http:";
  currentHostUrl.port = "8787";
  urls.push(new URL(path, currentHostUrl.origin));
  urls.push(new URL(path, "http://localhost:8787"));

  return uniqueBy(urls, (item) => item.toString());
}

async function fetchWithTimeout(url, init = {}, timeoutMs = CLIENT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

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
    window.clearTimeout(timeoutId);
  }
}

async function fetchJsonFromCandidates(path, init, fallbackMessage) {
  const urls = buildLiveApiUrls(path);
  const errors = [];

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, init);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `${fallbackMessage} (${response.status})`);
      }

      return response.json();
    } catch (error) {
      errors.push(`${url.origin}: ${error.message}`);
    }
  }

  throw new Error(`${fallbackMessage} Tried ${errors.join(" | ")}`);
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

function parseNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toCad(value, usdToCadRate = FALLBACK_USD_TO_CAD_RATE) {
  const numericValue = parseNumber(value);
  return numericValue ? Number((numericValue * usdToCadRate).toFixed(2)) : null;
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

function rankMatch(candidateParts, query) {
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

function buildPokemonHeaders() {
  const apiKey = import.meta.env.VITE_POKEMONTCG_API_KEY;
  return apiKey ? { "X-Api-Key": apiKey } : {};
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

function buildPokemonQueries(query) {
  const trimmedQuery = String(query || "").trim();
  const terms = trimmedQuery.split(/\s+/).filter(Boolean);
  const firstTerm = terms[0];

  return uniqueBy(
    [
      trimmedQuery ? `!name:"${trimmedQuery}"` : null,
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
  url.searchParams.set("select", "id,name,number,rarity,images,set,tcgplayer");

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

async function searchPokemonBrowser(query, limit) {
  const cards = [];
  const searchQueries = buildPokemonQueries(query);

  for (const searchQuery of searchQueries) {
    const results = await fetchPokemonQuery(searchQuery, limit);
    cards.push(...results);

    if (cards.length >= limit) {
      break;
    }
  }

  const rankedCards = uniqueBy(cards, (card) => card.id).sort((left, right) => {
    const rightScore = rankMatch(
      [right.name, right.set?.name, right.number, right.rarity],
      query,
    );
    const leftScore = rankMatch(
      [left.name, left.set?.name, left.number, left.rarity],
      query,
    );
    return rightScore - leftScore;
  });

  return {
    providerLabel: "Pokemon TCG API / Browser Fallback",
    results: rankedCards.slice(0, limit).map((card) => {
      const chosenPrice = pickPokemonPrice(card);
      return {
        id: `pokemon-${card.id}`,
        provider: "pokemon-tcg-api",
        providerLabel: "Pokemon TCG API / Browser Fallback",
        title: card.name,
        setName: card.set?.name || "Unknown set",
        rarity: card.rarity || "Unknown rarity",
        imageUrl: card.images?.large || card.images?.small || "",
        marketPrice: toCad(chosenPrice.usdValue),
        marketPriceCurrency: "CAD",
        originalMarketPriceUsd: chosenPrice.usdValue,
        originalMarketPriceCurrency: "USD",
        priceHistory: [],
        language: "English",
        sourceUrl: card.tcgplayer?.url || "",
        printLabel: card.number ? `#${card.number}` : chosenPrice.label,
        description: [
          card.set?.name,
          card.rarity,
          card.number ? `#${card.number}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      };
    }),
    note: `Using direct Pokemon TCG API fallback. CAD values use fallback USD/CAD ${FALLBACK_USD_TO_CAD_RATE}.`,
  };
}

async function resolveScryfallName(query) {
  const url = new URL(SCRYFALL_NAMED_ENDPOINT);
  url.searchParams.set("fuzzy", query);

  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/json",
    },
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
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Scryfall search failed.");
  }

  return response.json();
}

async function searchMagicBrowser(query, limit, language = "english") {
  const canonicalName = await resolveScryfallName(query);
  const isJapanese = normalizeLanguage(language) === "japanese";
  const searchQueries = uniqueBy(
    [
      isJapanese && canonicalName ? `!"${canonicalName}" lang:ja` : null,
      isJapanese && canonicalName ? `"${canonicalName}" lang:ja` : null,
      isJapanese ? `lang:ja ${query}` : null,
      isJapanese ? `printed:${query} lang:ja` : null,
      canonicalName ? `!"${canonicalName}"` : null,
      canonicalName || null,
      query,
    ].filter(Boolean),
    (item) => item,
  );

  let data = null;
  for (const searchQuery of searchQueries) {
    try {
      data = await fetchScryfallSearch(searchQuery);
      if (data?.data?.length) {
        break;
      }
    } catch {
      // Fall through to the next query attempt.
    }
  }

  if (!data?.data?.length) {
    throw new Error("Scryfall search failed.");
  }

  const rankedCards = [...data.data].sort((left, right) => {
    const rightScore = rankMatch(
      [right.name, right.set_name, right.collector_number, right.type_line],
      query,
    );
    const leftScore = rankMatch(
      [left.name, left.set_name, left.collector_number, left.type_line],
      query,
    );
    return rightScore - leftScore;
  });

  return {
    providerLabel: "Scryfall Browser Fallback",
    results: rankedCards.slice(0, limit).map((card) => {
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
        providerLabel: isJapanese ? "Scryfall Japanese Browser Fallback" : "Scryfall Browser Fallback",
        title: isJapanese ? card.printed_name || card.name : card.name,
        setName: card.set_name || "Unknown set",
        rarity: card.rarity
          ? card.rarity[0].toUpperCase() + card.rarity.slice(1)
          : "Unknown rarity",
        imageUrl,
        marketPrice: toCad(usdPrice),
        marketPriceCurrency: "CAD",
        originalMarketPriceUsd: usdPrice,
        originalMarketPriceCurrency: "USD",
        priceHistory: [],
        language: card.lang === "ja" ? "Japanese" : "English",
        sourceUrl: card.scryfall_uri || card.uri || "",
        printLabel: card.collector_number
          ? `${card.set?.toUpperCase()} #${card.collector_number}`
          : card.set?.toUpperCase(),
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
      };
    }),
    note: `Using direct Scryfall fallback. CAD values use fallback USD/CAD ${FALLBACK_USD_TO_CAD_RATE}.`,
  };
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
    ? `https://en.onepiece-cardgame.com/images/cardlist/card/${String(card.card_set_id).toUpperCase()}.png`
    : "";
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

async function searchOnePieceBrowser(query, limit) {
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
    const rightScore = rankMatch(
      [right.card_name, right.card_set_id, right.card_image_id, right.set_name],
      query,
    );
    const leftScore = rankMatch(
      [left.card_name, left.card_set_id, left.card_image_id, left.set_name],
      query,
    );

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return (parseNumber(right.market_price) || 0) - (parseNumber(left.market_price) || 0);
  });

  if (!rankedCards.length) {
    throw new Error("No One Piece results were returned.");
  }

  return {
    providerLabel: "OPTCG API / Browser Fallback",
    results: rankedCards.slice(0, limit).map((card) => {
      const usdPrice = parseNumber(card.market_price) || parseNumber(card.inventory_price);

      return {
        id: `one-piece-${card.card_image_id || card.card_set_id || card.card_name}`,
        provider: "optcgapi",
        providerLabel: "OPTCG API / Browser Fallback",
        title: card.card_name || "Unknown card",
        setName: card.set_name || "Unknown set",
        rarity: card.rarity || "Unknown rarity",
        imageUrl: getOnePieceImageUrl(card),
        marketPrice: toCad(usdPrice),
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
    }),
    note: `Using direct One Piece API fallback. CAD values use fallback USD/CAD ${FALLBACK_USD_TO_CAD_RATE}.`,
  };
}

async function searchViaProxy(game, query, limit, language = "english") {
  const [url] = buildLiveApiUrls(LIVE_SEARCH_PATH);
  url.searchParams.set("game", normalizeGameName(game));
  url.searchParams.set("language", normalizeLanguage(language));
  url.searchParams.set("query", String(query || "").trim());
  url.searchParams.set("limit", String(limit));

  return fetchJsonFromCandidates(
    `${LIVE_SEARCH_PATH}?${url.searchParams.toString()}`,
    undefined,
    "Live card search failed.",
  );
}

export function supportsLiveSearch(game) {
  return ["pokemon", "magic", "one-piece"].includes(normalizeGameName(game));
}

export async function fetchExchangeRate() {
  try {
    return await fetchJsonFromCandidates(
      EXCHANGE_RATE_PATH,
      undefined,
      "Exchange rate fetch failed.",
    );
  } catch {
    return {
      usdToCadRate: FALLBACK_USD_TO_CAD_RATE,
      asOf: null,
      source: "Fallback",
    };
  }
}

export async function fetchLocalEvents() {
  return fetchJsonFromCandidates(
    LOCAL_EVENTS_PATH,
    undefined,
    "Local events fetch failed.",
  );
}

export async function searchCardPrintings({ game, query, limit = 24, language = "english" }) {
  const normalizedGame = normalizeGameName(game);
  const normalizedLanguage = normalizeLanguage(language);

  try {
    const proxiedResult = await searchViaProxy(normalizedGame, query, limit, normalizedLanguage);

    if (normalizedGame === "one-piece" && !(proxiedResult.results || []).length) {
      const fallback = await searchOnePieceBrowser(query, limit);
      return fallback.results.length ? fallback : proxiedResult;
    }

    return proxiedResult;
  } catch (proxyError) {
    if (normalizedGame === "pokemon" && normalizedLanguage === "japanese") {
      throw new Error(
        `${proxyError.message} Japanese Pokemon autofill currently requires the live server search.`,
      );
    }

    if (normalizedGame === "one-piece" && normalizedLanguage === "japanese") {
      throw new Error(
        `${proxyError.message} Japanese One Piece autofill currently requires the live server search.`,
      );
    }

    if (normalizedGame === "pokemon") {
      const fallback = await searchPokemonBrowser(query, limit);
      return {
        ...fallback,
        note: `${proxyError.message} ${fallback.note}`,
      };
    }

    if (normalizedGame === "magic") {
      const fallback = await searchMagicBrowser(query, limit, normalizedLanguage);
      return {
        ...fallback,
        note: `${proxyError.message} ${fallback.note}`,
      };
    }

    if (normalizedGame === "one-piece") {
      const fallback = await searchOnePieceBrowser(query, limit);
      return {
        ...fallback,
        note: `${proxyError.message} ${fallback.note}`,
      };
    }

    throw proxyError;
  }
}

export async function fetchSourceSalesForPrinting({
  game,
  language = "english",
  title,
  setName = "",
  printLabel = "",
  rarity = "",
}) {
  const normalizedGame = normalizeGameName(game);
  const normalizedLanguage = normalizeLanguage(language);
  const path = `${SOURCE_SALES_PATH}?${new URLSearchParams({
    game: normalizedGame,
    language: normalizedLanguage,
    title: String(title || "").trim(),
    setName: String(setName || "").trim(),
    printLabel: String(printLabel || "").trim(),
    rarity: String(rarity || "").trim(),
  }).toString()}`;

  return fetchJsonFromCandidates(path, undefined, "Recent sold lookup failed.");
}
