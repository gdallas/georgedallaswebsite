// Redirect graph + safety logic shared by the CMS (save-time loop guard) and
// the public site build (which static-renders the active redirect set). Pure
// and dependency-free so both sides agree on what is servable, loop-free, and
// safe (GDW-033).

// A redirect is servable only when its review lifecycle says "active" and it
// has not been switched off. Imported proposals start as "proposed" and stay
// out of the build until reviewed.
export function redirectActiveWhere() {
  return { status: { equals: "active" }, enabled: { not_equals: false } };
}

// Normalise an internal path: leading slash, no query/hash, no duplicate or
// trailing slashes (so "/a/b/", "a/b", and "/a//b" all compare equal).
export function normalizeRedirectPath(path) {
  if (typeof path !== "string" || path.trim().length === 0) {
    return null;
  }
  let p = path.trim().split(/[?#]/)[0];
  if (!p.startsWith("/")) {
    p = `/${p}`;
  }
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) {
    p = p.replace(/\/+$/, "");
  }
  return p || "/";
}

// Block open redirects: only internal paths, or absolute http(s) URLs to an
// explicitly allowed host, are safe to emit. Protocol-relative ("//evil.com")
// and off-allowlist hosts are rejected.
export function isSafeRedirectDestination(destination, options = {}) {
  if (typeof destination !== "string" || destination.trim().length === 0) {
    return false;
  }
  const dest = destination.trim();
  if (dest.startsWith("//")) {
    return false;
  }
  if (dest.startsWith("/")) {
    return true;
  }
  let url;
  try {
    url = new URL(dest);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return false;
  }
  const allowedHosts = options.allowedHosts ?? [];
  return allowedHosts.includes(url.hostname);
}

function destinationNode(destination) {
  // Internal paths participate in the graph (they may be another redirect's
  // source); external URLs are terminal.
  if (typeof destination === "string" && destination.startsWith("/") && !destination.startsWith("//")) {
    return normalizeRedirectPath(destination);
  }
  return null;
}

// Return the set of normalised source paths that sit on a redirect loop —
// self-redirects and longer cycles (A -> B -> A). Used to block them.
export function detectRedirectLoops(redirects) {
  const map = new Map();
  for (const r of Array.isArray(redirects) ? redirects : []) {
    const source = normalizeRedirectPath(r?.sourcePath);
    if (source) {
      map.set(source, destinationNode(r?.destination));
    }
  }

  const looping = new Set();
  for (const start of map.keys()) {
    const seen = new Set();
    let cur = start;
    while (cur != null && map.has(cur)) {
      if (seen.has(cur)) {
        for (const node of seen) {
          looping.add(node);
        }
        break;
      }
      seen.add(cur);
      cur = map.get(cur); // null when the destination is external/terminal
    }
  }
  return looping;
}

// The redirects the public site should actually serve: active + enabled, with
// a valid source, a safe destination, no self/loop, de-duplicated by source.
export function selectServableRedirects(redirects, options = {}) {
  const list = Array.isArray(redirects) ? redirects : [];
  const active = list.filter((r) => r && (r.status ?? "active") === "active" && r.enabled !== false);
  const loops = detectRedirectLoops(active);

  const out = [];
  const seenSources = new Set();
  for (const r of active) {
    const source = normalizeRedirectPath(r.sourcePath);
    const destination = typeof r.destination === "string" ? r.destination.trim() : "";
    if (!source || !destination) {
      continue;
    }
    if (destination.startsWith("/") && source === normalizeRedirectPath(destination)) {
      continue; // self-redirect
    }
    if (loops.has(source)) {
      continue;
    }
    if (!isSafeRedirectDestination(destination, options)) {
      continue;
    }
    if (seenSources.has(source)) {
      continue;
    }
    seenSources.add(source);
    out.push({ source, destination, statusCode: String(r.statusCode ?? "301") });
  }
  return out;
}

// Follow the (loop-free) redirect chain from a path to its final destination.
// Returns { destination, hops, loop }. Used to verify legacy URLs resolve.
export function resolveRedirectChain(redirects, path, options = {}) {
  const maxHops = options.maxHops ?? 10;
  const map = new Map();
  for (const r of selectServableRedirects(redirects, options)) {
    map.set(r.source, r.destination);
  }

  let cur = normalizeRedirectPath(path);
  const seen = new Set();
  let hops = 0;
  while (cur && cur.startsWith("/") && map.has(cur)) {
    if (seen.has(cur) || hops >= maxHops) {
      return { destination: null, hops, loop: true };
    }
    seen.add(cur);
    cur = map.get(cur);
    if (cur.startsWith("/")) {
      cur = normalizeRedirectPath(cur);
    }
    hops += 1;
  }
  return { destination: hops > 0 ? cur : null, hops, loop: false };
}
