# WordPress import runbook

This covers the **proof of concept** (GDW-030): proving existing WordPress blog
content can be pulled through the WordPress REST API and imported into Payload as
drafts. The full repeatable pipeline (media, redirects, review queue) is GDW-031.

Source of truth is the **WordPress REST API** (`/wp-json/wp/v2/posts`). Scraping
is not used.

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

```bash
# Against a local CMS (docker compose up -d postgres + the CMS container):
WORDPRESS_API_URL=https://your-old-blog.example.com/wp-json \
CMS_API_URL=http://localhost:3000 \
CMS_ORIGIN_VERIFY=<local origin-verify secret> \
CMS_IMPORT_EMAIL=<test admin email> \
CMS_IMPORT_PASSWORD=<test admin password> \
WP_IMPORT_LIMIT=5 \
  pnpm --filter @georgedallas/cms import:wordpress

# Against the dev CMS (through CloudFront, which injects origin-verify):
WORDPRESS_API_URL=https://your-old-blog.example.com/wp-json \
CMS_API_URL=https://cms-dev.georgedallas.com \
CMS_IMPORT_EMAIL=<dev admin email> \
CMS_IMPORT_PASSWORD=<dev admin password> \
WP_IMPORT_LIMIT=5 \
  pnpm --filter @georgedallas/cms import:wordpress
```

| Variable | Required | Notes |
| --- | --- | --- |
| `WORDPRESS_API_URL` | yes | WordPress REST base, e.g. `https://blog.example.com/wp-json` |
| `CMS_API_URL` | yes | local or dev CMS base; production is refused |
| `CMS_IMPORT_EMAIL` / `CMS_IMPORT_PASSWORD` | yes | a CMS user with content-create rights |
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
