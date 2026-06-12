# CMS publishing

GDW-020 adds the first writing workflow collections: `posts` and `pages`.

## Publishing states

Posts and pages use the same publishing states:

- `draft`: working content, not public.
- `in_review`: ready for review, not public.
- `scheduled`: intended for future publishing. Requires a future `publishedAt`.
- `published`: eligible for public build output when visibility is also `public` and `publishedAt` is not in the future.
- `archived`: retained in the CMS, not public.

## Visibility

Visibility is separate from publishing state:

- `public`: can be included by public builds only when status and dates also allow it.
- `unlisted`: not included in normal public indexes.
- `private`: CMS-only.

The public build helper only includes documents with:

```text
status = published
visibility = public
publishedAt <= build time
```

GDW-025 will consume this helper from the public data layer so public pages do not accidentally render drafts, private content, archived content, or future scheduled content.

## Validation

Published content requires:

- `publishedAt`
- `seoTitle`
- `seoDescription`
- posts also require `excerpt`

Scheduled content requires a future `publishedAt`.

Slugs are unique within each collection and are not automatically changed by the CMS. Edit slugs deliberately, especially after publication.

## Reading time

Posts store an estimated `readingTime` in minutes. The value is recalculated from rich text content before saves.
