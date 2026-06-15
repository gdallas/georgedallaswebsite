// CLI entry point for the content-health checks (GDW-037): broken links +
// content-quality findings. Runs outside the CMS (which has no internet egress),
// authenticates to the CMS REST API, persists findings to content-issues, and
// writes a content-checks run record. Idempotent and refuses the production CMS.
//
// Required env: CMS_API_URL, CMS_EMAIL, CMS_PASSWORD
// Optional env: CMS_ORIGIN_VERIFY, CONTENT_CHECKS_ALLOW_PROD=true
// Flags: --links-only | --quality-only | --dry-run

import { createPayloadClient } from "../wordpress-import/payload-client.mjs";
import { runQualityChecks } from "../../src/health/qualityChecks.mjs";
import { brokenLinkFinding, extractLinks } from "../../src/health/links.mjs";
import { checkedKindsFor, reconcileIssues } from "../../src/health/reconcile.mjs";
import { checkLinks } from "./linkChecker.mjs";

function fail(message) {
  console.error(`[content-checks] ${message}`);
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const linksOnly = args.has("--links-only");
const qualityOnly = args.has("--quality-only");
const doQuality = !linksOnly;
const doLinks = !qualityOnly;

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
if (cmsHost === "cms.georgedallas.com" && process.env.CONTENT_CHECKS_ALLOW_PROD !== "true") {
  fail("Refusing to run against the production CMS. Target local/dev only.");
}

const nowIso = () => new Date().toISOString();
const client = createPayloadClient({ cmsUrl, email, password, originVerify });
await client.login();

// 1. Fetch content (depth 0 — relationship presence is all the checks need).
const [posts, pages, media, links, projects] = await Promise.all([
  client.list("posts", {}, { limit: 500 }),
  client.list("pages", {}, { limit: 500 }),
  client.list("media", {}, { limit: 1000 }),
  client.list("links", {}, { limit: 500 }),
  client.list("projects", {}, { limit: 500 })
]);
const nowPage = await client.getGlobal("now-page").catch(() => null);

// 2. Quality findings (pure, no network).
const findings = [];
if (doQuality) {
  findings.push(...runQualityChecks({ posts, pages, media, nowPage }));
}

// 3. Broken-link findings (network, rate-limited + robots-aware).
let linksChecked = 0;
if (doLinks) {
  const occurrences = [
    ...posts.flatMap((doc) => extractLinks("posts", doc)),
    ...pages.flatMap((doc) => extractLinks("pages", doc)),
    ...projects.flatMap((doc) => extractLinks("projects", doc)),
    ...links.flatMap((doc) => extractLinks("links", doc))
  ];
  const uniqueUrls = [...new Set(occurrences.map((o) => o.url))];
  linksChecked = uniqueUrls.length;
  const results = uniqueUrls.length > 0 ? await checkLinks(uniqueUrls) : new Map();
  const seen = new Set();
  for (const occ of occurrences) {
    const result = results.get(occ.url);
    if (result?.verdict !== "broken") {
      continue;
    }
    const finding = brokenLinkFinding({ ...occ, status: result.status, error: result.error });
    if (seen.has(finding.fingerprint)) {
      continue;
    }
    seen.add(finding.fingerprint);
    findings.push(finding);
  }
}

// 4. Reconcile against currently-open issues (idempotent + auto-resolve).
const existingOpen = await client.list("content-issues", { "where[status][equals]": "open" }, { limit: 1000 });
const { toCreate, toTouch, toResolve } = reconcileIssues(
  existingOpen,
  findings,
  checkedKindsFor({ quality: doQuality, links: doLinks })
);

const brokenLinks = findings.filter((f) => f.kind === "broken_link").length;
const scanned = posts.length + pages.length + media.length + links.length + projects.length + (nowPage ? 1 : 0);

if (dryRun) {
  console.log(
    `[content-checks] DRY RUN: scanned=${scanned} linksChecked=${linksChecked} findings=${findings.length} ` +
      `(broken=${brokenLinks}) wouldCreate=${toCreate.length} wouldTouch=${toTouch.length} wouldResolve=${toResolve.length}`
  );
  for (const f of findings) {
    console.log(`  - [${f.severity}] ${f.kind} ${f.collection}/${f.documentId}${f.url ? ` ${f.url}` : ""}`);
  }
  process.exit(0);
}

// 5. Apply changes.
for (const finding of toCreate) {
  await client.create("content-issues", { ...finding, status: "open", checkedAt: nowIso() });
}
for (const { id, finding } of toTouch) {
  await client.update("content-issues", id, {
    checkedAt: nowIso(),
    httpStatus: finding.httpStatus,
    detail: finding.detail
  });
}
for (const issue of toResolve) {
  await client.update("content-issues", issue.id, { status: "resolved", resolvedAt: nowIso() });
}

// 6. Record the run.
const issuesOpen = toCreate.length + toTouch.length;
await client.create("content-checks", {
  type: linksOnly ? "links" : qualityOnly ? "quality" : "all",
  status: "completed",
  startedAt: nowIso(),
  finishedAt: nowIso(),
  scanned,
  linksChecked,
  brokenLinks,
  issuesOpen,
  issuesResolved: toResolve.length,
  notes: `${toCreate.length} new, ${toTouch.length} refreshed, ${toResolve.length} resolved.`
});

console.log(
  `[content-checks] done: scanned=${scanned} linksChecked=${linksChecked} ` +
    `created=${toCreate.length} refreshed=${toTouch.length} resolved=${toResolve.length} (broken links=${brokenLinks})`
);
