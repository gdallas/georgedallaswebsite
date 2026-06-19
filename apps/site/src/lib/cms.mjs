import {
  isNowPagePublic,
  isPublicBuildVisible,
  isPublicListingVisible,
  publicBuildWhere,
  publicListingWhere
} from "@georgedallas/shared/visibility";
import { redirectActiveWhere } from "@georgedallas/shared/redirects";

// Centralized, typed data layer for the public site. Every query is filtered
// to published + public content twice over: the request sends a published
// where-clause (the CMS also enforces it server-side), and the returned docs
// are re-checked with the shared visibility predicates before they reach a
// page. Drafts, private, archived, unlisted, and future-scheduled content can
// never be rendered, even if the CMS response is wrong.

export class CmsUnavailableError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "CmsUnavailableError";
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

function resolveBaseUrl(config) {
  const raw = config.baseUrl ?? (typeof process !== "undefined" ? process.env?.CMS_API_URL : undefined);
  if (!raw) {
    throw new CmsUnavailableError("CMS base URL is not configured (set CMS_API_URL or pass baseUrl).");
  }
  return raw.replace(/\/+$/, "");
}

export function encodeWhere(where) {
  const params = new URLSearchParams();

  const walk = (prefix, value) => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(`${prefix}[${index}]`, entry));
    } else if (value && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) {
        walk(`${prefix}[${key}]`, entry);
      }
    } else {
      params.append(prefix, String(value));
    }
  };

  for (const [key, value] of Object.entries(where)) {
    walk(`where[${key}]`, value);
  }

  return params.toString();
}

async function fetchJson(url, config) {
  const fetchImpl = config.fetchImpl ?? fetch;
  let response;
  try {
    response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  } catch (cause) {
    throw new CmsUnavailableError(`Failed to reach the CMS at ${url}.`, { cause });
  }

  if (!response.ok) {
    throw new CmsUnavailableError(`The CMS returned HTTP ${response.status} for ${url}.`);
  }

  return response.json();
}

async function fetchDocs(slug, where, config, extraQuery = "") {
  const base = resolveBaseUrl(config);
  const url = `${base}/api/${slug}?depth=1&limit=100&${encodeWhere(where)}${extraQuery}`;
  const body = await fetchJson(url, config);
  return Array.isArray(body?.docs) ? body.docs : [];
}

export async function getPublishedPosts(config = {}) {
  const now = config.now ?? new Date();
  const docs = await fetchDocs("posts", publicBuildWhere(now), config, "&sort=-publishedAt");
  return docs.filter((doc) => isPublicBuildVisible(doc, now));
}

export async function getPublishedPost(slug, config = {}) {
  const posts = await getPublishedPosts(config);
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getPublishedPages(config = {}) {
  const now = config.now ?? new Date();
  const docs = await fetchDocs("pages", publicBuildWhere(now), config);
  return docs.filter((doc) => isPublicBuildVisible(doc, now));
}

export async function getPublishedPage(slug, config = {}) {
  const pages = await getPublishedPages(config);
  return pages.find((page) => page.slug === slug) ?? null;
}

export async function getPublicProjects(config = {}) {
  const docs = await fetchDocs("projects", publicListingWhere(), config, "&sort=sortOrder");
  return docs.filter(isPublicListingVisible);
}

export async function getPublicLinks(config = {}) {
  const docs = await fetchDocs("links", publicListingWhere(), config, "&sort=sortOrder");
  return docs.filter(isPublicListingVisible);
}

export async function getPublicBooks(config = {}) {
  const docs = await fetchDocs("books", publicListingWhere(), config, "&sort=sortOrder");
  return docs.filter(isPublicListingVisible);
}

export async function getCurrentlyReadingBooks(config = {}) {
  return (await getPublicBooks(config)).filter((book) => book.readingStatus === "reading");
}

export async function getActiveRedirects(config = {}) {
  // Access control also restricts anonymous reads to active redirects; the
  // explicit where keeps it correct for authenticated builds too.
  return fetchDocs("redirects", redirectActiveWhere(), config, "&sort=sourcePath");
}

export async function getNowPage(config = {}) {
  const base = resolveBaseUrl(config);
  const doc = await fetchJson(`${base}/api/globals/now-page?depth=1`, config);
  return isNowPagePublic(doc) ? doc : null;
}

export async function getSiteSettings(config = {}) {
  const base = resolveBaseUrl(config);
  return fetchJson(`${base}/api/globals/site-settings?depth=1`, config);
}
