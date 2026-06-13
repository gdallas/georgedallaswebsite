import type { APIContext } from "astro";
import { buildRobotsTxt } from "../lib/feed.mjs";

// Static endpoint: prerendered to /robots.txt at build time. Points crawlers at
// the canonical sitemap (absolute URL built from the configured site origin).
export function GET(context: APIContext) {
  return new Response(buildRobotsTxt({ site: context.site }), {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
