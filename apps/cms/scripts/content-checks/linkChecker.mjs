// HTTP side of the broken-link checker (GDW-037). The network is injected
// (fetchImpl) so the orchestration — HEAD/GET fallback, timeouts, per-host rate
// limiting, and minimal robots.txt respect — is unit-testable with a mock.

import { classifyLink } from "../../src/health/links.mjs";

const userAgent = "gdw-link-checker/1.0 (+https://georgedallas.com)";

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

// Fetch a single URL: HEAD first (cheap), falling back to GET when the server
// rejects HEAD (405/501) or errors. Returns { status, error }.
export async function checkUrl(url, { fetchImpl = fetch, timeoutMs = 10_000 } = {}) {
  for (const method of ["HEAD", "GET"]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": userAgent }
      });
      clearTimeout(timer);
      // Retry with GET when HEAD is unsupported; otherwise accept the status.
      if (method === "HEAD" && (response.status === 405 || response.status === 501)) {
        continue;
      }
      return { status: response.status };
    } catch (error) {
      clearTimeout(timer);
      if (method === "GET") {
        return { error: error?.name === "AbortError" ? "timeout" : (error?.message ?? "request failed") };
      }
      // HEAD threw — try GET before giving up.
    }
  }
  return { error: "request failed" };
}

// Minimal robots.txt: is our user-agent globally disallowed ("Disallow: /")?
// Only the broadest signal is honoured; anything else is treated as allowed.
export function parseRobotsDisallowAll(text) {
  if (typeof text !== "string") {
    return false;
  }
  let appliesToAll = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (line === "") {
      continue;
    }
    const [field, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const key = field.trim().toLowerCase();
    if (key === "user-agent") {
      appliesToAll = value === "*";
    } else if (key === "disallow" && appliesToAll && value === "/") {
      return true;
    }
  }
  return false;
}

async function hostDisallows(host, scheme, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${scheme}//${host}/robots.txt`, {
      method: "GET",
      signal: controller.signal,
      headers: { "user-agent": userAgent }
    });
    clearTimeout(timer);
    if (!response.ok) {
      return false;
    }
    return parseRobotsDisallowAll(await response.text());
  } catch {
    clearTimeout(timer);
    return false; // fail open
  }
}

const delay = (ms) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

// Check a list of unique URLs. Returns Map<url, { status?, error?, verdict }>.
// URLs are grouped by host and checked sequentially per host with `perHostDelayMs`
// spacing; distinct hosts run concurrently up to `hostConcurrency`.
export async function checkLinks(
  urls,
  { fetchImpl = fetch, timeoutMs = 10_000, perHostDelayMs = 500, hostConcurrency = 4, robots = true, logger = console } = {}
) {
  const results = new Map();
  const byHost = new Map();
  for (const url of new Set(urls)) {
    const host = hostOf(url);
    if (!byHost.has(host)) {
      byHost.set(host, []);
    }
    byHost.get(host).push(url);
  }

  const robotsCache = new Map();
  const hosts = [...byHost.keys()];

  const processHost = async (host) => {
    const hostUrls = byHost.get(host);
    let disallowed = false;
    if (robots) {
      if (!robotsCache.has(host)) {
        const scheme = (() => {
          try {
            return new URL(hostUrls[0]).protocol;
          } catch {
            return "https:";
          }
        })();
        robotsCache.set(host, await hostDisallows(host, scheme, { fetchImpl, timeoutMs }));
      }
      disallowed = robotsCache.get(host);
    }

    for (let i = 0; i < hostUrls.length; i += 1) {
      const url = hostUrls[i];
      if (disallowed) {
        results.set(url, { verdict: "skipped", error: "disallowed by robots.txt" });
        continue;
      }
      const outcome = await checkUrl(url, { fetchImpl, timeoutMs });
      results.set(url, { ...outcome, verdict: classifyLink(outcome) });
      if (i < hostUrls.length - 1) {
        await delay(perHostDelayMs);
      }
    }
  };

  // Simple concurrency pool across hosts.
  let cursor = 0;
  const workers = Array.from({ length: Math.min(hostConcurrency, hosts.length) }, async () => {
    while (cursor < hosts.length) {
      const host = hosts[cursor++];
      try {
        await processHost(host);
      } catch (error) {
        logger.error?.(`[content-checks] host ${host} failed: ${error?.message ?? error}`);
      }
    }
  });
  await Promise.all(workers);

  return results;
}
