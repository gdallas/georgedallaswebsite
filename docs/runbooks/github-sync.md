# Runbook: GitHub project sync (GDW-045)

Keeps a synced list of your GitHub repositories in the CMS so you can turn chosen
ones into public Projects — without the CMS ever talking to GitHub directly.

## How it works

The CMS Lambda has no internet egress, so the sync runs where both GitHub and the
CMS are reachable: a scheduled **GitHub Action** (`.github/workflows/github-sync.yml`).

1. The Action fetches your public repos from the GitHub REST API
   (`apps/cms/scripts/github-sync/run.mjs`).
2. It POSTs them to the CMS internal endpoint `/api/internal/github-sync`, signed
   with an HMAC over the raw body (keyed by the shared webhook secret) — the same
   scheme the publishing worker uses, on top of the CloudFront `x-origin-verify`
   header the middleware checks.
3. The endpoint upserts each repo into **`github-repos`** (by GitHub id) and
   records a **`github-sync-runs`** row. It never touches your
   promote/project choices on an existing repo, and the public site never reads
   these collections, so a sync failure can't break a build.

Runs **weekly** (Mondays) and on demand via **Actions → GitHub Project Sync → Run
workflow**.

## Turning a repo into a project

Open **Library → GitHub repos**, find the repo, tick **Promote to project**, save.
A **draft, private** Project is created (`promoteRepoToProject` hook), seeded with
the title, summary, GitHub URL, homepage, and technologies (language + topics), and
linked back to the repo. Edit it and publish when ready — nothing goes public
automatically. Later syncs update the repo's metadata but never overwrite the
project.

## One-time setup (manual)

The Action authenticates to the CMS with the **webhook secret** the CMS already
uses for scheduled publishing (`WEBHOOK_SECRET` in the CMS Lambda env, from Secrets
Manager) — no infra change. Set these in the GitHub repo:

- **Variable** `CMS_SYNC_URL` — the CMS origin, e.g. `https://cms.georgedallas.com`
  (or `https://cms-dev.georgedallas.com` for dev).
- **Secret** `CMS_SYNC_SECRET` — the same value as the CMS webhook secret
  (`/georgedallaswebsite/<env>/webhook-secret` in Secrets Manager, the `placeholder` key).
- **Variable** `SYNC_GITHUB_USER` *(optional)* — the GitHub username to sync;
  defaults to `gdallas`. It is **not** named `GITHUB_SYNC_USER` because GitHub
  reserves the `GITHUB_` prefix for its own variable/secret names.

The Action uses the built-in `GITHUB_TOKEN` only to raise the GitHub API rate limit;
public repos are readable without it.

## Failure handling

- Each run writes a `github-sync-runs` row with `status` (success / partial / error)
  and any per-repo errors — check there if repos look stale.
- The endpoint returns 401 for a bad signature, 400 for a malformed/stale body,
  503 if the webhook secret isn't configured.
- Rate limiting / API errors surface as a failed Action run; the public site is
  unaffected because it never reads these collections.
