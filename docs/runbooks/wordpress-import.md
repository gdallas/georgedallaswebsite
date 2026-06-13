# WordPress import runbook

This covers the **proof of concept** (GDW-030): proving existing WordPress blog
content can be pulled through the WordPress REST API and imported into Payload as
drafts. The full repeatable pipeline (media, redirects, review queue) is GDW-031.

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
  basic Lexical body (paragraphs, headings, blockquotes, lists). It stores the
  **original WordPress id and URL** (`wordpressOriginalId` / `wordpressOriginalUrl`)
  and detects shortcodes and embeds it cannot convert.
- `import.mjs` — the driver: looks each post up by `wordpressOriginalId` and
  **skips** it if already imported (idempotent), otherwise creates it as a
  **draft / private** record. Produces a summary report.
- `payload-client.mjs` — the real Payload REST client (login + lookup + create).
- `run.mjs` — the CLI that wires it together and writes the report.

Imported posts are always `status: "draft"`, `visibility: "private"` — nothing
is auto-published, and rich formatting/links and media are intentionally left
for the full pipeline.

### Proof-of-concept limitations (flagged, not silently dropped)

- Inline formatting and links are reduced to text; media is not downloaded.
- Shortcodes (`[gallery]`, `[caption]`, …) and embeds (`<iframe>`, `wp:embed`,
  …) are reported per post in the summary so they can be handled later.
- The original author **name** is captured in the report; mapping it to a
  Payload user is deferred to GDW-031 (the `author` field is a user relationship).

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
