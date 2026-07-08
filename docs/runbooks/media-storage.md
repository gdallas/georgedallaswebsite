# Media Storage Runbook

CMS media is stored in private S3 buckets and delivered through CloudFront.

## Putting images into posts (GDW-057)

Getting an image into a post body is native Payload behavior — no custom
editor code:

- **Drag a file into the post body** (or paste one): Lexical's upload feature
  inserts a placeholder at the drop position and opens the bulk-upload drawer
  prefilled with the file. Saving the drawer replaces the placeholder with a
  real media reference; cancelling removes it. The same drawer serves the
  toolbar's upload button and list-view bulk upload.
- **Alt text is asked for up front**: the drawer shows the media form (alt
  first, then decorative/caption/credit/source — all optional at this stage).
  Any *image* saved without alt text and not marked decorative is created
  with `reviewStatus = needs_alt_text` (`initialMediaReviewStatus`), which
  puts it in the dashboard's Needs attention list immediately. Alt text
  becomes a hard requirement when the media is flipped to **Approved
  public** — which is also what the public site requires before it will
  serve the file at all, so a forgotten alt can't leak into the public site.
- **Failure messages**: unsupported types are rejected against the
  collection's `mimeTypes` list; oversized files get "Media file exceeds the
  4 MB upload limit…" from `validateMediaFileMetadata`. The 4 MB app cap is
  deliberately below the Lambda Function URL's ~4.5 MB effective body
  ceiling so that message — not an opaque network error — is the one that
  fires (see `docs/runbooks/cms-hosting.md`). Larger files would need
  presigned client uploads, a documented follow-up, not a raised cap.
- **Pasting an image copied from the web** (GDW-064): when the clipboard
  carries `text/html` (copying from a browser or most apps does), Lexical
  bails on the file path, imports the `<img>` as a *pending* upload node,
  and the browser cannot download the remote image (CORS) — historically the
  node stayed pending and the save died with "not a valid upload ID". A
  `beforeValidate` hook on posts/pages
  (`src/validation/richTextUploads.mjs`) now downloads the image
  server-side (image mime types only, 4 MB cap, 8 s timeout, private hosts
  blocked outside local dev), creates the media document (altless → the
  needs-alt-text queue), and rewrites the node into a real reference.
  Anything unresolvable is stripped so a draft can always save; the pasted
  image just disappears rather than wedging the document. This is the same
  trust decision as the WordPress importer's media download; the media
  form's `pasteURL` stays disabled.

## Resources

Each environment has:

- S3 bucket: `georgedallaswebsite-<environment>-media`
- CloudFront distribution for public media delivery

The S3 buckets block all public access and use S3-managed encryption at rest. Direct public listing is disabled. Public media should be referenced through the CloudFront distribution domain or a future reviewed custom media domain.

The CMS uses `MEDIA_PUBLIC_URL` as the public delivery base URL for media records. In deployed environments this value should be the environment's CloudFront media distribution URL or reviewed media custom domain. Local development can use the MinIO bucket URL, for example `http://localhost:9000/georgedallas-local-media`.

## Prefixes

Approved top-level prefixes:

- `uploads/`
- `wordpress-imports/`
- `book-covers/`
- `project-images/`
- `social-images/`

The CMS runtime role has read/write access only within these prefixes.

## Versioning and Lifecycle

Production media bucket versioning is enabled. Development versioning is disabled by default.

Lifecycle rules are conservative: incomplete multipart uploads are aborted after seven days. No rule deletes original media objects without explicit review.

## CORS

CORS is limited to the expected public and CMS origins:

- production: `https://georgedallas.com`, `https://www.georgedallas.com`, `https://cms.georgedallas.com`
- development: `https://dev.georgedallas.com`, `https://cms-dev.georgedallas.com`

## Backups

Production S3 versioning protects against accidental overwrite or deletion. Additional replication or archival policies should be evaluated after launch once real media volume and cost are known.
