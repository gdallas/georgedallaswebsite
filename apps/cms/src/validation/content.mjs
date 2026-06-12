const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const blockedRedirectHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

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
