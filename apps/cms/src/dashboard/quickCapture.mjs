// Pure helpers behind the dashboard's quick-capture cards (GDW-063): start a
// post, update the Now page, add a book, or upload images straight from the
// landing screen. The client component builds request bodies here so the
// rules (slug shape, required fields, image limits) stay unit-testable.

import { allowedMediaMimeTypes, maxMediaUploadBytes } from "../validation/content.mjs";

// Mirrors the slug rules validateSlug enforces (lowercase alphanumerics with
// single hyphens), so a capture-created draft never bounces on its slug.
export function slugifyTitle(title) {
  const slug = String(title ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "untitled";
}

// Slugs are unique; when a capture title collides with an existing post the
// card retries once with a short time-based suffix instead of failing.
export function uniqueSlugVariant(slug, seed = Date.now()) {
  return `${slug}-${seed.toString(36)}`;
}

export function buildDraftPostBody(title) {
  const trimmed = String(title ?? "").trim();

  if (!trimmed) {
    return null;
  }

  // Status and visibility come from the collection defaults (draft/private),
  // so a captured post can never accidentally go live.
  return { title: trimmed, slug: slugifyTitle(trimmed) };
}

export function buildBookBody(title, author) {
  const trimmedTitle = String(title ?? "").trim();
  const trimmedAuthor = String(author ?? "").trim();

  if (!trimmedTitle || !trimmedAuthor) {
    return null;
  }

  // readingStatus, status, visibility, and sortOrder all have safe defaults.
  return { title: trimmedTitle, author: trimmedAuthor };
}

export function buildNowUpdateBody(currentFocus) {
  const trimmed = String(currentFocus ?? "").trim();

  if (!trimmed) {
    return null;
  }

  // A partial global update: the other Now fields and its publish status are
  // left exactly as they are.
  return { currentFocus: trimmed };
}

export const quickImageMimeTypes = allowedMediaMimeTypes.filter((type) => type.startsWith("image/"));

// Client-side gate for the drop card: the Lambda Function URL rejects large
// bodies before app code runs (see media-storage runbook), so the friendly
// message has to fire in the browser.
export function validateQuickImage(file = {}) {
  const label = file.name || "That file";

  if (!quickImageMimeTypes.includes(file.type)) {
    return `${label} is not an image the library accepts (JPEG, PNG, WebP, GIF, or SVG).`;
  }

  if (typeof file.size === "number" && file.size > maxMediaUploadBytes) {
    const maxMb = Math.floor(maxMediaUploadBytes / (1024 * 1024));
    return `${label} is larger than ${maxMb} MB. Resize or compress it, then try again.`;
  }

  return true;
}

// Payload REST errors arrive as { errors: [{ message }] }; surface the first
// message so validation failures (duplicate slug, bad file) name themselves.
export function payloadErrorMessage(body, fallback) {
  const message = body?.errors?.[0]?.message;
  return typeof message === "string" && message.length > 0 ? message : fallback;
}
