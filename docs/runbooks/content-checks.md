# Runbook: content checks (GDW-037)

Broken-link and content-quality checks that keep the site healthy over time.
Findings live in the **content-issues** collection; each run is recorded in
**content-checks**. Both are under the admin "Site health" group, and the
dashboard shows count tiles.

## What it checks

- **Broken links** — external `http(s)` links in post/page/project rich text plus
  `links.url`, project `githubUrl`/`liveUrl`/`caseStudyUrl`, and post
  `canonicalUrl`. Each URL is checked with HEAD (GET fallback), a timeout, and
  per-host rate limiting; `robots.txt` global disallows are respected. 2xx/3xx =
  ok; hard 4xx/5xx = broken; auth/rate-limit (401/403/405/429) = skipped (avoids
  false positives from bot-blocking).
- **Content quality** (published content only) — posts missing excerpt / SEO
  title / SEO description / social (or featured) image; public, non-decorative
  media missing alt text; the Now page not updated in 90+ days.

## How it runs

The CMS Lambda has no internet egress, so checking runs as a **standalone Node
script** (`apps/cms/scripts/content-checks/run.mjs`) that talks to the CMS REST
API — never inside the public site build, so a broken external link can never
fail a deploy.

- **Manually:**
  ```
  CMS_API_URL=https://cms-dev.georgedallas.com CMS_EMAIL=you@example.com CMS_PASSWORD=… \
    pnpm --filter @georgedallas/cms content:check
  ```
  Flags: `--dry-run` (report only), `--links-only`, `--quality-only`. Refuses the
  production CMS unless `CONTENT_CHECKS_ALLOW_PROD=true`.
- **On a schedule:** `.github/workflows/content-checks.yml` runs weekly (Mondays
  06:00 UTC) and on demand (Actions → Content Checks → Run workflow). **Setup:**
  add repo secrets `CMS_EMAIL` and `CMS_PASSWORD` (a CMS user with content
  access). Until they're set, scheduled runs no-op cleanly.

## Findings lifecycle

- Runs are **idempotent**: findings are keyed by a `fingerprint`
  (`kind:collection:documentId:url`). A repeat finding refreshes `checkedAt`; a
  new one is created; a previously-open issue whose problem is gone is
  **auto-resolved** — but only for the kinds actually evaluated that run (so
  `--links-only` never resolves quality issues, and vice-versa).
- **Triage:** open a content issue and set `status` to **resolved** or
  **dismissed** (a `beforeChange` hook stamps `resolvedAt`). Dismissed issues
  won't be reopened unless the fingerprint recurs after being absent.

## Tests

- `apps/cms/src/health/qualityChecks.test.mjs`, `links.test.mjs`,
  `reconcile.test.mjs`, and `apps/cms/scripts/content-checks/linkChecker.test.mjs`
  (mocked fetch: ok/404/timeout/robots) cover finding creation for missing
  metadata and broken links without hitting the network.

## Upgrade path

Current link checking is adequate for this site's volume. If link volume grows,
add caching of results by URL/last-checked and broaden `robots.txt` parsing. If
quality rules expand, keep the pure logic in `apps/cms/src/health/`.
