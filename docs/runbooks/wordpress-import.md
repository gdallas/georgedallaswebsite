# WordPress import runbook

The repeatable pipeline (GDW-031, building on the GDW-030 proof of concept) pulls
WordPress blog content through the REST API and imports it into Payload as
drafts, with media downloaded to S3, internal images relinked, redirects
proposed, and cleanup issues tracked for review.

Source of truth is the **WordPress REST API** (the `wp/v2` namespace). Scraping
is not used.

George's blog is **https://georgemdallas.wordpress.com/** (13 posts). It is
wordpress.com-hosted, which closes the site's own `/wp-json` (404) and serves
`wp/v2` through the public API instead, so the API base is:

```text
https://public-api.wordpress.com/wp/v2/sites/georgemdallas.wordpress.com
```

A self-hosted WordPress would instead use `https://example.com/wp-json/wp/v2`.

## What it does

`apps/cms/scripts/wordpress-import/`:

- `fetch.mjs` — pulls posts from the REST API, paginating until the limit.
- `transform.mjs` — maps each post onto the Payload `posts` shape: title, slug
  (sanitised to the CMS slug pattern), original publish date, excerpt, and a
  Lexical body (paragraphs, headings, blockquotes, lists, **inline links**, and
  **images** as relinkable markers). Stores the **original WordPress id and URL**,
  detects shortcodes/embeds, and proposes a redirect from the old permalink.
- `media.mjs` — finds image markers in a body and relinks them to Payload
  `upload` nodes once the media exists.
- `issues.mjs` — turns warnings into cleanup-queue records.
- `import.mjs` — the driver: per post it downloads images to the media library
  (under the `wordpress-imports` prefix, flagged `needs_alt_text` when alt is
  missing), relinks the body, creates a **draft / private** post, proposes a
  redirect, and records an `imported-items` row plus any `import-issues`. Tracks
  an `import-jobs` row, is **idempotent and resumable** (skips done items, retries
  failed ones), and returns a summary.
- `payload-client.mjs` — the Payload REST client (login, lookup, create, update,
  multipart media upload).
- `run.mjs` — the CLI that wires it together and writes the report.

Imported posts are always `status: "draft"`, `visibility: "private"` — nothing
is auto-published. Tracked in three admin-only collections: **import-jobs**,
**imported-items**, and **import-issues** (the cleanup queue reviewed in GDW-032).

### Flagged for review (not silently dropped)

- Shortcodes (`[gallery]`, …) and embeds (`<iframe>`, `wp:embed`, …) are kept as
  issues; the flags are conservative and can include false positives such as
  bracketed maths notation.
- Imported images with no alt text are set to `needs_alt_text`; images that fail
  to download or relink raise issues.
- Missing excerpts and duplicate slugs (disambiguated as `<slug>-wp<id>`) are
  flagged.
- The original author **name** is captured; mapping it to a Payload user is a
  later refinement (the `author` field is a user relationship).

Inline text formatting (bold/italic) is still reduced to plain text; links and
images are now preserved.

## Running it safely

The script imports into a **local or dev** CMS only — it refuses
`cms.georgedallas.com`. Credentials come from the environment and are never
committed.

### Preview first (dry run — no CMS, no credentials)

`WP_IMPORT_DRY_RUN=true` fetches and transforms the posts and prints exactly what
a real run would create and flag, without contacting any CMS:

```bash
WORDPRESS_API_URL=https://public-api.wordpress.com/wp/v2/sites/georgemdallas.wordpress.com \
WP_IMPORT_DRY_RUN=true \
WP_IMPORT_LIMIT=20 \
  pnpm --filter @georgedallas/cms import:wordpress
```

As of writing, this transforms all 13 posts with no failures and flags 3 for
review (one `iframe` embed and two bracketed `[shortcode]`-looking matches —
the flags are conservative review candidates and can include false positives
such as bracketed maths notation; they are triaged in the review queue, GDW-032).

### Real import

```bash
# Against a local CMS (docker compose up -d postgres + the CMS container):
WORDPRESS_API_URL=https://public-api.wordpress.com/wp/v2/sites/georgemdallas.wordpress.com \
CMS_API_URL=http://localhost:3000 \
CMS_ORIGIN_VERIFY=<local origin-verify secret> \
CMS_IMPORT_EMAIL=<test admin email> \
CMS_IMPORT_PASSWORD=<test admin password> \
WP_IMPORT_LIMIT=5 \
  pnpm --filter @georgedallas/cms import:wordpress

# Against the dev CMS (through CloudFront, which injects origin-verify):
WORDPRESS_API_URL=https://public-api.wordpress.com/wp/v2/sites/georgemdallas.wordpress.com \
CMS_API_URL=https://cms-dev.georgedallas.com \
CMS_IMPORT_EMAIL=<dev admin email> \
CMS_IMPORT_PASSWORD=<dev admin password> \
WP_IMPORT_LIMIT=5 \
  pnpm --filter @georgedallas/cms import:wordpress
```

| Variable | Required | Notes |
| --- | --- | --- |
| `WORDPRESS_API_URL` | yes | the `wp/v2` namespace base (see the top of this runbook) |
| `CMS_API_URL` | for real runs | local or dev CMS base; production is refused |
| `CMS_IMPORT_EMAIL` / `CMS_IMPORT_PASSWORD` | for real runs | a CMS user with content-create rights |
| `WP_IMPORT_DRY_RUN` | no | `true` to preview without a CMS or credentials |
| `WP_IMPORT_LIMIT` | no | max posts to import (default 5) |
| `CMS_ORIGIN_VERIFY` | no | origin-verify secret when hitting a CMS directly (not via CloudFront) |
| `WP_IMPORT_ALLOW_PROD` | no | must be `true` to override the production guard (don't) |

The run prints a per-post summary and writes the full report to
`local-data/wordpress-import-report.json` (created relative to the working
directory). Re-running is safe: already-imported posts are skipped.

## Tests

Transformation, pagination, and the import flow (including idempotency) are unit
tested and run with the normal suite:

```bash
pnpm test
```
