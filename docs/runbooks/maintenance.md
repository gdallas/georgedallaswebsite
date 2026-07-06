# Maintenance runbook (GDW-052)

How the site stays healthy after launch (2026-07-06). The standing rule for
everything here: **maintenance never bypasses review** — every change lands
via a PR with green CI (the develop/main rulesets enforce it), and nothing
deploys to production except a merge to `main`.

## What runs automatically

| What | When | Where | Failure signal |
| --- | --- | --- | --- |
| Dependabot PRs (npm + Actions) | Weekly | `.github/dependabot.yml` → PRs into `develop` running full CI | Open PRs pile up |
| Dependency review | Every PR | `dependency-review.yml` | Red check on the PR |
| Content checks (broken links + quality) | Mondays 06:00 UTC | `content-checks.yml`, dev + prod legs | Issues appear in that CMS's content-issues queue; red run emails the owner |
| Prod smoke test (site, www, RSS, sitemap, 404, CMS health) | Mondays 06:30 UTC | `prod-smoke.yml` | Red scheduled run emails the owner |
| Lambda error alarms (CMS + publish worker, both envs) | Continuous | SNS `georgedallaswebsite-<env>-alerts` | Email from AWS |
| Budget alert ($10/mo, whole account) | Continuous | AWS Budgets | Email at 80%/100%/forecast |

Enable the content-check legs by adding repo secrets: `CMS_EMAIL`/`CMS_PASSWORD`
(dev) and `PROD_CMS_EMAIL`/`PROD_CMS_PASSWORD` (prod) — use a dedicated
editor-role CMS user per environment, not the owner account. A leg with no
secrets skips cleanly.

## Weekly (~10 minutes)

- Review and merge Dependabot PRs (CI must be green; majors deserve a read of
  the changelog). Merging to `develop` auto-deploys dev; promote to `main`
  when dev looks right.
- Triage new entries in both content-issues queues (admin → Site health).
- Glance at the Monday scheduled runs — a red `Prod Smoke` or `Content
  Checks` run is actionable, everything green needs nothing.

## Monthly (~15 minutes)

- Cost: check the budget emails / Cost Explorer filtered by tag
  `project=georgedallaswebsite`. Baseline is ~$8–10/month for both
  environments — investigate anything trending past it.
- Clean old CMS container images so ECR storage doesn't creep:
  `cd infra && npx cdk gc --unstable=gc aws://833090513890/ca-central-1`
  (review its prompt before confirming).
- Skim CloudWatch alarm history (both envs) for anything that fired and
  self-resolved.

## Quarterly

- **Restore drill** (policy: `database-backup-restore.md`): point-in-time
  restore the prod cluster to a scratch cluster, confirm it reaches
  `available`, delete it (`--skip-final-snapshot`). Record below.
- **Rotate the prod GitHub PAT** (it expires at 90 days regardless):
  fine-grained, this repo only, Actions read+write → put-secret-value into
  `/georgedallaswebsite/prod/github-token` (`placeholder` key) → the value
  bakes into the worker on the next prod deploy, or push it immediately with
  `aws lambda update-function-configuration` on
  `georgedallaswebsite-prod-publish-worker`.
- **Accessibility pass**: the automated baseline runs in every CI build;
  quarterly, walk the manual checklist in `accessibility.md` on 2–3 pages
  including one article.
- **Performance pass**: Lighthouse (or PageSpeed Insights) on the homepage
  and one article. The site is static with near-zero JS — scores below ~95
  mean something regressed; check image sizes first.
- **Security review**: re-read the accepted risks in
  `docs/security/threat-model.md`; confirm they still hold. Extend the model
  in the same PR as any new public surface (newsletter, webmentions).

### Restore drill record

| Date | Environment | Result |
| --- | --- | --- |
| 2026-07-06 | dev | PITR to scratch cluster reached available; deleted |

## Security updates

- Routine CVEs arrive as Dependabot PRs — merge them like any PR; CI +
  dependency review gate them.
- For an advisory in a transitive dependency Dependabot can't lift, add a
  scoped override to **both** `package.json` (`pnpm.overrides`) and
  `pnpm-workspace.yaml` (`overrides`), run `pnpm install`, and PR the
  lockfile (pattern: the undici fix, PR #94).
- Critical/actively-exploited: treat as an incident (below) — patch, deploy
  through the normal pipeline the same day, then verify.

## Secret rotation (any time one is suspected exposed, else annually)

| Secret | Rotate by | Then |
| --- | --- | --- |
| CMS owner/user passwords | Admin UI | Nothing else |
| `payload-secret`, `session-secret` | put-secret-value | Redeploy CMS stack (invalidates sessions/preview links) |
| `origin-verify`, `webhook-secret` | put-secret-value | Redeploy CMS stack (CloudFront + worker pick up together) |
| `github-token` (worker PAT) | Regenerate in GitHub → put-secret-value | Redeploy or update worker env directly |
| Database password | Secrets Manager rotate → put-secret-value | Redeploy CMS stack |

Never paste a secret into a chat, commit, PR, or issue; if it happens, the
value is compromised — rotate immediately (see `SECURITY.md`).

## Incidents

Checklist basics live in `docs/security/threat-model.md` §7 (secret
exposure, account compromise, defacement, AWS anomaly). Quick reference:

1. Stabilise: for a bad publish, re-run `rebuild-site.yml` after fixing
   content; for a bad deploy, revert the merge on `main` via PR.
2. Contain: rotate anything possibly exposed.
3. Review: CMS audit log, CloudWatch logs, CloudTrail.
4. Record what happened in `docs/security/`.
