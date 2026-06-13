# Public data layer

GDW-025 connects the static Astro site to the CMS while guaranteeing that only published, public content can ever reach a public page.

## Single source of truth

Visibility rules live in `packages/shared/src/visibility.mjs` and are imported by both sides:

- `publicBuildWhere(now)` / `isPublicBuildVisible(doc, now)` — posts and pages: `status = published`, `visibility = public`, `publishedAt <= now`.
- `publicListingWhere()` / `isPublicListingVisible(doc)` — projects and links: `status = published`, `visibility = public`.
- `isNowPagePublic(doc)` — the Now global: `status = published`.

## Two enforcement layers

1. **CMS access control** (`apps/cms/src/access/payloadAccess.ts`). Authenticated CMS roles read everything; anonymous callers are constrained by a query filter:
   - posts, pages → `requirePublicOrContentReadBuild` (published + public + past publish date)
   - projects, links → `requirePublicOrContentReadListing` (published + public)
   - media → `requirePublicOrContentReadMedia` (`reviewStatus = public` only)
   - tags, categories, site settings, Now global → `allowPublicRead` (non-sensitive). The Now global also strips its content for anonymous callers until published, via an afterRead hook.
   - users, audit events, redirects stay authenticated-only and are never queried by the public build.

2. **The site data layer** (`apps/site/src/lib/cms.mjs`). Every helper sends the published where-clause *and* re-filters the response with the shared predicates, so a wrong or overly broad CMS response still cannot render drafts, private, archived, unlisted, or future-scheduled content.

The origin-verify header (see `cms-hosting.md`) is the network layer on top of these data layers: the public build reaches the CMS through CloudFront, which injects the header.

## Helpers

`apps/site/src/lib/cms.mjs` exposes `getPublishedPosts`, `getPublishedPost`, `getPublishedPages`, `getPublishedPage`, `getPublicProjects`, `getPublicLinks`, `getNowPage`, and `getSiteSettings`. Each accepts an optional `{ baseUrl, fetchImpl, now }` config; the base URL defaults to `CMS_API_URL`. Types are in `cms.d.ts`.

## Failure behavior

If the CMS is unreachable or returns a non-2xx response, the helpers throw `CmsUnavailableError`. The public build is expected to fail loudly rather than publish a site with content silently missing. Author relationships are intentionally not exposed publicly (the `users` collection stays private); the public site uses `siteSettings.ownerName` instead.

## Public routes (GDW-026)

The MVP public pages in `apps/site/src/pages` consume the data layer through `apps/site/src/lib/content.mjs`:

- `/`, `/about` (CMS page, slug `about`), `/now` (Now global), `/writing` + `/writing/[slug]`, `/projects`, `/links`, `/contact`.
- Post and page bodies are rendered from Lexical rich text by `apps/site/src/lib/richText.mjs`, a dependency-free serializer that escapes text and validates link URLs (blocks `javascript:` etc.).
- Every page has a meaningful title and meta description and a graceful empty state.

### Build modes

`content.mjs` checks `CMS_API_URL`:

- **unset** (e.g. the CI `pnpm build` that only validates the Astro build): pages render empty states and the build succeeds.
- **set**: pages fetch real content; if the CMS is unreachable the build fails loudly (via `CmsUnavailableError`) rather than publishing a half-empty site. The live build wiring (passing `CMS_API_URL` and reaching the CMS through CloudFront) arrives with the frontend hosting ticket (GDW-014).

## Tests

- `packages/shared/src/visibility.test.mjs` — the shared predicates and where-builders.
- `apps/site/src/lib/cms.test.mjs` — query construction, response filtering for representative draft/private/future cases, and safe failure, all with a mocked fetch.
- `apps/site/src/lib/richText.test.mjs` — rich-text rendering and URL safety.
