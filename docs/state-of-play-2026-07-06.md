# State of play — 2026-07-06 (end of day)

Where the project stands against the GDW backlog and what remains before the
production cutover. Companion docs: `docs/audit/2026-07-06-repo-audit.md`
(code audit, written this morning), `docs/playbook.md` (architecture), and
`docs/runbooks/launch-checklist.md` (the cutover procedure).

## Where we are

**Every pre-launch ticket is merged.** GDW-001…042 are implemented and live
on dev; GDW-043…049 are explicitly deferred by ADR
(`docs/adr/2026-07-06-defer-growth-features-to-post-launch.md`); GDW-050
(threat model + hardening) and GDW-051's repo side (prod pipeline, env-aware
rebuilds, alarms, launch checklist) are merged. Only GDW-052 (post-launch
maintenance automation) remains after cutover.

Merged today (PRs #92–#98):

- Audit/playbook/AGENTS/state-of-play docs + drift fixes (#92).
- Audit findings: worker 4xx retry bug, rebuild warm-up, Docker asset
  excludes (image no longer rebuilds on unrelated merges), data-layer
  pagination (#93).
- undici forced to 7.28.0 — clears all seven Dependabot advisories once it
  reaches `main` (#94).
- GDW-042: homepage content sections, `/colophon`, custom 404 (+ CloudFront
  error responses), footer nav, print styles (#95) — verified live on dev.
- GDW-043…049 deferral ADR (#96).
- GDW-050: `docs/security/threat-model.md`, edge security headers on both
  distributions, branch-protection runbook rewrite (#97).
- GDW-051: `deploy-prod.yml`, environment-aware `rebuild-site.yml`,
  SNS + Lambda-error alarms, `launch-checklist.md` (#98).

Launch prep already executed: GitHub `production` environment variables set
(deploy role ARN + region); dev Aurora PITR window verified (full 7-day
span); a point-in-time restore drill to a scratch cluster was performed and
the scratch cluster deleted.

## What remains before prod (see launch-checklist.md for detail)

All remaining items are **George's** — they need account owner/human access:

1. Apply the develop/main branch-protection rulesets (commands in
   `github-branch-protection.md`; nothing is protected today).
2. Configure the `production` environment: required reviewer = George,
   deployment branches = `main`.
3. Run the one blocked command: `cd infra && npx cdk deploy prod-foundation
   --require-approval never` (creates the prod deploy role the workflow
   assumes; automation was correctly stopped from prod IAM creation).
4. Create the prod fine-grained GitHub PAT and store it in
   `/georgedallaswebsite/prod/github-token` (enables publish-triggered prod
   rebuilds; deploys work without it).
5. Rotate the two dev credentials exposed in chat transcripts in June (dev
   CMS owner password, dev GitHub PAT).
6. Enable MFA on GitHub and AWS; confirm the SNS alert subscription emails.
7. Merge `develop` → `main` → `deploy-prod.yml` deploys everything
   (~30–45 min first run), then create the prod CMS owner account
   immediately, import/publish content, and do the final human pass.

## After launch

GDW-052 (maintenance automation), then revisit the deferral ADR by appetite
(newsletter first if an audience develops). Post-launch hardening notes live
in the threat model (raise PR approvals to 1, CSP after testing).
