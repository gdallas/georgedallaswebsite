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

const TRANSIENT_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 2_000;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAttempts(config) {
  const attempts = Number(config.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS);
  return Number.isFinite(attempts) ? Math.max(1, attempts) : DEFAULT_RETRY_ATTEMPTS;
}

function retryDelayMs(config) {
  const delayMs = Number(config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
  return Number.isFinite(delayMs) ? Math.max(0, delayMs) : DEFAULT_RETRY_DELAY_MS;
}

async function fetchJson(url, config) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const attempts = retryAttempts(config);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(url, { headers: { Accept: "application/json" } });
    } catch (cause) {
      lastError = new CmsUnavailableError(`Failed to reach the CMS at ${url}.`, { cause });
    }

    if (response?.ok) {
      return response.json();
    }

    if (response && !response.ok) {
      lastError = new CmsUnavailableError(`The CMS returned HTTP ${response.status} for ${url}.`);
      if (!TRANSIENT_STATUS_CODES.has(response.status)) {
        throw lastError;
      }
    }

    if (attempt < attempts) {
      await sleep(retryDelayMs(config));
    }
  }

  throw lastError;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

async function fetchDocs(slug, where, config, extraQuery = "") {
  const base = resolveBaseUrl(config);
  const docs = [];

  // Follow Payload's pagination so a collection past one page can never be
  // silently truncated out of the static build (writing index, RSS, sitemap).
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `${base}/api/${slug}?depth=1&limit=${PAGE_SIZE}&page=${page}&${encodeWhere(where)}${extraQuery}`;
    const body = await fetchJson(url, config);
    const pageDocs = Array.isArray(body?.docs) ? body.docs : [];
    docs.push(...pageDocs);
    if (!body?.hasNextPage || pageDocs.length === 0) {
      return docs;
    }
  }

  throw new CmsUnavailableError(
    `The CMS returned more than ${MAX_PAGES * PAGE_SIZE} documents for ${slug}; refusing to build with truncated content.`
  );
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

export async function getPublicTimelineEntries(config = {}) {
  const docs = await fetchDocs("timeline-entries", publicListingWhere(), config, "&sort=-eventDate,sortOrder");
  return docs.filter(isPublicListingVisible);
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
