// CLI entry point for the scheduled-publish backstop. Authenticates to the CMS
// REST API and publishes any due scheduled content. Refuses the production CMS
// unless explicitly overridden.
//
// Required env:
//   CMS_API_URL    a local or dev CMS base URL (never production)
//   CMS_EMAIL      CMS user email
//   CMS_PASSWORD   CMS user password
// Optional env:
//   CMS_ORIGIN_VERIFY      origin-verify secret when hitting a CMS directly
//   SCHEDULED_PUBLISH_ALLOW_PROD  set to "true" to override the production guard

import { createPayloadClient } from "../wordpress-import/payload-client.mjs";
import { runScheduledPublish } from "./publish.mjs";

function fail(message) {
  console.error(`[scheduled-publish] ${message}`);
  process.exit(1);
}

const cmsUrl = process.env.CMS_API_URL;
const email = process.env.CMS_EMAIL;
const password = process.env.CMS_PASSWORD;
const originVerify = process.env.CMS_ORIGIN_VERIFY;

if (!cmsUrl) {
  fail("CMS_API_URL is required (a local or dev CMS — never production).");
}
if (!email || !password) {
  fail("CMS_EMAIL and CMS_PASSWORD are required.");
}

let cmsHost;
try {
  cmsHost = new URL(cmsUrl).hostname;
} catch {
  fail(`CMS_API_URL is not a valid URL: ${cmsUrl}`);
}
if (cmsHost === "cms.georgedallas.com" && process.env.SCHEDULED_PUBLISH_ALLOW_PROD !== "true") {
  fail("Refusing to run against the production CMS. This backstop targets local/dev only.");
}

const client = createPayloadClient({ cmsUrl, email, password, originVerify });
await client.login();

const report = await runScheduledPublish({ client, now: new Date() });

console.log(
  `[scheduled-publish] done: scanned=${report.scanned} published=${report.published.length} failed=${report.failed.length}`
);
for (const item of report.published) {
  console.log(`  - published ${item.collection}/${item.id}`);
}
for (const item of report.failed) {
  console.log(`  - FAILED ${item.collection}/${item.id}: ${item.error}`);
}

if (report.failed.length > 0) {
  process.exit(1);
}
