import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_OG_IMAGE,
  buildSeoPreview,
  canonicalFor,
  effectiveDescription,
  effectiveTitle,
  lengthStatus,
  socialImageUrl
} from "./seoPreview.mjs";

const siteUrl = "https://georgedallas.com";
const mediaBaseUrl = "https://cdn.example.net";

describe("effective title/description fallbacks", () => {
  it("prefers seoTitle, falls back to title", () => {
    assert.equal(effectiveTitle({ seoTitle: "SEO", title: "T" }), "SEO");
    assert.equal(effectiveTitle({ title: "T" }), "T");
    assert.equal(effectiveTitle({ seoTitle: "   " }), "");
  });

  it("prefers seoDescription, falls back to excerpt", () => {
    assert.equal(effectiveDescription({ seoDescription: "D", excerpt: "E" }), "D");
    assert.equal(effectiveDescription({ excerpt: "E" }), "E");
    assert.equal(effectiveDescription({}), "");
  });
});

describe("canonicalFor", () => {
  it("uses an explicit canonicalUrl when set", () => {
    assert.equal(canonicalFor({ canonicalUrl: "https://x.com/y" }, { siteUrl, collection: "posts" }), "https://x.com/y");
  });
  it("derives a clean URL per collection", () => {
    assert.equal(canonicalFor({ slug: "hello" }, { siteUrl, collection: "posts" }), "https://georgedallas.com/writing/hello");
    assert.equal(canonicalFor({ slug: "about" }, { siteUrl, collection: "pages" }), "https://georgedallas.com/about");
  });
});

describe("socialImageUrl fallback chain", () => {
  it("uses socialImage first", () => {
    const out = socialImageUrl({ socialImage: { url: "/uploads/s.png" }, featuredImage: { url: "/uploads/f.png" } }, { mediaBaseUrl, siteUrl });
    assert.deepEqual(out, { url: "https://cdn.example.net/uploads/s.png", source: "social" });
  });
  it("falls back to featuredImage", () => {
    const out = socialImageUrl({ featuredImage: { url: "/uploads/f.png" } }, { mediaBaseUrl, siteUrl });
    assert.deepEqual(out, { url: "https://cdn.example.net/uploads/f.png", source: "featured" });
  });
  it("falls back to the default OG image on the site origin", () => {
    const out = socialImageUrl({}, { mediaBaseUrl, siteUrl });
    assert.deepEqual(out, { url: `https://georgedallas.com${DEFAULT_OG_IMAGE}`, source: "default" });
  });
  it("keeps already-absolute media URLs as-is", () => {
    const out = socialImageUrl({ socialImage: "https://other.cdn/x.jpg" }, { mediaBaseUrl, siteUrl });
    assert.equal(out.url, "https://other.cdn/x.jpg");
  });
});

describe("lengthStatus", () => {
  it("classifies short / ok / long", () => {
    assert.equal(lengthStatus("", { min: 30, max: 60 }).status, "short");
    assert.equal(lengthStatus("x".repeat(45), { min: 30, max: 60 }).status, "ok");
    assert.equal(lengthStatus("x".repeat(80), { min: 30, max: 60 }).status, "long");
  });
});

describe("buildSeoPreview", () => {
  it("assembles the full preview with fallbacks", () => {
    const preview = buildSeoPreview(
      { title: "My Post", excerpt: "A short summary of the post.", slug: "my-post" },
      { collection: "posts", siteUrl, mediaBaseUrl }
    );
    assert.equal(preview.title, "My Post");
    assert.equal(preview.description, "A short summary of the post.");
    assert.equal(preview.canonical, "https://georgedallas.com/writing/my-post");
    assert.equal(preview.image.source, "default");
    assert.equal(preview.titleLength.status, "short");
  });
});
