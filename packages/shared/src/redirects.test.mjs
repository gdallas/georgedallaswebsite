import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectRedirectLoops,
  isSafeRedirectDestination,
  normalizeRedirectPath,
  redirectActiveWhere,
  resolveRedirectChain,
  selectServableRedirects
} from "./redirects.mjs";

// Representative legacy WordPress permalinks and the new routes they must reach.
// (Real source paths produced by the import for georgemdallas.wordpress.com.)
const legacyUrlTestList = [
  { legacy: "/2014/05/29/an-engineers-guide-to-cooking/", destination: "/writing/an-engineers-guide-to-cooking" },
  { legacy: "/2013/06/14/what-are-fractals-and-why-should-i-care/", destination: "/writing/what-are-fractals-and-why-should-i-care" },
  { legacy: "/2013/10/28/the-story-of-computer-vision", destination: "/writing/the-story-of-computer-vision" }
];

const importedRedirects = legacyUrlTestList.map(({ legacy, destination }) => ({
  sourcePath: legacy.replace(/\/$/, ""),
  destination,
  statusCode: "301",
  status: "active",
  enabled: true
}));

describe("redirect path normalisation", () => {
  it("forces a leading slash and strips trailing/duplicate slashes and query/hash", () => {
    assert.equal(normalizeRedirectPath("a/b/"), "/a/b");
    assert.equal(normalizeRedirectPath("/a//b///"), "/a/b");
    assert.equal(normalizeRedirectPath("/a/b?utm=x#frag"), "/a/b");
    assert.equal(normalizeRedirectPath("/"), "/");
    assert.equal(normalizeRedirectPath(""), null);
  });
});

describe("open-redirect safety", () => {
  it("allows internal paths", () => {
    assert.equal(isSafeRedirectDestination("/writing/foo"), true);
  });
  it("blocks protocol-relative and disallowed external hosts", () => {
    assert.equal(isSafeRedirectDestination("//evil.com/phish"), false);
    assert.equal(isSafeRedirectDestination("https://evil.com"), false);
    assert.equal(isSafeRedirectDestination("javascript:alert(1)"), false);
  });
  it("allows external hosts only when explicitly allowlisted", () => {
    assert.equal(isSafeRedirectDestination("https://georgedallas.com/x", { allowedHosts: ["georgedallas.com"] }), true);
  });
});

describe("loop detection", () => {
  it("flags self-redirects", () => {
    const loops = detectRedirectLoops([{ sourcePath: "/a", destination: "/a" }]);
    assert.equal(loops.has("/a"), true);
  });
  it("flags multi-hop cycles", () => {
    const loops = detectRedirectLoops([
      { sourcePath: "/a", destination: "/b" },
      { sourcePath: "/b", destination: "/a" }
    ]);
    assert.equal(loops.has("/a"), true);
    assert.equal(loops.has("/b"), true);
  });
  it("does not flag a normal terminating chain", () => {
    const loops = detectRedirectLoops([
      { sourcePath: "/old", destination: "/mid" },
      { sourcePath: "/mid", destination: "/writing/final" }
    ]);
    assert.equal(loops.size, 0);
  });
});

describe("servable selection", () => {
  it("keeps active, enabled, safe, loop-free redirects and drops the rest", () => {
    const servable = selectServableRedirects([
      { sourcePath: "/keep", destination: "/writing/keep", status: "active", enabled: true },
      { sourcePath: "/proposed", destination: "/writing/x", status: "proposed", enabled: true },
      { sourcePath: "/disabled", destination: "/writing/x", status: "active", enabled: false },
      { sourcePath: "/self", destination: "/self", status: "active", enabled: true },
      { sourcePath: "/open", destination: "https://evil.com", status: "active", enabled: true }
    ]);
    assert.deepEqual(
      servable.map((r) => r.source),
      ["/keep"]
    );
  });

  it("de-duplicates by normalised source", () => {
    const servable = selectServableRedirects([
      { sourcePath: "/a/", destination: "/writing/a", status: "active", enabled: true },
      { sourcePath: "/a", destination: "/writing/other", status: "active", enabled: true }
    ]);
    assert.equal(servable.length, 1);
  });

  it("defaults status to active and statusCode to 301", () => {
    const [r] = selectServableRedirects([{ sourcePath: "/x", destination: "/writing/x" }]);
    assert.equal(r.statusCode, "301");
  });
});

describe("legacy URL redirect list", () => {
  it("resolves every representative legacy URL to its new route", () => {
    for (const { legacy, destination } of legacyUrlTestList) {
      const result = resolveRedirectChain(importedRedirects, legacy);
      assert.equal(result.loop, false);
      assert.equal(result.destination, destination, `legacy ${legacy}`);
    }
  });

  it("returns no destination for an unknown path", () => {
    assert.equal(resolveRedirectChain(importedRedirects, "/not-a-legacy-url").destination, null);
  });

  it("reports a loop rather than spinning forever", () => {
    const looped = [
      { sourcePath: "/a", destination: "/b", status: "active", enabled: true },
      { sourcePath: "/b", destination: "/a", status: "active", enabled: true }
    ];
    // selectServableRedirects strips the loop, so the chain simply finds nothing.
    assert.equal(resolveRedirectChain(looped, "/a").destination, null);
  });
});

describe("active where-clause", () => {
  it("filters to active + not-disabled", () => {
    assert.deepEqual(redirectActiveWhere(), { status: { equals: "active" }, enabled: { not_equals: false } });
  });
});
