// CLI entry point for the full WordPress import pipeline. Wires environment
// configuration to fetch -> transform -> media -> import, writes a summary
// report, and refuses to target the production CMS.
//
// Required env:
//   WORDPRESS_API_URL   wp/v2 namespace base, e.g.
//                       https://public-api.wordpress.com/wp/v2/sites/<site>
//   CMS_API_URL         a local or dev CMS base URL (never production)
//   CMS_IMPORT_EMAIL    CMS user email
//   CMS_IMPORT_PASSWORD CMS user password
// Optional env:
//   WP_IMPORT_LIMIT     max posts to import (default: all)
//   WP_IMPORT_DRY_RUN   "true" to preview (no CMS, no media download, nothing written)
//   CMS_ORIGIN_VERIFY   origin-verify secret when hitting a CMS directly
//   WP_IMPORT_ALLOW_PROD set to "true" to override the production guard

import { mkdirSync, writeFileSync } from "node:fs";
import { fetchWordpressPosts } from "./fetch.mjs";
import { runWordpressImport } from "./import.mjs";
import { createPayloadClient } from "./payload-client.mjs";

function fail(message) {
  console.error(`[wp-import] ${message}`);
  process.exit(1);
}

async function downloadImage(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type") || "application/octet-stream"
  };
}

// In-memory CMS + no-network image downloader for dry runs.
function dryRunClient() {
  const db = { "import-jobs": [], "imported-items": [], "import-issues": [], posts: [], redirects: [], media: [] };
  let id = 1;
  return {
    db,
    async create(collection, data) {
      const doc = { id: id++, ...data };
      db[collection].push(doc);
      return doc;
    },
    async update(collection, docId, data) {
      const doc = db[collection].find((row) => row.id === docId);
      Object.assign(doc, data);
      return doc;
    },
    async findOne(collection, field, value) {
      return db[collection].find((row) => String(row[field]) === String(value)) ?? null;
    },
    async uploadMedia(_buffer, meta) {
      const doc = { id: id++, ...meta };
      db.media.push(doc);
      return doc;
    }
  };
}

const wordpressApi = process.env.WORDPRESS_API_URL;
const cmsUrl = process.env.CMS_API_URL;
const email = process.env.CMS_IMPORT_EMAIL;
const password = process.env.CMS_IMPORT_PASSWORD;
const originVerify = process.env.CMS_ORIGIN_VERIFY;
const limit = process.env.WP_IMPORT_LIMIT ? Number.parseInt(process.env.WP_IMPORT_LIMIT, 10) : 1000;
const dryRun = process.env.WP_IMPORT_DRY_RUN === "true";

if (!wordpressApi) {
  fail("WORDPRESS_API_URL is required (the wp/v2 namespace base).");
}

let client;
let imageDownloader;
if (dryRun) {
  client = dryRunClient();
  imageDownloader = async () => ({ buffer: Buffer.alloc(0), mimeType: "image/png" });
} else {
  if (!cmsUrl) {
    fail("CMS_API_URL is required (a local or dev CMS — never production). Use WP_IMPORT_DRY_RUN=true to preview.");
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
    fail("Refusing to import into the production CMS. This pipeline targets local/dev only.");
  }
  client = createPayloadClient({ cmsUrl, email, password, originVerify });
  imageDownloader = downloadImage;
}

console.log(`[wp-import] fetching up to ${limit} post(s) from ${wordpressApi}`);
const posts = await fetchWordpressPosts({ apiBase: wordpressApi, limit, perPage: Math.min(limit, 100) });
console.log(
  dryRun
    ? `[wp-import] DRY RUN: processing ${posts.length} post(s); nothing will be written.`
    : `[wp-import] fetched ${posts.length} post(s); importing into ${cmsUrl}...`
);

if (!dryRun) {
  await client.login();
}

const report = await runWordpressImport({ posts, client, downloadImage: imageDownloader, source: wordpressApi });
report.dryRun = dryRun;

mkdirSync("local-data", { recursive: true });
const reportPath = "local-data/wordpress-import-report.json";
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  `[wp-import] ${dryRun ? "DRY RUN " : ""}done: imported=${report.imported} skipped=${report.skipped} ` +
    `failed=${report.failed} needsReview=${report.needsReview} media=${report.mediaImported}`
);
for (const item of report.items) {
  const extra = item.error ? ` error=${item.error}` : ` media=${item.media ?? 0} issues=${item.issues ?? 0}`;
  console.log(`  - [${item.status}] wp#${item.wordpressId}${extra}`);
}
console.log(`[wp-import] full report written to ${reportPath}`);
