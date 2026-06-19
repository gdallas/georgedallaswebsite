# Runbook: Bookshelf (GDW-040)

The bookshelf is managed in the CMS through the `books` collection and appears publicly at `/bookshelf`.

## Admin workflow

Use **Books -> Create new** or the dashboard **Add book note** action. Each book has:

- title, author, optional ISBN
- cover image from the media library
- reading status: reading, finished, paused, want to read, or reference
- optional rating, start/finish dates, rich-text notes, related posts, and external URL
- CMS publishing status, visibility, and sort order

Only `status = published` and `visibility = public` books appear on the public site. Draft, archived, private, and unlisted books remain out of the public build.

## Public display

`/bookshelf` groups books by reading status and renders notes with the same shared rich-text renderer used for posts and previews. The homepage shows public books whose reading status is `reading`.

Book covers should use public media records with useful alt text. If a public book has no cover, the page falls back to a text-only layout.

## Later work

ISBN lookup is intentionally deferred to GDW-046.
