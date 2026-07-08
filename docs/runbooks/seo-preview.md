# Runbook: SEO & social preview (GDW-038)

A live preview on Posts and Pages showing how the document will appear in Google
search results and on social cards, so metadata can be tuned before publishing.

## Where it is

A "Search & social preview" panel appears in the Posts/Pages editor (a Payload
`ui` field, `apps/cms/src/components/SeoPreview.tsx`). It updates **live** as you
edit the title, SEO title/description, slug, excerpt, and image fields — no save
needed.

## What it shows

- **Google card:** the effective canonical URL, title, and description.
- **Social card:** the social image (with fallback), title, and description.
- **Length guidance:** live character counts for the SEO title (~30–60) and
  description (~70–160), coloured green/amber. **Advisory only — it never blocks
  saving.** The hard "missing SEO description / missing social image" tasks are
  produced by the content checks (GDW-037), surfaced on the dashboard.

**SEO fields are optional to publish (George, 2026-07-08).** `seoTitle` and
`seoDescription` are no longer in the publishing hook's `requiredMetadata`
(Posts require only an excerpt + publish date; Pages require neither). Left
blank, the public page and this preview fall back to the title/excerpt — so the
preview *is* the suggested value, and there is nothing to make up before
publishing.

## Rules (mirror the public site — `apps/site/src/lib/seo.mjs`)

- **Effective title:** `seoTitle` if set, else `title`.
- **Effective description:** `seoDescription` if set, else `excerpt`.
- **Canonical URL:** the `canonicalUrl` field if set, otherwise derived from the
  slug — `/writing/<slug>` for posts, `/<slug>` for pages — on the production
  origin (`https://georgedallas.com`), which is what ships regardless of env.
- **Social image fallback:** `socialImage` → `featuredImage` → the default site
  image (`/brand/cedar-circuitry-wordmark.svg`). The preview labels which source
  is in use. Images are served through CloudFront (the approved media delivery).
- Structured data (JSON-LD) on the site uses the same fields, so the preview
  reflects the canonical/public data.

## Logic + tests

Derivation lives in pure `apps/cms/src/seo/seoPreview.mjs` (shared by the
component and tests). `seoPreview.test.mjs` covers the title/description
fallbacks, canonical derivation, the full social-image fallback chain, and the
length statuses.

## Scope note

Projects (and other listing-only types) have **no per-item detail page** yet, so
they have nowhere to render per-item SEO/social metadata — the preview is scoped
to Posts and Pages. Add the `ui` field + SEO fields to a type once it gains a
detail route.
