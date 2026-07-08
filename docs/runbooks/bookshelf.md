# Runbook: Bookshelf (GDW-040)

The bookshelf is managed in the CMS through the `books` collection and appears publicly at `/bookshelf`.

## Admin workflow

Use **Books -> Create new** or the dashboard **Bookshelf** capture card. Each book has:

- title, author, optional ISBN
- **cover URL** (auto-filled by the ISBN lookup) shown in the list and on the
  bookshelf; an optional uploaded **cover image** from the media library
  overrides it
- reading status: reading, finished, paused, want to read, or reference
- optional rating, start/finish dates, rich-text notes, related posts, and external URL
- CMS publishing status and visibility

Only `status = published` and `visibility = public` books appear on the public site. Draft, archived, private, and unlisted books remain out of the public build.

## Ordering (no manual sort — George, 2026-07-08)

Manual per-book ordering was retired: there is no sort-order field to fill. The
bookshelf groups by reading status and shows the **most-recently-updated books
first** within each group (`getPublicBooks` sorts by `-updatedAt`). The
`sortOrder` field is kept hidden in the schema (default 0) so no column-drop
migration was needed; it can be dropped later if desired.

## Public display

`/bookshelf` groups books by reading status and renders notes with the same shared rich-text renderer used for posts and previews. The homepage shows public books whose reading status is `reading`.

Covers render from the uploaded `coverImage` URL if present, otherwise the
`coverUrl` text field. If a public book has neither, the page falls back to a
text-only layout. The admin list shows the cover as its first column
(`components/BookCoverCell.tsx`).

## ISBN lookup (GDW-046)

Typing or pasting a checksum-valid ISBN looks the book up and offers to fill the
details — on the **Books edit form** (a suggestion card with **Use these
details**, which fills the title, author, and cover URL in one click) and on the
**dashboard Bookshelf capture card** (the title and author prefill as you type). Because the CMS Lambda has no
internet egress, the lookup runs in the admin browser against **Open Library**
(keyless, CORS-open), falling back to **Google Books**. The shared logic —
ISBN-10/13 validation and response mapping — lives in
`apps/cms/src/books/isbnLookup.mjs` (unit-tested); the debounced hook is
`books/useIsbnLookup.ts`; the edit-form component is
`components/IsbnLookupField.tsx`. A miss or a network error never blocks manual
entry, and only a valid ISBN is ever written to the record. Covers are fetched
and uploaded from the browser when the source allows it; if a host blocks the
fetch, add the cover by hand.
