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

The top section gives one-click access to the weekly update workflow:

- **Continue latest draft** — opens the most recently edited draft post, or the new-post form when no drafts exist.
- **Update Now page** — opens the `now-page` global.
- **Write a new post**, **Add quick link**, **Add project**, **Upload media** — open the matching create forms.

Every action is reachable in one click after login, satisfying the one-to-two-click requirement.

## Content sections

- **Recent drafts** — newest `draft`/`in_review` posts and pages by `updatedAt`.
- **Recently published** — newest `published` posts and pages by `publishedAt`.
- **Scheduled** — `scheduled` posts in publish order, with a placeholder note until scheduled publishing lands (GDW-035).
- **Needs attention** — a live count of media with `reviewStatus = needs_alt_text` linking to the filtered media list, plus a placeholder for WordPress import review tasks until the import pipeline lands (GDW-030+).

## RBAC and safety

All dashboard queries run server-side through `payload.find` with `overrideAccess: false` and the logged-in user, so the dashboard only shows what the user's role can read. The dashboard renders inside the authenticated admin app and exposes nothing publicly. No third-party services are involved.

Query helpers live in `apps/cms/src/dashboard/dashboardData.mjs` with unit tests beside them.

## Updating the import map

Custom admin components are resolved through `apps/cms/src/app/(payload)/admin/importMap.js`. After adding or moving a component referenced in the Payload config, regenerate it with:

```bash
pnpm --filter @georgedallas/cms payload generate:importmap
```

(Requires the local placeholder environment variables, same as `pnpm build`.)
