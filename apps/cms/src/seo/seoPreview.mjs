// SEO/social preview derivation (GDW-038). Pure and dependency-free so the admin
// preview component and unit tests share one source of truth, and so the preview
// matches what the public site actually renders (mirrors apps/site/src/lib/seo.mjs:
// effective title/description, clean canonical URL, and the social-image fallback
// chain). Length guidance is advisory only — it never blocks saving.

export const DEFAULT_OG_IMAGE = "/brand/cedar-circuitry-wordmark.svg";

// Recommended character ranges. Outside these we show a hint, not an error.
export const seoLimits = {
  title: { min: 30, max: 60 },
  description: { min: 70, max: 160 }
};

// Public path for a document by collection (clean URLs, matching the site routes).
export function publicPathFor(collection, slug) {
  const clean = String(slug ?? "").trim();
  if (collection === "posts") {
    return `/writing/${clean}`;
  }
  return `/${clean}`;
}

function trimTrailingSlash(value) {
  return String(value ?? "").replace(/\/+$/, "");
}

export function effectiveTitle(doc = {}) {
  const seo = typeof doc.seoTitle === "string" ? doc.seoTitle.trim() : "";
  return seo || (typeof doc.title === "string" ? doc.title : "") || "";
}

export function effectiveDescription(doc = {}) {
  const seo = typeof doc.seoDescription === "string" ? doc.seoDescription.trim() : "";
  if (seo) {
    return seo;
  }
  return (typeof doc.excerpt === "string" ? doc.excerpt.trim() : "") || "";
}

// Canonical URL: explicit canonicalUrl wins; otherwise derive the clean public URL.
export function canonicalFor(doc = {}, { siteUrl = "", collection = "pages" } = {}) {
  const explicit = typeof doc.canonicalUrl === "string" ? doc.canonicalUrl.trim() : "";
  if (explicit) {
    return explicit;
  }
  return `${trimTrailingSlash(siteUrl)}${publicPathFor(collection, doc.slug)}`;
}

// Resolve a media value (an object with `url`, or a bare URL string) to an
// absolute URL using the media base when the stored URL is relative.
function resolveMediaUrl(media, mediaBaseUrl) {
  const url = typeof media === "string" ? media : media?.url;
  if (typeof url !== "string" || url.trim() === "") {
    return null;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${trimTrailingSlash(mediaBaseUrl)}${url.startsWith("/") ? url : `/${url}`}`;
}

// Social image with the documented fallback chain:
// socialImage -> featuredImage -> default OG image. Returns the URL plus which
// source supplied it so the preview can label fallbacks.
export function socialImageUrl(doc = {}, { mediaBaseUrl = "", siteUrl = "", defaultImage = DEFAULT_OG_IMAGE } = {}) {
  const social = resolveMediaUrl(doc.socialImage, mediaBaseUrl);
  if (social) {
    return { url: social, source: "social" };
  }
  const featured = resolveMediaUrl(doc.featuredImage, mediaBaseUrl);
  if (featured) {
    return { url: featured, source: "featured" };
  }
  return { url: `${trimTrailingSlash(siteUrl)}${defaultImage}`, source: "default" };
}

export function lengthStatus(value, { min, max } = {}) {
  const length = typeof value === "string" ? value.trim().length : 0;
  if (length === 0 || length < min) {
    return { length, status: "short" };
  }
  if (length > max) {
    return { length, status: "long" };
  }
  return { length, status: "ok" };
}

// Everything the preview component renders.
export function buildSeoPreview(doc = {}, { collection = "pages", siteUrl = "", mediaBaseUrl = "" } = {}) {
  const title = effectiveTitle(doc);
  const description = effectiveDescription(doc);
  const canonical = canonicalFor(doc, { siteUrl, collection });
  const image = socialImageUrl(doc, { mediaBaseUrl, siteUrl });
  return {
    title,
    description,
    canonical,
    image,
    titleLength: lengthStatus(title, seoLimits.title),
    descriptionLength: lengthStatus(description, seoLimits.description)
  };
}
