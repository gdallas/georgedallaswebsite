# CMS personal hub modules

GDW-022 adds the structured personal hub content modules beyond posts and pages: the Now page, projects, and links.

## Now page

`now-page` is a singleton global, not a collection. It supports quick personal status updates:

- `currentFocus`, `work`, `reading`, `listening`, `watching`, `personal`: free-text sections.
- `status`: `draft`, `published`, or `archived`.
- `updatedAt` is tracked automatically by Payload.

The Now page is only eligible for public builds when `status = published`. The public data layer (GDW-025) must use the `isNowPagePublic` helper before rendering `/now`.

The admin dashboard ticket (GDW-023) should surface a prominent "Update Now page" action pointing at this global.

## Projects

`projects` is the portfolio collection:

- content: `title`, unique `slug`, `summary`, rich text `description`, `image`, `technologies`.
- links: `githubUrl`, `liveUrl`, `caseStudyUrl` — optional, validated as http(s) URLs that cannot point at local/private hosts.
- timeline: `startDate`, `endDate`.
- curation: `featured`, `sortOrder` (ascending default sort), `relatedPosts`.
- exposure: `status` (`draft`/`published`/`archived`) and `visibility` (`public`/`unlisted`/`private`).

## Links

`links` is the structured link hub for LinkedIn, GitHub, the counselling website, other sites, social profiles, project links, and recommended resources:

- `title`, required `url`, `description`, `category`, optional `icon`.
- `url` must be an internal path or an http(s) URL and cannot be protocol-relative or point at local/private hosts.
- curation: `featured`, `sortOrder` (ascending default sort).
- exposure: `status` and `visibility`, same as projects.

The architecture addendum lists only `visibility` for links; `status` is added so that links follow the same safe-by-default lifecycle as projects and new entries start as non-public drafts.

## Listing status vs publishing status

Projects, links, and the Now page use a simpler listing status (`draft`, `published`, `archived`) than posts and pages. They have no `publishedAt` and no scheduling; scheduled publishing (GDW-035) only applies to the writing workflow.

## Public visibility

Projects and links are only eligible for public builds when:

```text
status = published
visibility = public
```

The shared helpers `isPublicListingVisible` and `publicListingWhere` in `apps/cms/src/validation/content.mjs` encode this rule, and GDW-025 must consume them so drafts, archived entries, and private/unlisted entries never reach the public site.

## Access and audit

All three modules use the GDW-018 role helpers: owners and editors can mutate, all authenticated roles can read, and unauthenticated requests are denied. Changes and deletes are recorded in the audit log, including a `content_published` event when status transitions to `published`.
