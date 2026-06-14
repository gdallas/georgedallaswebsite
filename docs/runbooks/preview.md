# Draft preview runbook

How George previews unpublished posts and pages before publishing (GDW-034).

## Why it works this way

The public site (`dev.georgedallas.com`) is a **static build** that only
contains published, public content — it cannot render a draft. The CMS
(`cms-dev.georgedallas.com`) is a running Next.js app, so the draft preview is
served **by the CMS**, separate from the static build, and gated by a signed,
expiring token.

## Using it

1. Open a post or page in the admin and click **Preview** (Payload renders the button from each collection's `admin.preview`).
2. A new tab opens `https://cms-dev.georgedallas.com/preview?token=…` rendering the **current draft** with a "Draft preview" banner. The page is `noindex`.
3. The link works for ~1 hour, then expires. Re-open from the admin to get a fresh link.

## Security model

- The preview URL carries a **signed token** (`HMAC-SHA256`, keyed by `SESSION_SECRET`) that encodes the collection, document id, and an expiry. See `apps/cms/src/preview/previewToken.mjs`.
- The token **cannot be forged or tampered with** without the secret, is **scoped to a single document**, and **expires** — a leaked link stops working and can never reach other content.
- The route (`apps/cms/src/app/preview/route.ts`) rejects invalid/expired tokens with `403`, sends `X-Robots-Tag: noindex, nofollow`, and never caches (`Cache-Control: no-store`).
- The token is only ever generated server-side for authenticated admins (the admin Preview button), so unauthenticated users have no way to obtain a valid one.

## Why it can't leak drafts publicly

- Preview lives entirely on the **CMS domain**, which is not in the public site's `sitemap.xml` and is `noindex`.
- The static public build is unaffected: it still renders only published + public content (enforced twice in `apps/site/src/lib/cms.mjs`).
- Without a valid token the route returns `403`; document ids are inside the signed token, so they can't be guessed or swapped via the query string.

## Tests

- `apps/cms/src/preview/previewToken.test.mjs` — authorized (valid token) and unauthorized (bad signature, tampered payload, expired, malformed, missing secret) paths.
- `apps/cms/src/preview/renderPreview.test.mjs` — noindex output, title/body rendering, escaping.
- Run with `pnpm test`.

## Rotating the secret

Preview tokens are keyed by `SESSION_SECRET`. Rotating it immediately
invalidates all outstanding preview links (they fail signature verification),
which is the intended revocation mechanism.
