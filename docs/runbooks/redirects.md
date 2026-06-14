# Redirects & URL preservation runbook

How legacy WordPress URLs (and any future moved URLs) are preserved on the
static site, and how to review/activate redirect proposals (GDW-033).

## Final URL structure

- Posts live at `/writing/<slug>` (e.g. `/writing/what-are-fractals-and-why-should-i-care`).
- Pages live at their own slug; `/projects`, `/links`, `/now`, `/about`, `/contact` are fixed routes.
- Old WordPress permalinks were dated (`/2014/05/29/an-engineers-guide-to-cooking/`).
  Those paths no longer exist, so each one needs a redirect to the new `/writing/<slug>`.

## How redirects are stored and reviewed

Redirects are a CMS collection (`redirects`, admin-only) with:

- **sourcePath** — internal path to match, e.g. `/2014/05/29/an-engineers-guide-to-cooking` (validated: must start with one slash, no query/fragment).
- **destination** — internal path or an `http(s)` URL (validated: no protocol-relative or local-host destinations).
- **statusCode** — `301` (default), `302`, `307`, or `308`. 301/308 are treated as **permanent**.
- **status** — review lifecycle: **Proposed → Active → Disabled**. Only **Active** redirects are emitted into the build.
- **enabled** — kill switch; unchecking removes a redirect from the build even if Active.

**The WordPress import creates redirect proposals** (`status: proposed`) from each post's old permalink. They stay out of the public site until you review them and set **status = Active**. Set them back to **Disabled** (or untick **enabled**) to pull one without deleting it.

### Loop and open-redirect protection

- Saving an **Active** redirect that would form a loop (a self-redirect, or a cycle like `/a → /b → /a`) is **blocked** by a `beforeChange` guard.
- The build independently drops any redirect that loops, points at an off-site host (open-redirect), or duplicates a source path — see `selectServableRedirects` in `packages/shared/src/redirects.mjs`.

## How redirects reach the deployed site

The host is static S3 + CloudFront with no redirect engine, so redirects are
**static output**: at build time the site fetches the active redirects and the
catch-all route `apps/site/src/pages/[...redirect].astro` emits one tiny HTML
page per redirect (`/2014/05/29/foo/index.html`). Each page:

- issues an immediate client redirect (`<meta http-equiv="refresh">` + `location.replace`),
- is marked `noindex`,
- and, for permanent (301/308) redirects, includes a `<link rel="canonical">` to the destination so search engines consolidate ranking on the new URL.

The existing CloudFront index-rewrite serves `/2014/05/29/foo` and `/2014/05/29/foo/` from that `index.html`.

> Note: pure static hosting cannot return a real 3xx status, so the stored
> `statusCode` drives canonical/permanent **semantics** rather than an HTTP
> status. This is the standard trade-off for static redirect output; if true
> edge-level 301s are needed later, generate a CloudFront Function / KeyValueStore
> map from the same `selectServableRedirects` output.

## Activating redirects (typical flow)

1. In the admin, open **Redirects**, review the proposed entries, fix any destination, and set **status = Active**.
2. Rebuild the public site: **Actions → Deploy Dev → Run workflow** (or `gh workflow run deploy-dev.yml --ref develop`). The build bakes in the now-active redirects.
3. Verify a representative legacy URL resolves (see below).

## Testing

- A representative **legacy URL list** and resolution tests live in `packages/shared/src/redirects.test.mjs` (loop detection, open-redirect blocking, chain resolution).
- HTML output and route mapping are tested in `apps/site/src/lib/redirects.test.mjs`.
- Run with `pnpm test`.
- Manual check after deploy:
  ```bash
  curl -sI https://dev.georgedallas.com/2014/05/29/an-engineers-guide-to-cooking/ | head -1
  curl -s https://dev.georgedallas.com/2014/05/29/an-engineers-guide-to-cooking/ | grep -i refresh
  ```

Redirects never expose draft/private content: they only carry a source path and
a destination URL, and the destination page is independently access-controlled
(an unpublished post still 404s).
