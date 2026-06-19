import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPublishedPosts } from "./cms.mjs";
import { buildRobotsTxt, buildRssXml, buildSitemapXml, collectSitemapEntries } from "./feed.mjs";

const site = new URL("https://georgedallas.com");
const baseUrl = "https://cms-dev.georgedallas.com";
const now = new Date("2026-06-13T00:00:00.000Z");

function mockPostsFetch(docs) {
  return async (url) => {
    if (new URL(url).pathname === "/api/posts") {
      return { ok: true, status: 200, json: async () => ({ docs }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
}

describe("RSS feed", () => {
  it("builds a valid RSS 2.0 document with channel metadata and a self link", () => {
    const xml = buildRssXml({
      posts: [{ slug: "hello", title: "Hello", excerpt: "Hi", publishedAt: "2026-06-01T00:00:00.000Z" }],
      site
    });
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(xml, /<rss version="2\.0"/);
    assert.match(xml, /<atom:link href="https:\/\/georgedallas\.com\/rss\.xml" rel="self"/);
    assert.match(xml, /<link>https:\/\/georgedallas\.com\/writing\/hello<\/link>/);
    assert.match(xml, /<guid isPermaLink="true">https:\/\/georgedallas\.com\/writing\/hello<\/guid>/);
    assert.match(xml, /<pubDate>.*2026.*<\/pubDate>/);
  });

  it("escapes XML-significant characters in titles and descriptions", () => {
    const xml = buildRssXml({
      posts: [{ slug: "x", title: "A & B <script>", excerpt: 'Quote "q" & <tag>', publishedAt: "2026-06-01T00:00:00.000Z" }],
      site
    });
    assert.ok(!xml.includes("<script>"), "raw markup must not leak into the feed");
    assert.match(xml, /<title>A &amp; B &lt;script&gt;<\/title>/);
    assert.match(xml, /<description>Quote &quot;q&quot; &amp; &lt;tag&gt;<\/description>/);
  });

  it("omits item pubDate and description when a post lacks them", () => {
    const xml = buildRssXml({ posts: [{ slug: "bare", title: "Bare" }], site });
    assert.ok(!xml.includes("<pubDate>"));
    // The channel keeps its own description; the bare item must not add one.
    const item = xml.slice(xml.indexOf("<item>"), xml.indexOf("</item>"));
    assert.ok(!item.includes("<description>"));
    assert.match(item, /<title>Bare<\/title>/);
  });

  it("includes only published, public, past-dated posts (end to end via the data layer)", async () => {
    const fetchImpl = mockPostsFetch([
      { slug: "live", title: "Live", status: "published", visibility: "public", publishedAt: "2026-06-01T00:00:00.000Z" },
      { slug: "draft", title: "Draft", status: "draft", visibility: "public", publishedAt: "2026-06-01T00:00:00.000Z" },
      { slug: "private", title: "Private", status: "published", visibility: "private", publishedAt: "2026-06-01T00:00:00.000Z" },
      { slug: "future", title: "Future", status: "published", visibility: "public", publishedAt: "2026-12-01T00:00:00.000Z" }
    ]);
    const posts = await getPublishedPosts({ baseUrl, fetchImpl, now });
    const xml = buildRssXml({ posts, site });
    assert.match(xml, /writing\/live/);
    for (const slug of ["draft", "private", "future"]) {
      assert.ok(!xml.includes(`writing/${slug}`), `${slug} must be excluded from the feed`);
    }
  });
});

describe("sitemap", () => {
  it("lists the public routes and published posts, and never admin", () => {
    const entries = collectSitemapEntries({
      posts: [{ slug: "post-one", updatedAt: "2026-06-05T00:00:00.000Z" }],
      site
    });
    const xml = buildSitemapXml(entries);
    assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
    for (const path of ["/", "/about", "/writing", "/now", "/projects", "/bookshelf", "/links", "/contact"]) {
      const loc = path === "/" ? "https://georgedallas.com/" : `https://georgedallas.com${path}`;
      assert.ok(xml.includes(`<loc>${loc}</loc>`), `sitemap missing ${loc}`);
    }
    assert.match(xml, /<loc>https:\/\/georgedallas\.com\/writing\/post-one<\/loc>/);
    assert.match(xml, /<lastmod>2026-06-05T00:00:00\.000Z<\/lastmod>/);
    assert.ok(!xml.includes("/admin"), "sitemap must not list admin routes");
  });

  it("excludes drafts, private, and future posts (end to end via the data layer)", async () => {
    const fetchImpl = mockPostsFetch([
      { slug: "live", title: "Live", status: "published", visibility: "public", publishedAt: "2026-06-01T00:00:00.000Z" },
      { slug: "draft", title: "Draft", status: "draft", visibility: "public", publishedAt: "2026-06-01T00:00:00.000Z" },
      { slug: "future", title: "Future", status: "published", visibility: "public", publishedAt: "2026-12-01T00:00:00.000Z" }
    ]);
    const posts = await getPublishedPosts({ baseUrl, fetchImpl, now });
    const xml = buildSitemapXml(collectSitemapEntries({ posts, site }));
    assert.match(xml, /writing\/live/);
    assert.ok(!xml.includes("writing/draft"));
    assert.ok(!xml.includes("writing/future"));
  });
});

describe("robots.txt", () => {
  it("allows crawling and points at the absolute sitemap URL", () => {
    const robots = buildRobotsTxt({ site });
    assert.match(robots, /User-agent: \*/);
    assert.match(robots, /Allow: \//);
    assert.match(robots, /Disallow: \/admin/);
    assert.match(robots, /Sitemap: https:\/\/georgedallas\.com\/sitemap\.xml/);
  });
});
