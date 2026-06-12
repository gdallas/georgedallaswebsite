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
