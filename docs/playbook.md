# George Dallas Website — Architecture & Operations Playbook

_Last reviewed: 2026-07-06. Human-readable companion to the runbooks in
`docs/runbooks/` (which stay authoritative for step-by-step procedures) and to
`AGENTS.md` (the token-lean version of this document for AI agents)._

## 1. What this system is

A personal publishing hub with two very different halves:

- **Public site** (`apps/site`) — a fully static Astro build. Fast, zero
  client-side framework, only ever contains published + public content.
- **CMS** (`apps/cms`) — Payload 3 on Next.js, the only server-rendered
  compute in the system. Private admin, database-backed, scale-to-zero.

Everything else exists to connect those halves safely and cheaply:
a publishing worker Lambda, shared validation/visibility logic, AWS CDK
infrastructure, and GitHub Actions pipelines. The governing constraints:

1. **Budget: under USD $10/month total** — no always-on compute, ever.
2. **Draft/private content must never reach the public site.**
3. **All changes go through PRs George approves** — no direct pushes, no
   self-merges.

## 2. The big picture

```text
                       ┌────────────────────────── GitHub ──────────────────────────┐
                       │  PRs → CI (lint/typecheck/test/build + Playwright e2e)     │
                       │  merge to develop → deploy-dev.yml                         │
                       │  rebuild-site.yml  ← workflow_dispatch from worker          │
                       └──────────────┬─────────────────────────────┬───────────────┘
                                      │ OIDC (no stored keys)       │
                                      ▼                             ▼
Visitors ──► CloudFront ──► S3 site bucket (private, OAC)   [cdk deploy + s3 sync]
             (dev./www./georgedallas.com, url-rewrite fn)
Editors ──► CloudFront (cms[-dev].georgedallas.com)
             │  injects secret x-origin-verify header
             ▼
           Lambda Function URL → CMS container (Next.js + Payload, Web Adapter)
             │  VPC isolated subnets — no internet egress
             ├──► Aurora PostgreSQL Serverless v2 (min 0 ACU, auto-pause 15 min)
             ├──► S3 media bucket (via free gateway endpoint) ─► CloudFront media CDN
             └──► S3 publish-control bucket (JSON markers)
                        │ S3 event
                        ▼
             Publishing worker Lambda (outside VPC, internet access)
                        ├──► GitHub API: dispatch rebuild-site.yml
                        └──► EventBridge Scheduler: one-shot publish schedules
                                     │ fires at publishedAt
                                     ▼
                        worker → CMS /api/internal/publish-scheduled (HMAC-signed)
```

Two AWS environments (`dev`, `prod`) from the same CDK app
(`infra/src/app.mjs`), five stacks each: `<env>-foundation`,
`<env>-cms-cert`, `<env>-cms`, `<env>-site-cert`, `<env>-site`. Certificates
live in us-east-1 (CloudFront requirement); everything else in ca-central-1.
**Prod stacks are defined but not deployed** until launch prep (GDW-051).

## 3. Components

### Public site (`apps/site`)

- Astro 6, `output: "static"`, canonical site URL `https://georgedallas.com`.
- Routes: home, `/writing` (+ `[slug]`), `/projects`, `/links`, `/now`,
  `/about`, `/contact`, `/bookshelf`, `/timeline`, `/search`, plus
  `rss.xml`, `sitemap.xml`, `robots.txt`, and `[...redirect]` pages generated
  from CMS redirects.
- Data layer `src/lib/cms.mjs`: fetches from the Payload REST API at build
  time (`CMS_API_URL`), sends a published+public `where` filter, retries
  transient failures, then **re-checks every returned doc** with the shared
  visibility predicates. Drafts can't leak even if the CMS misbehaves.
- Rich text is rendered by a dependency-free Lexical→HTML serializer in
  `packages/shared/src/rich-text.mjs` (escapes all text, allowlists URL
  protocols).
- Search: Pagefind indexes the static output at build time (`astro build &&
  pagefind --site dist`); JS loads only on `/search`.
- Design system: "Cedar Circuitry" tokens/styles in `src/styles/`,
  brand components in `src/components/brand/`.

### CMS (`apps/cms`)

- Payload 3 + Next 16, deployed as a **Lambda Docker container** (x86_64,
  1536 MB, 55s timeout) behind CloudFront via the AWS Lambda Web Adapter
  (`apps/cms/Dockerfile`). Local dev runs `next dev` on :3000.
- Collections: users, media, tags, categories, redirects, posts, pages,
  projects, links, books, timeline-entries, audit-events, import-jobs,
  imported-items, import-issues, contact-messages, content-issues,
  content-checks. Globals: site-settings, now-page.
- Publishing model: `status` (draft/published/…), `visibility`
  (public/private/…), `publishedAt`. Shared rules in
  `packages/shared/src/visibility.mjs`; hooks in `src/hooks/publishing.ts`
  validate state and compute reading time.
