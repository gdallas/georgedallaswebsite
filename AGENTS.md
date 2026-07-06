# AGENTS.md — machine-oriented project reference

Token-lean facts for AI agents. Human version: `docs/playbook.md`. Procedures:
`docs/runbooks/`. Backlog: `CODEX_IMPLEMENTATION_TICKETS.md` (GDW-001…052).
Rules: `CODEX_RULESET.md`.

## Stack

- Monorepo: pnpm workspaces. Node 22. No ESLint/Prettier — custom checks in
  `scripts/` (no tabs, no trailing whitespace, final newline, no raw
  `process.env` in .ts outside shared config). Applies to .md files too.
- `apps/site`: Astro 6, fully static, Pagefind search. Data from CMS REST at
  build time via `src/lib/cms.mjs` (filters + re-checks visibility).
- `apps/cms`: Payload 3 + Next 16. Deployed = Lambda Docker container
  (Web Adapter) behind CloudFront. VPC-isolated, no internet egress.
- `apps/worker/publishing`: Lambda outside VPC. S3 marker events → GitHub
  workflow dispatch + one-shot EventBridge publish schedules.
- `packages/shared`: config loader/validation, visibility + redirect rules,
  scheduling/HMAC, Lexical→HTML serializer (escaped, URL-allowlisted). Used
  by site+cms+worker; mostly .mjs with .d.ts.
- `infra`: AWS CDK (.mjs). Per env (dev|prod) 5 stacks:
  `<env>-{foundation,cms-cert,cms,site-cert,site}`; stack/resource names
  `georgedallaswebsite-<env>-<component>`. Region ca-central-1; certs
  us-east-1. Account 833090513890. Prod stacks defined, NOT deployed.

## Architecture invariants (do not break)

- Budget <$10/mo: scale-to-zero only. Aurora Serverless v2 min 0 ACU,
  15-min auto-pause (resume ~15s). No NAT gateway, no ALB, no Fargate, no
  keep-warm pings. Fixed cost >$1/mo needs ADR + PR callout.
- Public site shows only `status=published && visibility=public &&
  publishedAt<=now` — enforced in CMS access AND site data layer AND e2e.
  Never weaken one because another exists.
- CMS origin protection: CloudFront injects `x-origin-verify` (secret);
  middleware 403s without it (`/api/health` exempt). Do NOT switch the
  Function URL to OAC (can't sign browser POSTs).
- All work: branch off `develop` → PR → CI green → George merges (never
  self-merge, never push to develop/main). Merge to develop auto-deploys dev.
- No secrets in git. `apps/cms/src/payload-types.ts` is generated +
  gitignored (code uses `as never` casts) — never commit it.

## URLs / envs

dev: https://dev.georgedallas.com + https://cms-dev.georgedallas.com (LIVE).
prod: georgedallas.com/www + cms.georgedallas.com (not deployed).
local: site :4321, cms :3000 (admin `/admin`, health `/api/health`).

## Commands

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build  # CI gate; needs env vars from ci.yml
pnpm e2e                      # Playwright vs mock CMS (once: pnpm --filter @georgedallas/site e2e:install)
pnpm local:up                 # docker postgres (minio image broken — start postgres only)
pnpm --filter @georgedallas/cms dev|build|import:wordpress|content:check
pnpm --filter @georgedallas/site dev|build
```

## Publish flow

Admin publish/change → afterChange hook writes JSON marker to S3
`georgedallaswebsite-<env>-publish-control` → worker Lambda → dispatches
`rebuild-site.yml` (rebuild Astro from live CMS, s3 sync, invalidate; bursts
coalesce) — or manages one-shot EventBridge schedule → at publishedAt worker
POSTs HMAC-signed body to CMS `/api/internal/publish-scheduled` → doc
publishes → rebuild marker. All idempotent. Globals changes also rebuild.

## Secrets (Secrets Manager, `/georgedallaswebsite/<env>/<name>`)

database-credentials (RDS-gen), payload-secret, session-secret (also signs
preview tokens + contact IP hash), origin-verify, webhook-secret (publish
HMAC), github-token (MANUAL fine-grained PAT, actions:write — worker uses it
to dispatch rebuilds), email-config (future SES), external-api-keys (future).
Injected into Lambda env at deploy (CloudFormation dynamic refs) → rotation =
update secret + redeploy stack. GitHub: env vars AWS_DEPLOY_ROLE_ARN /
AWS_REGION per environment (OIDC, no stored AWS keys); repo secrets
CMS_EMAIL/CMS_PASSWORD for weekly content-checks workflow.

## Gotchas (hard-won — trust these)

- Deployed CMS auth from scripts: login returns JWT only as httpOnly cookie
  `gdw-<env>-token`; CloudFront drops Cookie header. Extract JWT, send
  `Authorization: JWT <t>`. URLSearchParams-encode `where[...]` (raw
  brackets → 400). See `apps/cms/scripts/wordpress-import/payload-client.mjs`.
- First request after idle: cold start 5–15s + Aurora resume ~15s; allow
  ~60s, retry.
- Payload `migrate:create` only works in Linux Docker (recipe in
  `docs/runbooks/cms-hosting.md`); migrations run automatically on startup
  (`prodMigrations`).
- `gh pr merge` only when mergeStateStatus MERGEABLE+CLEAN (UNKNOWN once
  dropped a commit). PowerShell mangles quoted bodies — use `--body-file`,
  `git commit -F`.
- `cdk deploy --outputs-file` keys = full stack names
  (`georgedallaswebsite-dev-site`).
- Lambda Function URL caps bodies 6 MB → media upload limit.
- Imported WP posts stay draft+private; import idempotent by
  wordpressOriginalId.
- `infra/cdk.context.json` stays committed.

## State (2026-07-06, end of day)

GDW-001…042 merged + live on dev. GDW-043…049 deferred by ADR
(docs/adr/2026-07-06-defer-growth-features-to-post-launch.md). GDW-050 done
(docs/security/threat-model.md + edge security headers). GDW-051 repo side
done: deploy-prod.yml (main → prod, protected env), rebuild-site.yml is
env-aware by dispatch ref, SNS+Lambda-error alarms per env. Also fixed since
the audit: worker 4xx retry, rebuild warm-up, Docker asset excludes,
data-layer pagination, undici override. Remaining before cutover = manual
items in docs/runbooks/launch-checklist.md (rulesets, prod-foundation first
deploy, prod PAT, credential rotation, George's final pass), then
develop→main. Post-launch: GDW-052. Details:
`docs/state-of-play-2026-07-06.md`.
