import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminEditUrl,
  adminSearchCollections,
  buildSearchWhere,
  normalizeQuery,
  searchAllCollections,
  toResultItem
} from "./adminSearch.mjs";

describe("normalizeQuery", () => {
  it("trims and coerces non-strings to empty", () => {
    assert.equal(normalizeQuery("  fractals  "), "fractals");
    assert.equal(normalizeQuery(""), "");
    assert.equal(normalizeQuery(undefined), "");
    assert.equal(normalizeQuery(42), "");
  });
});

describe("buildSearchWhere", () => {
  it("ORs a case-insensitive like across every field", () => {
    assert.deepEqual(buildSearchWhere(["title", "slug"], "abc"), {
      or: [{ title: { like: "abc" } }, { slug: { like: "abc" } }]
    });
  });
});

describe("adminEditUrl", () => {
  it("builds the collection edit path and tolerates a trailing slash", () => {
    assert.equal(adminEditUrl("/admin", "posts", 7), "/admin/collections/posts/7");
    assert.equal(adminEditUrl("/admin/", "pages", "a1"), "/admin/collections/pages/a1");
  });
});

describe("toResultItem", () => {
  const posts = adminSearchCollections.find((c) => c.slug === "posts");
  const media = adminSearchCollections.find((c) => c.slug === "media");

  it("maps a post to title/subtitle/href", () => {
    const item = toResultItem(posts, { id: 7, title: "Fractals", status: "published" }, "/admin");
    assert.deepEqual(item, {
      id: 7,
      title: "Fractals",
      subtitle: "published",
      href: "/admin/collections/posts/7"
    });
  });

  it("falls back to filename then a placeholder title for media", () => {
    assert.equal(toResultItem(media, { id: 3, filename: "x.png", reviewStatus: "public" }, "/admin").title, "x.png");
    assert.equal(toResultItem(media, { id: 9 }, "/admin").title, "Untitled (#9)");
  });
});

describe("searchAllCollections", () => {
  // Fake find: returns docs only for posts; throws for one collection to prove
  // graceful degradation (mimics a collection the user cannot read).
  const find = async (slug, where, limit) => {
    assert.ok(where.or.length > 0);
    assert.ok(limit > 0);
    if (slug === "posts") {
      return { docs: [{ id: 1, title: "Fractals", status: "published" }], totalDocs: 1 };
    }
    if (slug === "import-issues") {
      throw new Error("forbidden");
    }
    return { docs: [], totalDocs: 0 };
  };

  it("returns empty for a blank query without calling find", async () => {
    let called = false;
    const result = await searchAllCollections({ find: async () => ((called = true), {}), query: "   " });
    assert.deepEqual(result, { query: "", groups: [], total: 0 });
    assert.equal(called, false);
  });

  it("groups results across collections and degrades unreadable ones to empty", async () => {
    const result = await searchAllCollections({ find, query: "fractals", adminRoute: "/admin" });
    assert.equal(result.query, "fractals");
    assert.equal(result.total, 1);
    const postsGroup = result.groups.find((g) => g.slug === "posts");
    assert.equal(postsGroup.items[0].href, "/admin/collections/posts/1");
    const issuesGroup = result.groups.find((g) => g.slug === "import-issues");
    assert.deepEqual(issuesGroup.items, []);
    assert.equal(issuesGroup.total, 0);
    // Every configured collection is represented in the output.
    assert.equal(result.groups.length, adminSearchCollections.length);
  });
});
