import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRedirectDocument, toRedirectRoutes } from "./redirects.mjs";

describe("buildRedirectDocument", () => {
  it("emits a noindex meta-refresh page to the destination", () => {
    const html = buildRedirectDocument({ destination: "/writing/foo", statusCode: "301" });
    assert.match(html, /<meta name="robots" content="noindex" \/>/);
    assert.match(html, /<meta http-equiv="refresh" content="0; url=\/writing\/foo" \/>/);
    assert.match(html, /location\.replace\("\/writing\/foo"\)/);
  });

  it("includes a canonical link for permanent redirects only", () => {
    assert.match(buildRedirectDocument({ destination: "/writing/foo", statusCode: "301" }), /rel="canonical"/);
    assert.match(buildRedirectDocument({ destination: "/writing/foo", statusCode: "308" }), /rel="canonical"/);
    assert.doesNotMatch(buildRedirectDocument({ destination: "/writing/foo", statusCode: "302" }), /rel="canonical"/);
  });

  it("escapes the destination and neutralises script-breakout attempts", () => {
    const html = buildRedirectDocument({ destination: '/x"><script>alert(1)</script>' });
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
    assert.match(html, /&quot;&gt;&lt;script&gt;/); // attribute-escaped
    assert.match(html, /\\u003c\/script>/); // inline JS string escaped
  });
});

describe("toRedirectRoutes", () => {
  it("maps active redirects to leading-slash-free getStaticPaths entries", () => {
    const routes = toRedirectRoutes([
      { sourcePath: "/2014/05/old-post", destination: "/writing/old-post", statusCode: "301", status: "active", enabled: true }
    ]);
    assert.deepEqual(routes, [
      {
        params: { redirect: "2014/05/old-post" },
        props: { source: "/2014/05/old-post", destination: "/writing/old-post", statusCode: "301" }
      }
    ]);
  });

  it("excludes proposed, disabled, looping, and unsafe redirects", () => {
    const routes = toRedirectRoutes([
      { sourcePath: "/proposed", destination: "/writing/x", status: "proposed", enabled: true },
      { sourcePath: "/disabled", destination: "/writing/x", status: "active", enabled: false },
      { sourcePath: "/open", destination: "https://evil.com", status: "active", enabled: true },
      { sourcePath: "/loop", destination: "/loop", status: "active", enabled: true }
    ]);
    assert.deepEqual(routes, []);
  });
});
