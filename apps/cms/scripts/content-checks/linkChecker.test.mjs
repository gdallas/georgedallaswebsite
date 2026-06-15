import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkLinks, checkUrl, parseRobotsDisallowAll } from "./linkChecker.mjs";

// A mock fetch driven by a url->response map. Records the methods seen per URL.
function mockFetch(routes) {
  const calls = [];
  const impl = async (url, options = {}) => {
    calls.push({ url, method: options.method });
    const route = routes[url];
    if (typeof route === "function") {
      return route(options);
    }
    if (route?.throw) {
      throw Object.assign(new Error(route.throw), { name: route.name });
    }
    return {
      status: route?.status ?? 200,
      ok: (route?.status ?? 200) < 400,
      text: async () => route?.text ?? ""
    };
  };
  return { impl, calls };
}

describe("checkUrl", () => {
  it("returns the HEAD status when supported", async () => {
    const { impl } = mockFetch({ "https://a.com": { status: 200 } });
    assert.deepEqual(await checkUrl("https://a.com", { fetchImpl: impl }), { status: 200 });
  });

  it("falls back to GET when HEAD is rejected", async () => {
    const { impl, calls } = mockFetch({
      "https://a.com": (o) => ({ status: o.method === "HEAD" ? 405 : 200, ok: true, text: async () => "" })
    });
    assert.deepEqual(await checkUrl("https://a.com", { fetchImpl: impl }), { status: 200 });
    assert.deepEqual(calls.map((c) => c.method), ["HEAD", "GET"]);
  });

  it("reports a timeout as an error", async () => {
    const { impl } = mockFetch({
      "https://slow.com": { throw: "aborted", name: "AbortError" }
    });
    assert.deepEqual(await checkUrl("https://slow.com", { fetchImpl: impl }), { error: "timeout" });
  });
});

describe("parseRobotsDisallowAll", () => {
  it("detects a global disallow for *", () => {
    assert.equal(parseRobotsDisallowAll("User-agent: *\nDisallow: /"), true);
  });
  it("ignores disallow scoped to other agents or paths", () => {
    assert.equal(parseRobotsDisallowAll("User-agent: badbot\nDisallow: /"), false);
    assert.equal(parseRobotsDisallowAll("User-agent: *\nDisallow: /private"), false);
    assert.equal(parseRobotsDisallowAll(""), false);
  });
});

describe("checkLinks", () => {
  it("classifies ok / broken / skipped across URLs", async () => {
    const { impl } = mockFetch({
      "https://ok.com/x": { status: 200 },
      "https://broken.com/y": { status: 404 },
      "https://blocked.com/z": { status: 403 }
    });
    const results = await checkLinks(["https://ok.com/x", "https://broken.com/y", "https://blocked.com/z"], {
      fetchImpl: impl,
      perHostDelayMs: 0,
      robots: false
    });
    assert.equal(results.get("https://ok.com/x").verdict, "ok");
    assert.equal(results.get("https://broken.com/y").verdict, "broken");
    assert.equal(results.get("https://blocked.com/z").verdict, "skipped");
  });

  it("skips a host that globally disallows in robots.txt", async () => {
    const { impl } = mockFetch({
      "https://no.com/robots.txt": { status: 200, text: "User-agent: *\nDisallow: /" },
      "https://no.com/page": { status: 200 }
    });
    const results = await checkLinks(["https://no.com/page"], { fetchImpl: impl, perHostDelayMs: 0, robots: true });
    assert.equal(results.get("https://no.com/page").verdict, "skipped");
  });

  it("dedupes repeated URLs", async () => {
    const { impl, calls } = mockFetch({ "https://a.com/x": { status: 200 } });
    await checkLinks(["https://a.com/x", "https://a.com/x"], { fetchImpl: impl, perHostDelayMs: 0, robots: false });
    assert.equal(calls.filter((c) => c.url === "https://a.com/x").length, 1);
  });
});
