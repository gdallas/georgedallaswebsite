# CMS content model

GDW-019 adds the shared CMS foundations used by later writing, public site, import, and navigation tickets.

## Core entities

- `site-settings`: singleton global for site title, owner name, default SEO title/description, default social image, primary links, navigation, and footer controls.
- `redirects`: old-to-new URL mappings with source path, destination, status code, enabled flag, and notes.
- `tags`: writing and content labels with unique URL-safe slugs.
- `categories`: higher-level writing groups with unique URL-safe slugs.
- `media`: initial Payload upload shell with filename, MIME type, file size, width, height, alt text, caption, credit, source, storage key, and review status. GDW-021 will connect this shell to S3-backed storage.

## Access

All GDW-019 entities use the GDW-018 role helpers:

- owners and editors can create, update, and delete content model entries
- owners, editors, read-only users, and API users can read content model entries
- unauthenticated users cannot read or mutate these entities

Public-site read access is intentionally not opened in this ticket. GDW-025 must add the public data layer and strict published/public visibility filtering before public builds consume CMS content.

## Validation

Tags and categories require unique slugs using lowercase letters, numbers, and single hyphens.

Redirects require:

- source paths to be internal clean paths beginning with one slash
- destinations to be internal paths or `http`/`https` URLs
- no protocol-relative redirects
- no redirects to local/private development hosts

Media marked `public` requires alt text unless the item is explicitly marked decorative.

## Edit-form layout (GDW-054)

Posts, Pages, Media, and Site settings use layout-only grouping — **unnamed tabs and collapsible rows never change the stored data shape**, so no migration accompanies form re-organization. Field names, types, and the public API are unchanged.

- **Posts / Pages**: title and slug sit above three tabs — Compose (excerpt, body, images, tags), SEO (seoTitle, seoDescription, preview, social image), Advanced (author, related posts, canonical URL, redirects, reading time, WordPress import fields). The publishing triad — `status`, `visibility`, `publishedAt` — lives in the sidebar next to the save button (shared definition: `apps/cms/src/fields/publishing.ts`, `datedPublishingSidebarFields`), each with a plain-language description of the live rule: **live = Published + Public + publish date passed** (`packages/shared/src/visibility.mjs`).
- **Media**: alt text, decorative flag, caption, credit, and source lead; `reviewStatus` sits in the sidebar (it gates public exposure); `storageKey` and `importedFromWordPress` are in a collapsed "Storage and import details" section.
- **Site settings**: tabs for Identity, SEO defaults, Navigation, and Footer.

When adding a field, put it in the tab where an editor would look for it, give it a one-sentence `admin.description`, and keep operational/import fields out of Compose.
