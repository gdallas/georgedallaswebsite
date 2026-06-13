import type { APIContext } from "astro";
import { loadPublishedPosts, loadSiteSettings } from "../lib/content.mjs";
import { buildRssXml } from "../lib/feed.mjs";

// Static endpoint: prerendered to /rss.xml at build time. The posts come from
// the data layer, which only returns published, public, past-dated content.
export async function GET(context: APIContext) {
  const [posts, settings] = await Promise.all([loadPublishedPosts(), loadSiteSettings()]);
  const xml = buildRssXml({
    posts,
    site: context.site,
    title: settings?.siteTitle ?? "George Dallas",
    description:
      settings?.defaultDescription ??
      "Essays and notes on AI systems, therapy, and the places they meet."
  });

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
}
