import * as cms from "./cms.mjs";
import { toRedirectRoutes } from "./redirects.mjs";

// Astro-facing content loaders. When CMS_API_URL is not configured (e.g. the
// CI build that only validates the Astro build), pages render empty states
// instead of failing. When it is configured, the underlying cms.mjs helpers
// fetch real content and throw CmsUnavailableError if the CMS is unreachable,
// so a real deploy fails loudly rather than publishing a half-empty site.

let warned = false;

function cmsConfigured() {
  return typeof process !== "undefined" && Boolean(process.env?.CMS_API_URL);
}

function warnOnce() {
  if (!warned) {
    warned = true;
    console.warn("[site] CMS_API_URL is not set — rendering public pages with empty content.");
  }
}

export async function loadSiteSettings() {
  if (!cmsConfigured()) {
    warnOnce();
    return null;
  }
  return cms.getSiteSettings();
}

export async function loadPublishedPosts() {
  if (!cmsConfigured()) {
    warnOnce();
    return [];
  }
  return cms.getPublishedPosts();
}

export async function loadPublishedPost(slug) {
  if (!cmsConfigured()) {
    warnOnce();
    return null;
  }
  return cms.getPublishedPost(slug);
}

export async function loadPublishedPage(slug) {
  if (!cmsConfigured()) {
    warnOnce();
    return null;
  }
  return cms.getPublishedPage(slug);
}

export async function loadProjects() {
  if (!cmsConfigured()) {
    warnOnce();
    return [];
  }
  return cms.getPublicProjects();
}

export async function loadLinks() {
  if (!cmsConfigured()) {
    warnOnce();
    return [];
  }
  return cms.getPublicLinks();
}

export async function loadBooks() {
  if (!cmsConfigured()) {
    warnOnce();
    return [];
  }
  return cms.getPublicBooks();
}

export async function loadCurrentlyReadingBooks() {
  if (!cmsConfigured()) {
    warnOnce();
    return [];
  }
  return cms.getCurrentlyReadingBooks();
}

export async function loadNowPage() {
  if (!cmsConfigured()) {
    warnOnce();
    return null;
  }
  return cms.getNowPage();
}

// getStaticPaths source for the catch-all redirect route: the active redirects,
// filtered to safe/loop-free and mapped to Astro path entries. Empty when the
// CMS is not configured (CI build) so the route simply emits nothing.
export async function loadActiveRedirectRoutes() {
  if (!cmsConfigured()) {
    warnOnce();
    return [];
  }
  const redirects = await cms.getActiveRedirects();
  return toRedirectRoutes(redirects);
}