- Roles: `owner` (everything), `editor` (content), `read-only` (admin view),
  `api` (content read). First user becomes owner. Login lockout 5 attempts /
  15 min; audit events for auth + content changes.
- Custom admin UX: dashboard, unified admin search, SEO/social preview panel
  (`src/components/`).
- Draft preview: `/preview?token=…` — signed, expiring, per-document token;
  noindex, no-store (`src/app/preview/route.ts`).
- Security middleware: rejects any request lacking the CloudFront-injected
  `x-origin-verify` header (timing-safe compare); `/api/health` exempt
  because the Web Adapter probes it in-container.
- Migrations in `src/migrations/` run automatically on cold start via
  Payload `prodMigrations`. Generate new ones in a Linux container — the
  generator is broken on Windows (recipe in `docs/runbooks/cms-hosting.md`).

### Publishing worker (`apps/worker/publishing`)

The CMS has no internet egress, so it writes JSON markers to the
publish-control bucket; this small ARM Lambda (256 MB) reacts:

- `rebuild` marker → `workflow_dispatch` of `rebuild-site.yml` via GitHub API
  (fine-grained PAT from Secrets Manager).
- `schedule` marker → create/update/delete a **one-shot** EventBridge
  schedule named `<env>-pub-<collection>-<id>` that self-deletes after firing.
- schedule fires → POST to the CMS internal publish endpoint with an HMAC
  signature over the body; the CMS flips the doc to published (idempotent —
  anything not still due is skipped), which emits a rebuild marker in turn.

### Shared package (`packages/shared`)

Single source of truth used by site, CMS, and worker: config loader +
validation (`config.mjs` — fail-fast, refuses prod-looking DB URLs outside
prod), visibility predicates, redirect rules, scheduling/HMAC helpers,
rich-text serializer, brand tokens. Most logic is `.mjs` with `.d.ts`
declarations so it runs everywhere without a build step.

### Infrastructure (`infra`)

CDK (JavaScript, `.mjs`). Notable choices, each with an ADR or runbook:

- Aurora Serverless v2 **scale-to-zero** (min 0 ACU, 15-min pause; resume
  ~15s). Prod: 30-day backups, deletion protection, snapshot-on-delete.
- No NAT gateways; S3 gateway endpoint gives the VPC-isolated CMS free S3.
- All S3 buckets private (Block Public Access + OAC); media/site served
  only through CloudFront. Prod buckets versioned.
- CloudFront functions rewrite `/writing` → `/writing/index.html`.
- IAM: GitHub OIDC deploy role per environment (scoped to CDK bootstrap
  roles + site-bucket sync + invalidation); separate cms-runtime and
  jobs-runtime roles; deterministic ARN strings avoid circular stack deps.
- KMS key per environment (rotation enabled) encrypting all secrets.

## 4. Pipelines

### PR → dev (the everyday loop)

1. Branch off `develop` (`feature/…`, `fix/…`, `codex/…`), one ticket per PR.
2. CI (`ci.yml`): `pnpm lint`, `typecheck`, `test`, `build` with placeholder
   env, plus a separate Playwright smoke job against a mock-CMS-seeded build.
3. **George reviews and merges — never self-merge.** Wait for
   `MERGEABLE`/`CLEAN` before `gh pr merge` (an `UNKNOWN` merge state once
   silently dropped a commit).
4. Merge to `develop` → `deploy-dev.yml`: OIDC assume role → `cdk deploy` all
   five dev stacks → health-check the CMS (retry loop absorbs cold start) →
   build Astro against the live dev CMS → `aws s3 sync` + CloudFront
   invalidation → smoke tests.

### Content publish → live site

Publishing in the admin (or a scheduled publish firing) emits a rebuild
marker → worker dispatches `rebuild-site.yml` → Astro rebuilds from the live
CMS and syncs. Bursts collapse (`concurrency: cancel-in-progress: true`).
Globals changes (site settings, Now page) also trigger rebuilds. There is no
poller — content goes live in one workflow-run latency (~2–3 min).

### Scheduled publishing

Set `status: scheduled` with a future `publishedAt` → schedule marker →
one-shot EventBridge schedule → at time T the worker calls the signed
internal endpoint → doc flips to published → rebuild. Reschedules update the
schedule; unscheduling deletes it; double-fires are no-ops.

### Weekly content checks

`content-checks.yml` (Mondays 06:00 UTC) runs the link/quality checker
against the dev CMS over HTTPS and files findings in the `content-issues`
collection. No-ops until `CMS_EMAIL`/`CMS_PASSWORD` repo secrets are set.
Broken links never fail a deploy.

### Production (not yet live)

Merge to `main` should deploy prod with environment protection. The workflow
does not exist yet, and `rebuild-site.yml` + the worker's GitHub ref are
currently dev-hardcoded — parameterising them is launch-prep work (GDW-051).

## 5. Secrets and configuration

App config is validated once in `packages/shared/src/config.mjs`; every app
reads it from there (raw `process.env` in `.ts` files fails lint).

