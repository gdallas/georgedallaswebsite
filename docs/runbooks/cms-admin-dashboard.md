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

## This week (quick actions)

The top section is the weekly core loop as four primary cards (GDW-056):

- **Continue latest draft** — opens the most recently edited draft post, or the new-post form when no drafts exist.
- **Write a new post** — opens the create form.
- **Update Now page** — opens the `now-page` global.
- **Review inbox** — opens contact messages filtered to new + clean.

Everything else (quick link, project, book note, timeline entry, media upload) sits in a compact secondary pill row below the cards — visually demoted but still one click.

## Content sections

- **Recent drafts** — newest `draft`/`in_review` posts and pages by `updatedAt`.
- **Recently published** — newest `published` posts and pages by `publishedAt`.
- **Scheduled** — `scheduled` posts in publish order.
- **Needs attention** — one consolidated list built by `buildAttentionItems`: media missing alt text, unresolved import issues, imported items awaiting review, and new contact messages, each linking to the filtered list that resolves it. Zero-count entries are dropped; when everything is clear it says so.
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
