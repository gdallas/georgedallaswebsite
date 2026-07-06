# Repository audit — 2026-07-06

Full-repo review of code quality, efficiency, and resource use, covering
`apps/cms`, `apps/site`, `apps/worker`, `packages/shared`, `infra`, `scripts`,
CI workflows, and docs. Unit suite verified locally: **271/271 tests pass in
~19s**. Working tree was clean apart from a line-endings-only diff on
`apps/site/e2e/build-fixtures.mjs`.

## Verdict

This is an unusually disciplined codebase for a personal-site project. The
architecture matches its constraints (single owner, <$10/month, low traffic)
almost perfectly: static-first public site, scale-to-zero CMS and database,
and no always-on compute anywhere. Code is small (~17k LOC of source), heavily
tested for its size (34 test files, dependency-free `node:test`), and comments
consistently explain *constraints* rather than restating code. Security
posture is well above typical for this class of project.

Ratings (relative to the project's own goals):

- Code quality: **A**. Consistent style, small modules, shared logic actually
  shared (`packages/shared` visibility/scheduling/rich-text used by site, CMS,
  and worker), generated artifacts kept out of git.
- Efficiency / resource use: **A-**. Idle cost is ~$4–5/month dev; every
  fixed-cost decision is documented. The main inefficiency is deploy-time
  (Docker asset rebuilds — finding 3), not runtime.
- Operational readiness for prod: **B-**. Dev pipeline is solid; prod
  pipeline, alarms, and several hardcoded dev assumptions remain (see
  `docs/state-of-play-2026-07-06.md`).

## Strengths worth preserving

- **Visibility defence in depth.** Public exposure rules live once in
  `packages/shared/src/visibility.mjs` and are enforced three times: Payload
  access control (`apps/cms/src/access/payloadAccess.ts`), the site data
  layer's query + re-check (`apps/site/src/lib/cms.mjs`), and Playwright e2e
  assertions that draft/private/future content never renders.
- **Cost-aware infrastructure.** Aurora Serverless v2 with min 0 ACU and
  15-minute auto-pause; no NAT gateways (free S3 gateway endpoint instead);
  CloudFront `PRICE_CLASS_100`; 1-month log retention; 1-day expiry on the
  publish-control bucket; budget alert at $10. Trade-offs are recorded in ADRs
  and `docs/runbooks/cost-controls.md`.
- **The publishing control plane.** The VPC-isolated CMS signals the outside
  world by dropping JSON markers in S3; a small non-VPC Lambda dispatches
  GitHub rebuilds and manages one-shot EventBridge schedules
  (`ActionAfterCompletion: DELETE` — nothing to clean up). All three paths are
  idempotent, and rebuild bursts collapse via workflow concurrency.
- **Security done proportionately.** GitHub OIDC deploys (no long-lived
  keys), scoped IAM with deterministic ARN references to avoid circular stack
  dependencies, KMS-encrypted secrets, private-by-default S3 with OAC,
  CloudFront origin-verify header with a timing-safe comparison, HMAC-signed
  internal publish endpoint, signed expiring preview tokens, login lockout,
  audit-event collection, allowlist-based rich-text URL sanitisation.
- **Documentation.** 24 runbooks, 5 ADRs with real reasoning, an ordered
  ticket backlog, and code comments that capture hard-won operational
  knowledge (OAC cannot sign browser POSTs; cookie-vs-JWT auth through
  CloudFront; Windows migration tooling).

## Findings

Ordered by priority. None are launch-blocking on dev; items 1–4 should land
before production cutover.

### 1. Publishing worker retries non-retryable 4xx responses (bug)

`apps/worker/publishing/index.mjs` (`publishDoc`): the `throw` for 4xx
responses sits *inside* the `try`, so the surrounding `catch` swallows it and
the loop retries anyway — the comment says the opposite. A bad signature or
body burns all 5 attempts (~45s of Lambda time) before failing. Fix: track a
`fatal` flag or re-throw outside the loop when status is 4xx.

### 2. Secrets are materialised in Lambda environment variables

`infra/src/cms-service.mjs` and `publishing-worker.mjs` inject secrets
(including the database password and the GitHub PAT) via
`secretValueFromJson(...).unsafeUnwrap()`. CloudFormation dynamic references
keep them out of the template *source*, but the resolved values are visible in
the deployed function configuration (`lambda:GetFunctionConfiguration`,
console) and rotation requires a redeploy. Acceptable for a single-owner
account, but it should be an explicitly accepted risk in the GDW-050 threat
model — or moved to runtime Secrets Manager reads (adds cold-start latency and
a VPC endpoint cost for the CMS, so document either way).

### 3. CMS Docker asset rebuilds on unrelated repo changes (deploy time + ECR growth)

`infra/src/cms-service.mjs` passes `exclude: ["infra/cdk.out", ".git",
"node_modules", "**/node_modules", "**/.next"]` to `fromImageAsset`, but the
build context is the repo root — so docs, tickets, and `apps/site` changes all
change the asset hash (multiple full staged copies are visible under
`infra/cdk.out/asset.*`). Consequences: every merge rebuilds and pushes the
CMS image even when the CMS is untouched, and the CDK bootstrap ECR repo
accumulates images indefinitely (ECR is $0.10/GB/month; a Payload/Next image
is several hundred MB). Recommendations:

- Extend the exclude list to at least `apps/site`, `docs`, `*.md`,
  `.github`, `local-data`, e2e artifacts.
- Periodically run `cdk gc` (or add an ECR lifecycle policy on the CDK assets
  repository) so old images stop counting toward the budget.

### 4. `rebuild-site.yml` builds against a possibly-cold CMS with a small retry budget

`deploy-dev.yml` warms the CMS with a retrying health check before building
the site; `rebuild-site.yml` goes straight to `astro build`. The data layer
retries 3× with a 2s delay (`apps/site/src/lib/cms.mjs`), which does not cover
a worst-case Lambda cold start + Aurora resume (~30–45s). PR #87 already
softened this; a `curl` warm-up step (copy of the deploy workflow's health
loop) would remove the remaining flake class cheaply.

### 5. Site data layer caps every collection at 100 documents

`fetchDocs` hardcodes `limit=100` with no pagination. Fine at 13 posts;
silently truncates the writing index, RSS, sitemap, and redirects once any
collection passes 100. Also `getPublishedPost(slug)` refetches the whole post
list per call (harmless in a static build, but worth a comment). Add
pagination-follow or a loud failure when `totalDocs > docs.length`.

### 6. Database URL is built by string concatenation

`infra/src/cms-service.mjs` concatenates the generated password into
`postgres://payload_cms:<pw>@...`. RDS-generated secrets exclude most
URL-reserved characters, so this works today, but it is an implicit contract —
percent-encode the password (or a comment stating the exclusion assumption)
would make it robust.

### 7. Documentation drift (small, worth a sweep)

- `docs/runbooks/cost-controls.md` says "six Secrets Manager secrets ~$2.40";
  `infra/src/security-foundation.mjs` defines seven (~$2.80).
- `docs/runbooks/cms-hosting.md` deployment section lists three stacks;
  `deploy-dev.yml` deploys five (adds `dev-site-cert`, `dev-site`).
- `README.md` still says Astro/Payload are "intentionally deferred" and that
  the site dev command "prints scaffold status" — both long since implemented.
  The "Target architecture" block still lists ECS Fargate, superseded by the
  Lambda-hosting ADR.
- `SESSION_HANDOFF.md` is dated 2026-06-14 and no longer reflects reality
  (merged state is through GDW-041).

### 8. No static analysis beyond the custom scripts

`scripts/lint.mjs` checks whitespace, tabs, trailing newline, and raw
`process.env` usage — deliberate and dependency-light, but nothing catches
unused variables, unawaited promises, or suspicious types. TypeScript strict
`tsc --noEmit` covers the `.ts` half; the `.mjs` half (site lib, worker,
import pipeline) has only tests. Consider ESLint (or at least
`typescript-eslint` on checkJs mode for the `.mjs` files) before the codebase
grows further. Low urgency; the test discipline compensates today.

### 9. Minor notes

- `middleware.ts` exempts only `/api/health` from origin verification —
  correct, and the timing-safe compare avoids `node:crypto` for edge
  compatibility. Good.
- Contact form: origin check, honeypot/classification, hashed IP (keyed by
  session secret), and admin-only inbox are all present; there is no
  rate-limiting/WAF in front of it. Reasonable accepted risk at this traffic
  level — record it in the threat model.
- `content-checks.yml` uses repo secrets `CMS_EMAIL`/`CMS_PASSWORD`; runs
  no-op cleanly until set. Prefer a dedicated low-privilege CMS user and note
  a rotation cadence.
- Media uploads are capped at ~6 MB by the Lambda Function URL (documented in
  `cms-hosting.md`); presigned client uploads are the eventual fix.
- Root `pnpm test` glob runs 271 tests in ~19s with zero test dependencies —
  keep it that way.

## Efficiency and resource-use summary

Runtime (dev environment, deployed):

- Fixed: KMS key $1, 7 secrets ~$2.80, Aurora storage ~$0.10, S3/CloudFront/
  Route 53 zone pennies → **~$4–5/month idle**, matching the runbook estimate.
- Variable: Aurora ACU-hours during editing sessions, Lambda GB-seconds
  (1536 MB CMS, 256 MB ARM worker), CloudFront invalidations (`/*` counts as
  one path; 1,000 free/month — rebuild frequency is nowhere near it).
- Prod deployment will roughly double the fixed baseline (second KMS key,
  secrets, Aurora storage) — already anticipated in cost-controls.md. Budget
  headroom at $10 is adequate but not generous; ECR growth (finding 3) is the
  main silent creep.

Build/CI: two CI jobs (quality + e2e) on PRs, deploy on merge. `pnpm install`
dominates; caching is configured. The CMS Docker rebuild (finding 3) is the
biggest avoidable deploy-time cost. The site build queries the live CMS —
correct for content freshness and cheap at current content volume.

Frontend: static Astro output, no client-side framework, Pagefind only loads
on the search page, system-font/SVG brand assets. Page weight and JS budget
are excellent.
