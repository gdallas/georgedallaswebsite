import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  articleJsonLd,
  canonicalUrl,
  jsonLdToString,
  personJsonLd,
  resolveSeo,
  websiteJsonLd
} from "./seo.mjs";

const site = new URL("https://georgedallas.com");

describe("URL helpers", () => {
  it("strips the trailing slash from canonical URLs except the root", () => {
    assert.equal(canonicalUrl("/", site), "https://georgedallas.com/");
    assert.equal(canonicalUrl("/about/", site), "https://georgedallas.com/about");
    assert.equal(canonicalUrl("/writing/my-post/", site), "https://georgedallas.com/writing/my-post");
  });

  it("accepts a string origin and missing leading slash", () => {
    assert.equal(canonicalUrl("about", "https://georgedallas.com/"), "https://georgedallas.com/about");
  });

  it("returns already-absolute URLs unchanged and prefixes relative ones", () => {
    assert.equal(absoluteUrl("https://cdn.example.com/a.png", site), "https://cdn.example.com/a.png");
    assert.equal(absoluteUrl("/brand/logo.svg", site), "https://georgedallas.com/brand/logo.svg");
  });
});

describe("resolveSeo", () => {
  it("falls back to defaults and the default OG image", () => {
    const seo = resolveSeo({ title: "Home", pathname: "/" }, null, site);
    assert.equal(seo.canonical, "https://georgedallas.com/");
    assert.equal(seo.image, `https://georgedallas.com${DEFAULT_OG_IMAGE}`);
    assert.equal(seo.ogType, "website");
    assert.ok(seo.description.length > 0);
  });

  it("prefers page overrides and site settings over defaults", () => {
    const seo = resolveSeo(
      { title: "Post", description: "Override", image: "/brand/x.svg", ogType: "article", pathname: "/writing/p/" },
      { siteTitle: "GD", defaultDescription: "settings desc" },
      site
    );
    assert.equal(seo.description, "Override");
    assert.equal(seo.image, "https://georgedallas.com/brand/x.svg");
    assert.equal(seo.canonical, "https://georgedallas.com/writing/p");
    assert.equal(seo.siteName, "GD");
  });

  it("uses the site settings social image when no page image is given", () => {
    const seo = resolveSeo({ title: "X", pathname: "/" }, { defaultSocialImage: { url: "https://cdn/x.png" } }, site);
    assert.equal(seo.image, "https://cdn/x.png");
  });
});

describe("JSON-LD", () => {
  it("builds WebSite and Person nodes", () => {
    const website = websiteJsonLd({ site });
    assert.equal(website["@type"], "WebSite");
    assert.equal(website.url, "https://georgedallas.com/");

    const person = personJsonLd({ site, sameAs: ["https://github.com/gdallas"] });
    assert.equal(person["@type"], "Person");
    assert.deepEqual(person.sameAs, ["https://github.com/gdallas"]);
  });

  it("omits sameAs when none is provided", () => {
    assert.equal("sameAs" in personJsonLd({ site }), false);
  });

  it("builds a BlogPosting node with canonical url and dates, dropping empties", () => {
    const article = articleJsonLd(
      {
        slug: "hello",
        title: "Hello",
        seoDescription: "A summary",
        publishedAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-05T00:00:00.000Z"
      },
      { site }
    );
    assert.equal(article["@type"], "BlogPosting");
    assert.equal(article.headline, "Hello");
    assert.equal(article.url, "https://georgedallas.com/writing/hello");
    assert.equal(article.mainEntityOfPage, "https://georgedallas.com/writing/hello");
    assert.equal(article.datePublished, "2026-06-01T00:00:00.000Z");
    assert.equal(article.dateModified, "2026-06-05T00:00:00.000Z");
    assert.equal(article.author["@type"], "Person");
  });

  it("escapes < so JSON-LD cannot break out of the script tag", () => {
    const serialized = jsonLdToString({ name: "</script><img>" });
    assert.ok(!serialized.includes("</script>"));
    assert.match(serialized, /\\u003c\/script>/);
  });
});
