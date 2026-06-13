import type { APIContext } from "astro";
import { loadPublishedPosts } from "../lib/content.mjs";
import { buildSitemapXml, collectSitemapEntries } from "../lib/feed.mjs";

// Static endpoint: prerendered to /sitemap.xml at build time. Includes the
// public routes and every published, public post; admin lives on the CMS
// domain and is never listed.
export async function GET(context: APIContext) {
  const posts = await loadPublishedPosts();
  const xml = buildSitemapXml(collectSitemapEntries({ posts, site: context.site }));

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
}
