// RSS, sitemap, and robots generation for the public site. Pure functions that
// take already-visibility-filtered content (the data layer in cms.mjs only ever
// returns published, public, past-dated docs), so drafts, private, and
// future-scheduled content never reach a feed or sitemap.

import { escapeHtml } from "./richText.mjs";
import { absoluteUrl, canonicalUrl, siteOrigin } from "./seo.mjs";

// Public routes that always exist, independent of CMS content. Admin lives on a
// separate CMS domain and is never listed here.
const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/writing", changefreq: "weekly", priority: "0.9" },
  { path: "/now", changefreq: "weekly", priority: "0.7" },
  { path: "/projects", changefreq: "monthly", priority: "0.7" },
  { path: "/bookshelf", changefreq: "monthly", priority: "0.6" },
  { path: "/timeline", changefreq: "monthly", priority: "0.6" },
  { path: "/links", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "yearly", priority: "0.5" }
];

function toUtcString(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toUTCString();
}

function toIsoString(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function buildRssXml(options = {}) {
  const {
    posts = [],
    site,
    title = "George Dallas",
    description = "Essays and notes on AI systems, therapy, and the places they meet.",
    feedPath = "/rss.xml"
  } = options;

  const items = posts.map((post) => {
    const link = canonicalUrl(`/writing/${post.slug}`, site);
    const summary = post.seoDescription ?? post.excerpt ?? "";
    const pubDate = toUtcString(post.publishedAt);
    return [
      "    <item>",
      `      <title>${escapeHtml(post.title)}</title>`,
      `      <link>${escapeHtml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeHtml(link)}</guid>`,
      summary ? `      <description>${escapeHtml(summary)}</description>` : "",
      pubDate ? `      <pubDate>${pubDate}</pubDate>` : "",
      "    </item>"
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeHtml(title)}</title>`,
    `    <link>${escapeHtml(`${siteOrigin(site)}/`)}</link>`,
    `    <description>${escapeHtml(description)}</description>`,
    "    <language>en</language>",
    `    <atom:link href="${escapeHtml(absoluteUrl(feedPath, site))}" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
    ""
  ].join("\n");
}

export function collectSitemapEntries(options = {}) {
  const { posts = [], site, staticRoutes = STATIC_ROUTES } = options;

  const entries = staticRoutes.map((route) => ({
    loc: canonicalUrl(route.path, site),
    changefreq: route.changefreq,
    priority: route.priority
  }));

  for (const post of posts) {
    entries.push({
      loc: canonicalUrl(`/writing/${post.slug}`, site),
      lastmod: post.updatedAt ?? post.publishedAt ?? undefined,
      changefreq: "monthly",
      priority: "0.6"
    });
  }

  return entries;
}

export function buildSitemapXml(entries = []) {
  const urls = entries.map((entry) => {
    const lines = [`    <loc>${escapeHtml(entry.loc)}</loc>`];
    const lastmod = toIsoString(entry.lastmod);
    if (lastmod) {
      lines.push(`    <lastmod>${lastmod}</lastmod>`);
    }
    if (entry.changefreq) {
      lines.push(`    <changefreq>${escapeHtml(entry.changefreq)}</changefreq>`);
    }
    if (entry.priority) {
      lines.push(`    <priority>${escapeHtml(entry.priority)}</priority>`);
    }
    return ["  <url>", ...lines, "  </url>"].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    ""
  ].join("\n");
}

export function buildRobotsTxt(options = {}) {
  const { site, sitemapPath = "/sitemap.xml" } = options;
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    `Sitemap: ${absoluteUrl(sitemapPath, site)}`,
    ""
  ].join("\n");
}
