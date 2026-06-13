// CLI entry point for the WordPress import proof of concept. Wires environment
// configuration to the fetch -> transform -> import flow, writes a summary
// report, and refuses to target the production CMS.
//
// Required env:
//   WORDPRESS_API_URL   e.g. https://example.com/wp-json
//   CMS_API_URL         a local or dev CMS base URL (never production)
//   CMS_IMPORT_EMAIL    CMS user email
//   CMS_IMPORT_PASSWORD CMS user password
// Optional env:
//   WP_IMPORT_LIMIT     max posts to import (default 5)
//   CMS_ORIGIN_VERIFY   origin-verify secret when hitting a CMS directly
//   WP_IMPORT_ALLOW_PROD set to "true" to override the production guard

import { mkdirSync, writeFileSync } from "node:fs";
import { fetchWordpressPosts } from "./fetch.mjs";
import { importWordpressPosts } from "./import.mjs";
import { createPayloadClient } from "./payload-client.mjs";

function fail(message) {
  console.error(`[wp-import] ${message}`);
  process.exit(1);
}

const wordpressApi = process.env.WORDPRESS_API_URL;
const cmsUrl = process.env.CMS_API_URL;
const email = process.env.CMS_IMPORT_EMAIL;
const password = process.env.CMS_IMPORT_PASSWORD;
const originVerify = process.env.CMS_ORIGIN_VERIFY;
const limit = Number.parseInt(process.env.WP_IMPORT_LIMIT ?? "5", 10);

if (!wordpressApi) {
  fail("WORDPRESS_API_URL is required (e.g. https://example.com/wp-json).");
}
if (!cmsUrl) {
  fail("CMS_API_URL is required (a local or dev CMS — never production).");
}
if (!email || !password) {
  fail("CMS_IMPORT_EMAIL and CMS_IMPORT_PASSWORD are required.");
}

let cmsHost;
try {
  cmsHost = new URL(cmsUrl).hostname;
} catch {
  fail(`CMS_API_URL is not a valid URL: ${cmsUrl}`);
}
if (cmsHost === "cms.georgedallas.com" && process.env.WP_IMPORT_ALLOW_PROD !== "true") {
  fail("Refusing to import into the production CMS. This proof of concept targets local/dev only.");
}

console.log(`[wp-import] fetching up to ${limit} post(s) from ${wordpressApi}`);
const posts = await fetchWordpressPosts({ apiBase: wordpressApi, limit, perPage: Math.min(limit, 100) });
console.log(`[wp-import] fetched ${posts.length} post(s); importing into ${cmsUrl} as drafts...`);

const client = createPayloadClient({ cmsUrl, email, password, originVerify });
await client.login();
const report = await importWordpressPosts({ posts, client });

mkdirSync("local-data", { recursive: true });
const reportPath = "local-data/wordpress-import-report.json";
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  `[wp-import] done: created=${report.created} skipped=${report.skipped} failed=${report.failed} withWarnings=${report.withWarnings}`
);
for (const item of report.items) {
  const flags = item.warnings
    ? [...item.warnings.shortcodes.map((s) => `shortcode:${s}`), ...item.warnings.embeds.map((e) => `embed:${e}`)]
    : [];
  const suffix = `${item.error ? ` error=${item.error}` : ""}${flags.length > 0 ? ` flagged=${flags.join(",")}` : ""}`;
  console.log(`  - [${item.status}] wp#${item.wordpressId} ${item.slug ?? ""}${suffix}`);
}
console.log(`[wp-import] full report written to ${reportPath}`);
