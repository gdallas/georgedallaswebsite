import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CmsUnavailableError,
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
    await assert.rejects(getPublishedPosts({ baseUrl, fetchImpl }), CmsUnavailableError);
  });

  it("throws CmsUnavailableError on a non-OK CMS response", async () => {
    const fetchImpl = async () => ({ ok: false, status: 503, json: async () => ({}) });
    await assert.rejects(getSiteSettings({ baseUrl, fetchImpl }), CmsUnavailableError);
  });

  it("requires a configured base URL", async () => {
    await assert.rejects(getPublishedPosts({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ docs: [] }) }) }), CmsUnavailableError);
  });
});
