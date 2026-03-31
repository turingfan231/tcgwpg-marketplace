import { useEffect } from "react";

const DEFAULT_DESCRIPTION =
  "TCG Wpg Marketplace is a local Winnipeg TCG marketplace for buying, selling, trading, and planning meetups.";

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    document.head.appendChild(element);
    return;
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function upsertLink(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("link");
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    document.head.appendChild(element);
    return;
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function upsertJsonLd(id, value) {
  let element = document.head.querySelector(`script[data-seo-id="${id}"]`);
  if (!value) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("script");
    element.type = "application/ld+json";
    element.dataset.seoId = id;
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(value);
}

function resolveAssetUrl(baseUrl, value) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return value;
  }
}

export default function SeoHead({
  canonicalPath = "/",
  description = DEFAULT_DESCRIPTION,
  image,
  jsonLd = null,
  preloadImage = null,
  title,
  type = "website",
}) {
  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return undefined;
    }

    const baseUrl =
      window.location.origin?.replace(/\/$/, "") || "https://tcgwpg.com";
    const canonicalUrl = `${baseUrl}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
    const resolvedTitle = title ? `${title} | TCG Wpg Marketplace` : "TCG Wpg Marketplace";
    const resolvedImage =
      resolveAssetUrl(baseUrl, image) || `${baseUrl}/brand/apple-touch-icon.png`;
    const resolvedPreloadImage = resolveAssetUrl(baseUrl, preloadImage);

    document.title = resolvedTitle;

    upsertMeta('meta[name="description"]', {
      name: "description",
      content: description,
    });
    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: resolvedTitle,
    });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: description,
    });
    upsertMeta('meta[property="og:type"]', {
      property: "og:type",
      content: type,
    });
    upsertMeta('meta[property="og:url"]', {
      property: "og:url",
      content: canonicalUrl,
    });
    upsertMeta('meta[property="og:image"]', {
      property: "og:image",
      content: resolvedImage,
    });
    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: resolvedTitle,
    });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: description,
    });
    upsertMeta('meta[name="twitter:image"]', {
      name: "twitter:image",
      content: resolvedImage,
    });

    upsertLink('link[rel="canonical"]', {
      rel: "canonical",
      href: canonicalUrl,
    });
    if (resolvedPreloadImage) {
      upsertLink('link[rel="preload"][as="image"][data-seo-preload="hero"]', {
        rel: "preload",
        as: "image",
        href: resolvedPreloadImage,
        fetchpriority: "high",
        "data-seo-preload": "hero",
      });
    } else {
      document.head
        .querySelector('link[rel="preload"][as="image"][data-seo-preload="hero"]')
        ?.remove();
    }
    upsertJsonLd("primary", jsonLd);

    return undefined;
  }, [canonicalPath, description, image, jsonLd, preloadImage, title, type]);

  return null;
}
