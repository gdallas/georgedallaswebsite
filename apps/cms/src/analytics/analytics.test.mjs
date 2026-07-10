import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deviceTypeFromUa, normalizePath, parseBeacon, referrerDomain, summarizeEvents } from "./analytics.mjs";

describe("analytics path + referrer normalization", () => {
  it("keeps rooted site paths and rejects absolute URLs/junk", () => {
    assert.equal(normalizePath("/writing/hello"), "/writing/hello");
    assert.equal(normalizePath("/writing/hello#foot"), "/writing/hello");
    assert.equal(normalizePath("https://evil.example/x"), null);
    assert.equal(normalizePath("//evil"), null);
    assert.equal(normalizePath(123), null);
  });

  it("reduces referrers to a domain and drops own hosts", () => {
    assert.equal(referrerDomain("https://news.ycombinator.com/item?id=1"), "news.ycombinator.com");
    assert.equal(referrerDomain("https://georgedallas.com/writing/x", ["georgedallas.com"]), null);
    assert.equal(referrerDomain(""), null);
    assert.equal(referrerDomain("not a url"), null);
  });

  it("buckets device type coarsely from the UA", () => {
    assert.equal(deviceTypeFromUa("Mozilla/5.0 (iPhone) Mobile"), "mobile");
    assert.equal(deviceTypeFromUa("Mozilla/5.0 (iPad)"), "tablet");
    assert.equal(deviceTypeFromUa("Mozilla/5.0 (Windows NT 10.0)"), "desktop");
  });
});

describe("parseBeacon", () => {
  it("builds a minimal event and only keeps a query on /search", () => {
    const ev = parseBeacon(
      { path: "/search", referrer: "https://google.com/", query: "  systems thinking  " },
      { userAgent: "Mozilla/5.0 (iPhone) Mobile", ownHosts: ["georgedallas.com"] }
    );
    assert.deepEqual(ev, {
      path: "/search",
      referrerDomain: "google.com",
      deviceType: "mobile",
      query: "systems thinking"
    });
  });

  it("drops a query when not on /search, and drops bad paths entirely", () => {
    assert.equal(parseBeacon({ path: "/writing/x", query: "secret" }, {}).query, null);
    assert.equal(parseBeacon({ path: "http://evil" }, {}), null);
  });

  it("never carries IP or identifying fields", () => {
    const ev = parseBeacon({ path: "/", referrer: "https://x.com", ip: "1.2.3.4", cookie: "abc" }, {});
    assert.deepEqual(Object.keys(ev).sort(), ["deviceType", "path", "query", "referrerDomain"]);
  });
});

describe("summarizeEvents", () => {
  const events = [
    { path: "/writing/a", referrerDomain: "google.com", deviceType: "desktop" },
    { path: "/writing/a", referrerDomain: "google.com", deviceType: "mobile" },
    { path: "/projects", referrerDomain: null, deviceType: "desktop" },
    { path: "/search", query: "astro", deviceType: "desktop" }
  ];

  it("returns only aggregate counts, most-popular first", () => {
    const s = summarizeEvents(events);
    assert.equal(s.totalViews, 4);
    assert.deepEqual(s.topPosts[0], { value: "/writing/a", count: 2 });
    assert.deepEqual(s.topReferrers[0], { value: "google.com", count: 2 });
    assert.deepEqual(s.topSearches[0], { value: "astro", count: 1 });
    assert.deepEqual(s.topProjects[0], { value: "/projects", count: 1 });
  });
});
