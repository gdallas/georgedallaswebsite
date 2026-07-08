const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const blockedLocalHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export const allowedMediaMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "application/pdf"];
// 10 MB (George, 2026-07-08). This exceeds the Lambda Function URL's ~6 MB event
// cap, so media now uploads straight from the browser to S3 with a presigned URL
// (storage/s3.ts clientUploads:true) — the file bytes never pass through the
// Lambda, so the old ceiling no longer applies. The metadata create still runs
// server-side, so this limit is enforced in validateMediaFileMetadata.
export const maxMediaUploadBytes = 10 * 1024 * 1024;
export const maxMediaUploadMb = Math.floor(maxMediaUploadBytes / (1024 * 1024));
export const publishingStatuses = ["draft", "in_review", "scheduled", "published", "archived"];
export const listingStatuses = ["draft", "published", "archived"];
export const visibilityStates = ["public", "unlisted", "private"];

export function validateSlug(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "Slug is required.";
  }

  if (!slugPattern.test(value)) {
    return "Slug must use lowercase letters, numbers, and single hyphens only.";
  }

  return true;
}

export function validateRedirectSource(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "Redirect source is required.";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "Redirect source must be an internal path that starts with one slash.";
  }

  if (value.includes(" ") || value.includes("?") || value.includes("#")) {
    return "Redirect source must be a clean path without spaces, query strings, or fragments.";
  }

  return true;
}

export function validateRedirectDestination(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "Redirect destination is required.";
  }

  if (value.startsWith("/")) {
    if (value.startsWith("//")) {
      return "Protocol-relative redirect destinations are not allowed.";
    }

    return true;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return "Redirect destination must be an internal path or an http(s) URL.";
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return "Redirect destination must use http or https.";
  }

  if (blockedLocalHosts.has(url.hostname.toLowerCase())) {
    return "Redirect destination cannot point to a local or private host.";
  }

  return true;
}

export function validateOptionalExternalUrl(value) {
  if (value == null || (typeof value === "string" && value.trim().length === 0)) {
    return true;
  }

  return validateHttpUrl(value);
}

export function validateLinkUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "Link URL is required.";
  }

  if (value.startsWith("/")) {
    if (value.startsWith("//")) {
      return "Protocol-relative link URLs are not allowed.";
    }

    return true;
  }

  return validateHttpUrl(value);
}

function validateHttpUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return "URL must be a valid http(s) URL.";
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return "URL must use http or https.";
  }

  if (blockedLocalHosts.has(url.hostname.toLowerCase())) {
    return "URL cannot point to a local or private host.";
  }

  return true;
}

export function validateMediaAltText(value, siblingData = {}) {
  if (siblingData.reviewStatus !== "public") {
    return true;
  }

  if (siblingData.decorative === true) {
    return true;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return true;
  }

  return "Public media requires alt text unless it is marked decorative.";
}

export function validateMediaFileMetadata(data = {}) {
  if (data.mimeType && !allowedMediaMimeTypes.includes(data.mimeType)) {
    return "Media file type is not allowed.";
  }

  if (typeof data.filesize === "number" && data.filesize > maxMediaUploadBytes) {
    return `Media file exceeds the ${maxMediaUploadMb} MB upload limit. Resize or compress it, then upload again.`;
  }

  return true;
}

// Review status for a media doc at creation time. Images dropped into the
// editor (or uploaded any other way) without alt text land in the
// needs-alt-text queue immediately, so the dashboard surfaces them instead of
// a content check discovering the gap later. An explicitly chosen non-draft
// status (e.g. the WordPress importer's) is always respected, and the
// decorative flag is the intentional opt-out.
export function initialMediaReviewStatus(data = {}) {
  const provided = data.reviewStatus;

  if (typeof provided === "string" && provided.length > 0 && provided !== "draft") {
    return provided;
  }

  const isImage = typeof data.mimeType === "string" && data.mimeType.startsWith("image/");
  const hasAlt = typeof data.alt === "string" && data.alt.trim().length > 0;

  if (isImage && !hasAlt && data.decorative !== true) {
    return "needs_alt_text";
  }

  return provided || "draft";
}

export function buildMediaStorageKey(collectionPrefix, docPrefix, filename) {
  if (!filename) {
    return undefined;
  }

  const parts = [collectionPrefix, docPrefix, filename].filter(Boolean);
  return parts.map((part) => String(part).replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/");
}

export function buildMediaPublicUrl(publicBaseUrl, collectionPrefix, docPrefix, filename) {
  const key = buildMediaStorageKey(collectionPrefix, docPrefix, filename);

  if (!key) {
    return publicBaseUrl;
  }

  return `${publicBaseUrl.replace(/\/+$/g, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

// Friendly names for the fields a save can be missing, so the error names them
// the way they read on the form rather than by their internal keys.
const publishFieldLabels = {
  publishedAt: "a publish date",
  excerpt: "an excerpt",
  seoTitle: "an SEO title",
  seoDescription: "an SEO description"
};

// "a" -> "a"; "a, b" -> "a and b"; "a, b, c" -> "a, b, and c".
function joinWithAnd(items) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function missingMetadataFields(data, requiredMetadata) {
  return requiredMetadata.filter(
    (field) => typeof data[field] !== "string" || data[field].trim().length === 0
  );
}

export function validatePublishingState(data, options = {}) {
  const status = data?.status;
  const now = options.now ? new Date(options.now) : new Date();
  const requiredMetadata = options.requiredMetadata ?? ["seoTitle", "seoDescription"];

  if (!publishingStatuses.includes(status)) {
    return "Publishing status is invalid.";
  }

  if (!visibilityStates.includes(data?.visibility)) {
    return "Visibility is invalid.";
  }

  // List every unfilled field in one message so a save names all of them at
  // once, not just the first one the writer would hit.
  if (status === "published") {
    const missing = [];
    if (!data.publishedAt) {
      missing.push(publishFieldLabels.publishedAt);
    }
    for (const field of missingMetadataFields(data, requiredMetadata)) {
      missing.push(publishFieldLabels[field] ?? field);
    }
    if (missing.length > 0) {
      return `To publish, fill in ${joinWithAnd(missing)}.`;
    }
  }

  if (status === "scheduled") {
    // Scheduled content must already satisfy the publish requirements so the
    // worker can flip it to published unattended without tripping validation.
    const missing = [];
    if (!data.publishedAt || new Date(data.publishedAt) <= now) {
      missing.push("a future publish date");
    }
    for (const field of missingMetadataFields(data, requiredMetadata)) {
      missing.push(publishFieldLabels[field] ?? field);
    }
    if (missing.length > 0) {
      return `To schedule this, fill in ${joinWithAnd(missing)} so it can publish automatically.`;
    }
  }

  return true;
}

// Public visibility predicates and query filters now live in the shared
// package so the CMS and the public site enforce identical rules.
export {
  isNowPagePublic,
  isPublicBuildVisible,
  isPublicListingVisible,
  publicBuildWhere,
  publicListingWhere
} from "@georgedallas/shared/visibility";

export function estimateReadingTime(data) {
  const text = collectText(data?.body).join(" ").trim();
  const fallbackText = [data?.title, data?.excerpt].filter(Boolean).join(" ");
  const words = (text || fallbackText).split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 225));
}

function collectText(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectText);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entryValue]) => {
      if (key === "url" || key === "id" || key === "relationTo") {
        return [];
      }

      return collectText(entryValue);
    });
  }

  return [];
}
