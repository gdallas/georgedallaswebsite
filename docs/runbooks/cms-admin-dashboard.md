# CMS admin dashboard

GDW-023 replaces the default Payload dashboard with a calm, task-oriented homepage at `/admin`, implemented as a server component in `apps/cms/src/components/Dashboard.tsx` and registered through `admin.components.views.dashboard`.

## Sidebar navigation map (GDW-053)

Every collection and global declares an `admin.group`; the single source of truth is `apps/cms/src/admin/navigation.mjs`, and `payload.config.ts` fails the build if a collection ships ungrouped. Groups appear in the sidebar in this order (set by the order of the `collections` array in `payload.config.ts`):

| Group | Contents |
|---|---|
| Write | Posts, Pages, Media, Now page |
| Library | Projects, Links, Books, Timeline entries |
| Inbox | Contact messages |
| Site | Site settings, Tags, Categories, Redirects |
| Site health | Content issues, Content check runs |
| WordPress import | Import runs, Imported items, Import issues |
| System | Users, Audit events |

When adding a collection: add its slug to `navigation.mjs` (the unit test beside it enforces coverage), set `admin.group: collectionNavGroup("<slug>")`, give it a one-sentence `admin.description`, and insert it into the config array within its group's block.

## Start something (quick capture, GDW-063)

The first section is four live capture cards (`apps/cms/src/components/QuickCapture.tsx`, a client component rendered by the dashboard), so the week's four ways of starting need no navigation click:

- **New post** — a serif title field (autofocused on landing). Submitting creates the post through `POST /api/posts` with a client-derived slug (retries once with a suffix on a slug collision) and lands in its editor. Status/visibility come from collection defaults, so captures are always draft + private.
- **Now** — the `currentFocus` textarea, prefilled from the global; saving posts a partial update that touches nothing else on the Now page.
- **Images** — a drop target (also keyboard/browse accessible) that uploads straight to Media. Files are gated client-side against the image mime list and the 4 MB cap (the Lambda Function URL kills oversized bodies before app code, so the friendly message must fire in the browser); new images enter the alt-text queue (GDW-057) and each upload links to its edit view.
- **Bookshelf** — title + author; created with the collection defaults (want-to-read, draft, private) and linked for detail-filling.

All requests go through Payload's REST API with the admin's cookie session — access control is the collections' own. The request-body and validation rules live in `apps/cms/src/dashboard/quickCapture.mjs` with unit tests beside them.

## This week (quick actions)

With capture owning the four starts, the card row keeps only the destinations capture cannot replace (GDW-056 shape, slimmed by GDW-063):

- **Continue latest draft** — opens the most recently edited draft post, or the new-post form when no drafts exist.
- **Review inbox** — opens contact messages filtered to new + clean.

The secondary pill row holds quick link, project, timeline entry, and bulk media upload.

## Content sections

- **Recent drafts** — the four newest `draft`/`in_review` posts and pages by `updatedAt` (capped per GDW-064 feedback: short list, not a column).
- **Recently published / Scheduled** — no longer dashboard sections (GDW-064); they live as secondary pills linking to the filtered posts list.
- **Needs attention** — one consolidated list built by `buildAttentionItems`: media missing alt text, unresolved import issues, imported items awaiting review, and new contact messages, each linking to the filtered list that resolves it. Zero-count entries are dropped; when everything is clear it says so.

**Filter links must percent-encode their brackets** (build them with `collectionListHref`): Lambda Function URLs reject raw `where[...]` query strings with a bare 400 `{"message":null}`, which looks like a broken page while working fine locally (GDW-064).
- **WordPress import** — renders only while unresolved migration work exists (`hasUnresolvedImportWork`: unresolved import issues or items not yet approved). Its detail queries are skipped entirely when hidden. Once the cleanup queue is emptied the panel disappears for good; the import runbook (`docs/runbooks/wordpress-import.md`) remains the way back in.

## RBAC and safety

All dashboard queries run server-side through `payload.find` with `overrideAccess: false` and the logged-in user, so the dashboard only shows what the user's role can read. The dashboard renders inside the authenticated admin app and exposes nothing publicly. No third-party services are involved.

Query helpers live in `apps/cms/src/dashboard/dashboardData.mjs` with unit tests beside them.

## Updating the import map

Custom admin components are resolved through `apps/cms/src/app/(payload)/admin/importMap.js`. After adding or moving a component referenced in the Payload config, regenerate it with:

```bash
pnpm --filter @georgedallas/cms payload generate:importmap
```

(Requires the local placeholder environment variables, same as `pnpm build`.)
