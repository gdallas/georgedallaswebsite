const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const blockedRedirectHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
export const publishingStatuses = ["draft", "in_review", "scheduled", "published", "archived"];
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

  if (blockedRedirectHosts.has(url.hostname.toLowerCase())) {
    return "Redirect destination cannot point to a local or private host.";
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

  if (status === "published") {
    if (!data.publishedAt) {
      return "Published content requires a publishedAt date.";
    }

    for (const field of requiredMetadata) {
      if (typeof data[field] !== "string" || data[field].trim().length === 0) {
        return `Published content requires ${field}.`;
      }
    }
  }

  if (status === "scheduled") {
    if (!data.publishedAt) {
      return "Scheduled content requires a future publishedAt date.";
    }

    if (new Date(data.publishedAt) <= now) {
      return "Scheduled content requires a future publishedAt date.";
    }
  }

  return true;
}

export function isPublicBuildVisible(doc, now = new Date()) {
  if (doc?.status !== "published" || doc?.visibility !== "public" || !doc?.publishedAt) {
    return false;
  }

  return new Date(doc.publishedAt) <= new Date(now);
}

export function publicBuildWhere(now = new Date()) {
  return {
    and: [
      {
        status: {
          equals: "published"
        }
      },
      {
        visibility: {
          equals: "public"
        }
      },
      {
        publishedAt: {
          less_than_equal: new Date(now).toISOString()
        }
      }
    ]
  };
}

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