Secrets Manager, per environment, named `/georgedallaswebsite/<env>/<name>`
(all KMS-encrypted, auto-generated placeholder values unless noted):

| Secret | Used by | Notes |
| --- | --- | --- |
| `database-credentials` | CMS | RDS-generated; injected into `DATABASE_URL` at deploy |
| `payload-secret` | CMS | Payload crypto secret |
| `session-secret` | CMS | Session/preview-token signing; also keys contact IP hashing |
| `origin-verify` | CloudFront + CMS | CDN-injected header value; rotate = update secret + redeploy |
| `webhook-secret` | CMS + worker | HMAC key for the internal publish endpoint |
| `github-token` | worker | **Manual**: fine-grained PAT, `actions:write` on this repo, for workflow dispatch. Needs periodic renewal |
| `email-config` | (future SES) | Placeholder until newsletter/notifications ship |
| `external-api-keys` | (future imports/ISBN) | Placeholder |

GitHub side: environment `development` (and later `production`) holds vars
`AWS_DEPLOY_ROLE_ARN` and `AWS_REGION` — auth is OIDC, so no AWS keys are
stored. Repo secrets `CMS_EMAIL`/`CMS_PASSWORD` enable the weekly content
checks. Dependabot + dependency review run without any production secrets.

Rotation cheat sheet: DB password → rotate secret, redeploy CMS stack.
Origin-verify/webhook/payload/session secrets → same pattern (secrets are
baked into Lambda env at deploy time). GitHub PAT → regenerate in GitHub,
paste into Secrets Manager, redeploy the CMS stack (worker env). Anything
leaked: follow `SECURITY.md` — rotate at the source, treat git history as
compromised.

Never committed: `.env.local`, `payload-types.ts` (generated; code uses
`as never` casts), `cdk-outputs.json`, any real credential.

## 6. Local development

```bash
pnpm install
cp .env.example .env.local          # local-only placeholder values
pnpm local:up                       # postgres (+ minio — image tag broken; start postgres only)
pnpm --filter @georgedallas/cms dev # :3000, admin at /admin
pnpm --filter @georgedallas/site dev# :4321
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # the CI gate
pnpm e2e                            # Playwright vs mock CMS (once: e2e:install)
```

`pnpm build`/`typecheck` need the placeholder env vars from `ci.yml` exported
in the shell. WordPress re-imports: `docs/runbooks/wordpress-import.md`.

## 7. Operations notes and gotchas

- **Cold starts:** first CMS request after idle ≈ Lambda cold start (5–15s)
  + Aurora resume (~15s). Clients should tolerate ~60s once. Never add
  keep-warm pings — they defeat the entire cost model.
- **Scripting against the deployed CMS:** login returns the JWT only in an
  httpOnly cookie, and CloudFront does not forward cookies. Lift the token
  from `Set-Cookie` and send `Authorization: JWT <token>`; percent-encode
  `where[...]` params (see `apps/cms/scripts/wordpress-import/payload-client.mjs`).
- **Don't "upgrade" the Function URL to OAC** — OAC cannot sign browser POST
  bodies; the origin-verify header is the intended protection.
- **`cdk deploy --outputs-file`** keys outputs by stack *name*
  (`georgedallaswebsite-dev-site`), not the short CDK id.
- **Windows:** Payload `migrate:create` only works in Linux Docker; PR bodies
  and commit messages with quotes break PowerShell quoting — use
  `--body-file` / `git commit -F`.
- **Logs:** CloudWatch `/aws/lambda/georgedallaswebsite-<env>-cms` and
  `…-publish-worker`, 1-month retention. No alarms yet — the only alert is
  the account-level $10 AWS Budget (email at 80%/100%/forecast).
- **Imported content stays draft+private** until reviewed; the import
  pipeline is idempotent by `wordpressOriginalId`.
- Media uploads are capped ~6 MB by the Lambda Function URL body limit.

## 8. Where to look

| Concern | Location |
| --- | --- |
| Public pages / layouts / styles | `apps/site/src/{pages,layouts,components,styles}` |
| Site data layer + SEO/feeds | `apps/site/src/lib/*.mjs` |
| E2E tests + mock CMS | `apps/site/e2e/` |
| Collections / access / hooks | `apps/cms/src/{collections,access,hooks}` |
| Publish signalling / scheduling | `apps/cms/src/{publishing,hooks/publishSignals.ts}`, `apps/worker/publishing/` |
| WordPress import + content checks | `apps/cms/scripts/` |
| Shared rules (visibility, config, rich text) | `packages/shared/src/` |
| Stacks and IAM | `infra/src/*.mjs` |
| Pipelines | `.github/workflows/` |
| Procedures | `docs/runbooks/`, decisions in `docs/adr/` |
| Backlog | `CODEX_IMPLEMENTATION_TICKETS.md` (GDW-001…052) |
| Guardrails | `CODEX_RULESET.md`, `README.md`, `SECURITY.md` |
