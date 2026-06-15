# Runbook: search (GDW-036)

Two independent search systems: **public** (static, Pagefind) and **admin**
(Postgres-backed, inside the CMS).

## Public search — Pagefind

- The public site is a static build. After `astro build`, `pagefind --site dist`
  crawls the built HTML and writes an index + UI assets to `dist/pagefind/`. This
  is wired into the site `build` script (`apps/site/package.json`), so every
  `deploy-dev.yml` / `rebuild-site.yml` run regenerates the index — no extra
  workflow steps, no runtime database access.
- **What gets indexed:** only pages whose `<main>` carries `data-pagefind-body`.
  `BaseLayout.astro` adds it when `searchable` is true (the default), so every
  content page is indexed; the home page, the `/writing` list, and `/search`
  itself pass `searchable={false}`. Because the static build only ever contains
  published+public content (the data layer filters drafts/private/future), the
  index **inherently excludes** drafts, private, future-dated, and all CMS-only
  data (import issues, contact messages, subscribers, analytics never render).
- **UI:** `/search` (`apps/site/src/pages/search.astro`) loads the Pagefind
  Default UI from `/pagefind/pagefind-ui.js` and is itself `noindex`. "Search" is
  in the site nav.
- **Tests:** `apps/site/e2e/search.spec.mjs` builds the index over the mock-CMS
  fixtures and asserts a published post is found while "Hidden" (a word only in
  unpublished fixtures) returns nothing — proving private content isn't indexed.

## Admin search — Postgres-backed, RBAC-aware

- A unified **Search** view in the admin (nav link → `{adminRoute}/search`)
  queries posts, pages, projects, links, media, and import-issues at once and
  shows grouped results linking to each editor.
- Implementation: pure logic in `apps/cms/src/search/adminSearch.mjs`
  (`buildSearchWhere`, per-collection field config, result shaping) + the RSC view
  `apps/cms/src/components/AdminSearch.tsx`, which calls `payload.find` with
  `overrideAccess: false` and the current user. **RBAC is enforced automatically**
  — a user only sees results from collections/documents they may read.
- Matching uses Payload's Postgres `like` (ILIKE, case-insensitive contains)
  across each collection's text fields. Each collection also sets
  `admin.listSearchableFields` so the built-in per-list search box is meaningful.
- The custom view + nav link are registered in `payload.config.ts` and hand-added
  to `apps/cms/src/app/(payload)/admin/importMap.js` (no `generate:importmap`
  needed — that command is Docker-only here).
- books / timeline / contact-messages are intentionally absent from the search
  config until those collections exist.

## Upgrade path

Pagefind scales to thousands of pages; revisit only if the site grows far beyond
that. For admin search, `like`/ILIKE is ample for this content volume. If it
becomes slow or ranking matters, upgrade to **Postgres full-text search**
(`tsvector` columns + GIN index + `to_tsquery`) before considering an external
engine (Meilisearch/Typesense/OpenSearch), which requires an accepted ADR per the
ruleset.
