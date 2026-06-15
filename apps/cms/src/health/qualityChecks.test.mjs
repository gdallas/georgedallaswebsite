import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkMedia,
  checkNowPage,
  checkPage,
  checkPost,
  fingerprint,
  runQualityChecks
} from "./qualityChecks.mjs";

const publishedPost = {
  id: 1,
  status: "published",
  excerpt: "An excerpt.",
  seoTitle: "Title",
  seoDescription: "Description",
  featuredImage: { id: 5 }
};

describe("checkPost", () => {
  it("is clean for a fully-populated published post", () => {
    assert.deepEqual(checkPost(publishedPost), []);
  });

  it("ignores drafts entirely", () => {
    assert.deepEqual(checkPost({ ...publishedPost, status: "draft", excerpt: "", seoTitle: "" }), []);
  });

  it("flags each missing field on a published post", () => {
    const kinds = checkPost({ id: 2, status: "published" }).map((f) => f.kind).sort();
    assert.deepEqual(kinds, ["missing_excerpt", "missing_seo_description", "missing_seo_title", "missing_social_image"]);
  });

  it("accepts a featured image as the social-image fallback", () => {
    const kinds = checkPost({ ...publishedPost, socialImage: null }).map((f) => f.kind);
    assert.ok(!kinds.includes("missing_social_image"));
  });
});

describe("checkPage", () => {
  it("flags missing SEO fields on published pages only", () => {
    assert.deepEqual(checkPage({ id: 3, status: "draft" }), []);
    const kinds = checkPage({ id: 3, status: "published" }).map((f) => f.kind).sort();
    assert.deepEqual(kinds, ["missing_seo_description", "missing_seo_title"]);
  });
});

describe("checkMedia", () => {
  it("flags public, non-decorative media without alt text", () => {
    assert.equal(checkMedia({ id: 7, reviewStatus: "public", filename: "x.png" })[0].kind, "media_missing_alt");
  });

  it("ignores draft, decorative, or alt-bearing media", () => {
    assert.deepEqual(checkMedia({ id: 7, reviewStatus: "draft" }), []);
    assert.deepEqual(checkMedia({ id: 7, reviewStatus: "public", decorative: true }), []);
    assert.deepEqual(checkMedia({ id: 7, reviewStatus: "public", alt: "desc" }), []);
  });
});

describe("checkNowPage", () => {
  const now = new Date("2026-06-15T00:00:00.000Z");
  it("flags a Now page older than the threshold", () => {
    const out = checkNowPage({ updatedAt: "2026-01-01T00:00:00.000Z" }, { now, staleNowDays: 90 });
    assert.equal(out[0].kind, "stale_now");
  });
  it("is clean for a recently-updated Now page", () => {
    assert.deepEqual(checkNowPage({ updatedAt: "2026-06-01T00:00:00.000Z" }, { now, staleNowDays: 90 }), []);
  });
});

describe("fingerprint + runQualityChecks", () => {
  it("produces stable fingerprints", () => {
    assert.equal(fingerprint("missing_excerpt", "posts", 1), "missing_excerpt:posts:1:");
  });

  it("aggregates findings across content types", () => {
    const findings = runQualityChecks({
      posts: [{ id: 1, status: "published" }],
      pages: [{ id: 2, status: "published", seoTitle: "T", seoDescription: "D" }],
      media: [{ id: 3, reviewStatus: "public" }],
      nowPage: { updatedAt: "2020-01-01T00:00:00.000Z" },
      now: new Date("2026-06-15T00:00:00.000Z")
    });
    const kinds = new Set(findings.map((f) => f.kind));
    assert.ok(kinds.has("missing_excerpt"));
    assert.ok(kinds.has("media_missing_alt"));
    assert.ok(kinds.has("stale_now"));
    // the fully-specified page contributes nothing
    assert.ok(!findings.some((f) => f.collection === "pages"));
  });
});
