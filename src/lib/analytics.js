const EVENT_TARGET = "tcgwpg:analytics";

function normalizePayload(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

export function trackEvent(name, payload = {}) {
  if (typeof window === "undefined" || !name) {
    return;
  }

  const detail = {
    name,
    payload: normalizePayload(payload),
    timestamp: new Date().toISOString(),
  };

  window.dispatchEvent(new CustomEvent(EVENT_TARGET, { detail }));

  if (window.dataLayer && Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: name,
      ...detail.payload,
    });
  }
}

export function subscribeToAnalytics(listener) {
  if (typeof window === "undefined" || typeof listener !== "function") {
    return () => {};
  }

  const handler = (event) => {
    listener(event.detail);
  };

  window.addEventListener(EVENT_TARGET, handler);
  return () => window.removeEventListener(EVENT_TARGET, handler);
}
