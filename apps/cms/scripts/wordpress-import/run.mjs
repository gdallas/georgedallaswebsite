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
//   WP_IMPORT_DRY_RUN   set to "true" to fetch + transform + report without
//                       contacting a CMS (no credentials needed, nothing written)
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
const dryRun = process.env.WP_IMPORT_DRY_RUN === "true";

if (!wordpressApi) {
  fail("WORDPRESS_API_URL is required (the wp/v2 namespace base, e.g. https://example.com/wp-json/wp/v2).");
}

let client;
if (dryRun) {
  // No CMS contact: every post is treated as new and nothing is written, so the
  // report shows exactly what a real run would create and flag.
  client = {
    findByWordpressId: async () => null,
    createDraft: async () => ({ id: null })
  };
} else {
  if (!cmsUrl) {
    fail("CMS_API_URL is required (a local or dev CMS — never production). Set WP_IMPORT_DRY_RUN=true to preview instead.");
  }
  if (!email || !password) {
    fail("CMS_IMPORT_EMAIL and CMS_IMPORT_PASSWORD are required (or use WP_IMPORT_DRY_RUN=true).");
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
  client = createPayloadClient({ cmsUrl, email, password, originVerify });
}

console.log(`[wp-import] fetching up to ${limit} post(s) from ${wordpressApi}`);
const posts = await fetchWordpressPosts({ apiBase: wordpressApi, limit, perPage: Math.min(limit, 100) });
console.log(
  dryRun
    ? `[wp-import] DRY RUN: transforming ${posts.length} post(s); nothing will be written.`
    : `[wp-import] fetched ${posts.length} post(s); importing into ${cmsUrl} as drafts...`
);

if (!dryRun) {
  await client.login();
}
const report = await importWordpressPosts({ posts, client });
report.dryRun = dryRun;

mkdirSync("local-data", { recursive: true });
const reportPath = "local-data/wordpress-import-report.json";
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  `[wp-import] ${dryRun ? "DRY RUN " : ""}done: ${dryRun ? "would-create" : "created"}=${report.created} skipped=${report.skipped} failed=${report.failed} withWarnings=${report.withWarnings}`
);
for (const item of report.items) {
  const flags = item.warnings
    ? [...item.warnings.shortcodes.map((s) => `shortcode:${s}`), ...item.warnings.embeds.map((e) => `embed:${e}`)]
    : [];
  const suffix = `${item.error ? ` error=${item.error}` : ""}${flags.length > 0 ? ` flagged=${flags.join(",")}` : ""}`;
  console.log(`  - [${item.status}] wp#${item.wordpressId} ${item.slug ?? ""}${suffix}`);
}
console.log(`[wp-import] full report written to ${reportPath}`);
