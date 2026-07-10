import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CmsUnavailableError,
  backoffDelayMs,
  encodeWhere,
  getCurrentlyReadingBooks,
  getNowPage,
  getPublicBooks,
  getPublicProjects,
  getPublicTimelineEntries,
  getPublishedPost,
  getPublishedPosts,
  getSiteSettings
} from "./cms.mjs";

const baseUrl = "https://cms-dev.georgedallas.com";
const now = new Date("2026-06-13T00:00:00.000Z");

function mockFetch(payloadByPath) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const { pathname } = new URL(url);
    const payload = payloadByPath[pathname];
    if (!payload) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => payload };
  };
  return { fetchImpl, calls };
}

describe("public data layer", () => {
  it("serializes a where-clause into Payload bracket query params", () => {
    const qs = encodeWhere({ and: [{ status: { equals: "published" } }, { visibility: { equals: "public" } }] });
    assert.match(qs, /where%5Band%5D%5B0%5D%5Bstatus%5D%5Bequals%5D=published/);
    assert.match(qs, /where%5Band%5D%5B1%5D%5Bvisibility%5D%5Bequals%5D=public/);
  });

  it("requests posts with a published filter and drops anything not publicly visible", async () => {
    const { fetchImpl, calls } = mockFetch({
      "/api/posts": {
        docs: [
          { id: 1, slug: "live", title: "Live", status: "published", visibility: "public", publishedAt: "2026-06-01T00:00:00.000Z" },
          { id: 2, slug: "draft", title: "Draft", status: "draft", visibility: "public", publishedAt: "2026-06-01T00:00:00.000Z" },
          { id: 3, slug: "private", title: "Private", status: "published", visibility: "private", publishedAt: "2026-06-01T00:00:00.000Z" },
          { id: 4, slug: "future", title: "Future", status: "published", visibility: "public", publishedAt: "2026-12-01T00:00:00.000Z" }
        ]
      }
    });

    const posts = await getPublishedPosts({ baseUrl, fetchImpl, now });
    assert.deepEqual(posts.map((p) => p.slug), ["live"]);

    const url = new URL(calls[0]);
    assert.equal(url.searchParams.get("where[and][0][status][equals]"), "published");
    assert.equal(url.searchParams.get("where[and][1][visibility][equals]"), "public");
    assert.equal(url.searchParams.get("where[and][2][publishedAt][less_than_equal]"), now.toISOString());
  });

  it("follows pagination so multi-page collections are never truncated", async () => {
    const doc = (id) => ({
      id,
      slug: `post-${id}`,
      status: "published",
      visibility: "public",
      publishedAt: "2026-06-01T00:00:00.000Z"
    });
    const pages = {
      1: { docs: [doc(1), doc(2)], hasNextPage: true },
      2: { docs: [doc(3)], hasNextPage: false }
    };
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      const page = Number(new URL(url).searchParams.get("page"));
      return { ok: true, status: 200, json: async () => pages[page] ?? { docs: [] } };
    };

    const posts = await getPublishedPosts({ baseUrl, fetchImpl, now });
    assert.deepEqual(posts.map((p) => p.slug), ["post-1", "post-2", "post-3"]);
    assert.equal(calls.length, 2);
    assert.equal(new URL(calls[0]).searchParams.get("page"), "1");
    assert.equal(new URL(calls[1]).searchParams.get("page"), "2");
  });

  it("returns null for a post slug that is not publicly visible", async () => {
    const { fetchImpl } = mockFetch({
      "/api/posts": {
        docs: [
          { id: 1, slug: "live", status: "published", visibility: "public", publishedAt: "2026-06-01T00:00:00.000Z" },
          { id: 2, slug: "draft", status: "draft", visibility: "public", publishedAt: "2026-06-01T00:00:00.000Z" }
        ]
      }
    });

    assert.equal((await getPublishedPost("draft", { baseUrl, fetchImpl, now }))?.slug, undefined);
    assert.equal(await getPublishedPost("draft", { baseUrl, fetchImpl, now }), null);
    assert.equal((await getPublishedPost("live", { baseUrl, fetchImpl, now })).slug, "live");
  });

  it("filters projects to published, public listings", async () => {
    const { fetchImpl } = mockFetch({
      "/api/projects": {
        docs: [
          { id: 1, slug: "shipped", status: "published", visibility: "public" },
          { id: 2, slug: "wip", status: "draft", visibility: "public" },
          { id: 3, slug: "secret", status: "published", visibility: "private" }
        ]
      }
    });

    const projects = await getPublicProjects({ baseUrl, fetchImpl });
    assert.deepEqual(projects.map((p) => p.slug), ["shipped"]);
  });

  it("filters books to published, public listings and derives reading-now items", async () => {
    const { fetchImpl } = mockFetch({
      "/api/books": {
        docs: [
          { id: 1, title: "Reading", readingStatus: "reading", status: "published", visibility: "public" },
          { id: 2, title: "Finished", readingStatus: "finished", status: "published", visibility: "public" },
          { id: 3, title: "Draft", readingStatus: "reading", status: "draft", visibility: "public" },
          { id: 4, title: "Private", readingStatus: "reading", status: "published", visibility: "private" }
        ]
      }
    });

    const books = await getPublicBooks({ baseUrl, fetchImpl });
    assert.deepEqual(books.map((book) => book.title), ["Reading", "Finished"]);
    assert.deepEqual((await getCurrentlyReadingBooks({ baseUrl, fetchImpl })).map((book) => book.title), ["Reading"]);
  });

  it("filters timeline entries to published, public listings", async () => {
    const { fetchImpl, calls } = mockFetch({
      "/api/timeline-entries": {
        docs: [
          { id: 1, title: "Launch", status: "published", visibility: "public", eventDate: "2026-06-01T00:00:00.000Z" },
          { id: 2, title: "Draft", status: "draft", visibility: "public", eventDate: "2026-06-02T00:00:00.000Z" },
          { id: 3, title: "Private", status: "published", visibility: "private", eventDate: "2026-06-03T00:00:00.000Z" }
        ]
      }
    });

    const entries = await getPublicTimelineEntries({ baseUrl, fetchImpl });
    assert.deepEqual(entries.map((entry) => entry.title), ["Launch"]);

    const url = new URL(calls[0]);
    assert.equal(url.searchParams.get("where[and][0][status][equals]"), "published");
    assert.equal(url.searchParams.get("where[and][1][visibility][equals]"), "public");
    assert.equal(url.searchParams.get("sort"), "-eventDate,sortOrder");
  });

  it("returns the Now page only when published", async () => {
    const draft = mockFetch({ "/api/globals/now-page": { status: "draft", currentFocus: null } });
    assert.equal(await getNowPage({ baseUrl, fetchImpl: draft.fetchImpl }), null);

    const live = mockFetch({ "/api/globals/now-page": { status: "published", currentFocus: "Shipping the site" } });
    assert.equal((await getNowPage({ baseUrl, fetchImpl: live.fetchImpl })).currentFocus, "Shipping the site");
  });

  it("throws CmsUnavailableError when the CMS cannot be reached", async () => {
    const fetchImpl = async () => {
      throw new Error("ECONNREFUSED");
    };
    await assert.rejects(getPublishedPosts({ baseUrl, fetchImpl, retryDelayMs: 0 }), CmsUnavailableError);
  });

  it("throws CmsUnavailableError on a non-OK CMS response", async () => {
    const fetchImpl = async () => ({ ok: false, status: 503, json: async () => ({}) });
    await assert.rejects(getSiteSettings({ baseUrl, fetchImpl, retryDelayMs: 0 }), CmsUnavailableError);
  });

  it("retries transient CMS responses before failing the build", async () => {
    let attempts = 0;
    const fetchImpl = async () => {
      attempts += 1;
      if (attempts === 1) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({ siteTitle: "George Dallas" }) };
    };

    assert.equal((await getSiteSettings({ baseUrl, fetchImpl, retryDelayMs: 0 })).siteTitle, "George Dallas");
    assert.equal(attempts, 2);
  });

  it("does not retry non-transient CMS responses", async () => {
    let attempts = 0;
    const fetchImpl = async () => {
      attempts += 1;
      return { ok: false, status: 404, json: async () => ({}) };
    };

    await assert.rejects(getSiteSettings({ baseUrl, fetchImpl, retryDelayMs: 0 }), CmsUnavailableError);
    assert.equal(attempts, 1);
  });

  it("keeps retrying long enough to outlast an Aurora cold start", async () => {
    // Scale-to-zero Aurora can 500 for the first ~15-30s of a deploy; the build
    // must retry past 3 attempts, not give up after ~6s.
    let attempts = 0;
    const fetchImpl = async () => {
      attempts += 1;
      if (attempts <= 5) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({ siteTitle: "George Dallas" }) };
    };

    assert.equal((await getSiteSettings({ baseUrl, fetchImpl, retryDelayMs: 0 })).siteTitle, "George Dallas");
    assert.equal(attempts, 6);
  });

  it("backs off exponentially, capped, and skips sleeping when delay is 0", () => {
    assert.deepEqual(
      [1, 2, 3, 4, 5].map((n) => backoffDelayMs({}, n)),
      [2000, 4000, 8000, 10000, 10000]
    );
    assert.equal(backoffDelayMs({ retryDelayMs: 0 }, 4), 0);
    assert.equal(backoffDelayMs({ retryDelayMs: 1000, maxRetryDelayMs: 3000 }, 5), 3000);
  });

  it("requires a configured base URL", async () => {
    await assert.rejects(getPublishedPosts({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ docs: [] }) }) }), CmsUnavailableError);
  });
});
