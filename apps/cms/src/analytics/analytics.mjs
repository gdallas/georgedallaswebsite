// Privacy-friendly analytics (GDW-048). Pure helpers behind the beacon
// collector and the admin summary. What we keep is deliberately minimal: the
// visited path, the *domain* a visitor came from (never the full referrer URL),
// a coarse device type derived from the User-Agent, an optional search query
// (only on /search), and a timestamp. No IP address, no cookies, no ad IDs, no
// cross-site identifiers — nothing that profiles an individual.

const MAX_PATH = 512;
const MAX_QUERY = 200;

// Keep only a clean site path; reject anything that isn't a rooted path so the
// table can't be stuffed with absolute URLs or junk.
export function normalizePath(value) {
  if (typeof value !== "string") {
    return null;
  }
  const path = value.split("#")[0].trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.length > MAX_PATH) {
    return null;
  }
  return path;
}

// The referring *domain* only (host, lowercased, no path/query), or null. Own
// hostnames collapse to null so internal navigation isn't counted as a referrer.
export function referrerDomain(referrer, ownHosts = []) {
  if (typeof referrer !== "string" || referrer.length === 0) {
    return null;
  }
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (!host || ownHosts.includes(host)) {
      return null;
    }
    return host;
  } catch {
    return null;
  }
}

// Coarse device class from the User-Agent. No fingerprinting — just three
// buckets for a rough desktop/mobile/tablet split.
export function deviceTypeFromUa(ua) {
  const s = typeof ua === "string" ? ua.toLowerCase() : "";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) {
    return "tablet";
  }
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(s)) {
    return "mobile";
  }
  return "desktop";
}

// Build the stored event from a beacon body + request headers. Returns null if
// the payload isn't a usable page view (so the collector can 204 and drop it).
export function parseBeacon(body = {}, { userAgent, ownHosts } = {}) {
  const path = normalizePath(body.path);
  if (!path) {
    return null;
  }
  let query = null;
  if (path === "/search" && typeof body.query === "string") {
    const trimmed = body.query.trim().slice(0, MAX_QUERY);
    query = trimmed.length > 0 ? trimmed : null;
  }
  return {
    path,
    referrerDomain: referrerDomain(body.referrer, ownHosts),
    deviceType: deviceTypeFromUa(userAgent),
    query
  };
}

function topCounts(items, key, limit = 10) {
  const counts = new Map();
  for (const item of items) {
    const value = item?.[key];
    if (value == null || value === "") {
      continue;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Aggregate a window of events into the admin-facing summary. Returns only
// counts — never anything that identifies a visitor.
export function summarizeEvents(events = []) {
  const list = Array.isArray(events) ? events : [];
  const posts = list.filter((e) => typeof e.path === "string" && e.path.startsWith("/writing/"));
  const projects = list.filter((e) => typeof e.path === "string" && e.path.startsWith("/projects"));
  const searches = list.filter((e) => e.query);
  return {
    totalViews: list.length,
    topPages: topCounts(list, "path"),
    topPosts: topCounts(posts, "path"),
    topProjects: topCounts(projects, "path"),
    topReferrers: topCounts(list, "referrerDomain"),
    topSearches: topCounts(searches, "query"),
    devices: topCounts(list, "deviceType", 3)
  };
}
