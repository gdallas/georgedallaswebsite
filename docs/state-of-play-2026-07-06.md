# State of play — 2026-07-06

Where the project stands against the GDW backlog, what is in flight, and what
must happen before production launch. Companion docs:
`docs/audit/2026-07-06-repo-audit.md` (code audit) and `docs/playbook.md`
(architecture).

## Where we are

**41 of 52 tickets done.** GDW-001 through GDW-041 are merged and deployed to
dev. The dev environment is fully live:

- Public site at https://dev.georgedallas.com — all MVP routes plus search,
  bookshelf, timeline, contact form, RSS/sitemap/robots, redirects from the
  old WordPress permalinks.
- CMS at https://cms-dev.georgedallas.com/admin — dashboard, unified search,
  SEO preview, draft preview links, revisions, scheduled publishing, contact
  inbox, import review queue, audit log.
- All 13 WordPress posts imported (media relinked to S3, inline links
  preserved) and published.
- Automation: merge-to-develop auto-deploy, publish-triggered static
  rebuilds, one-shot scheduled publishing, weekly broken-link/content-quality
  sweep, Dependabot + dependency review.
- Quality gates: 271 unit tests (verified passing 2026-07-06), Playwright e2e
  smoke suite, accessibility baseline checks, typecheck/lint/build on every PR.

**In flight:** nothing — the timeline cedar restyle merged as PR #90 and
`main` was synced with `develop` (PR #91) on 2026-07-05. Merging to `main`
currently deploys nothing (no prod pipeline yet).

**Prod:** all prod stacks are defined in CDK but deliberately not deployed.
The prod deploy pipeline does not exist yet. Monthly cost today ≈ $4–5 (dev
foundation); deploying prod roughly doubles that — still inside the $10 cap
but with less headroom.

## Remaining backlog (GDW-042…052)

| Ticket | What | Comment |
| --- | --- | --- |
| GDW-042 | Homepage sections, colophon, custom 404, visual polish | 404 also unblocks the CloudFront errorResponses left pending in `site-hosting.mjs` |
| GDW-043 | Optional Notes / Start Here / Resources / Uses | Explicitly deferrable — a docs note satisfies it |
| GDW-044 | Newsletter (subscribers, sends, SES) or external provider | Biggest remaining feature; needs an ADR either way |
| GDW-045 | GitHub project sync job | Optional automation |
| GDW-046 | Bookshelf ISBN lookup helper | Optional automation |
| GDW-047 | Webmentions moderation | Optional; new public endpoint = new attack surface |
| GDW-048 | Privacy-friendly analytics | Decide native vs external first |
| GDW-049 | Content calendar, writing stats, changelog | Admin quality-of-life |
| GDW-050 | Threat model + hardening pass | **Launch gate** |
| GDW-051 | Launch readiness + prod cutover | **Launch gate** |
| GDW-052 | Post-launch maintenance automation | Post-launch |

Realistic minimal path to launch: GDW-042 → GDW-050 → GDW-051, explicitly
deferring 043–049 in docs (the tickets allow it). The 044–048 features are
additive and can land post-launch without rework.

## Must address before production (launch blockers)

Gaps that are not fully captured by the remaining tickets:

1. **Production deploy pipeline.** No `deploy-prod.yml` exists. Needs: main
   branch trigger, `production` GitHub environment with required approval,
   prod stack deploys, pre-migration backup verification, smoke tests.
2. **Parameterise the rebuild path for prod.** `rebuild-site.yml` hardcodes
   the dev CMS URL, dev stack name, and `development` environment; the
   publishing worker's `GITHUB_REF`/workflow target the dev setup. A prod
   publish today could not rebuild the prod site.
3. **Populate real secrets for prod.** All seven secrets are CDK-generated
   placeholders until launch; `github-token` (fine-grained PAT,
   actions:write) is a manual step and needs a documented renewal reminder.
   `email-config` stays placeholder unless GDW-044 lands first.
4. **Observability floor.** Zero CloudWatch alarms exist; the only alert is
   the $10 account budget email. Before prod: alarms on CMS Lambda errors,
   publish-worker errors/DLQ behaviour, and (cheap) a CloudFront 5xx alarm.
   All fit in the free alarm tier or pennies.
5. **Fix the two code findings from the audit** (worker 4xx retry bug;
   rebuild-site cold-CMS warm-up) — both small, both affect publish
   reliability, which is the product.
6. **GDW-050 threat model** — including the deliberate accepted risks:
   secrets in Lambda env vars, no WAF/rate-limit on the contact form and
   future public endpoints, single-owner account blast radius.
7. **Backup/restore drill.** The policy and runbook exist
   (`database-backup-restore.md`); actually perform one restore test against
   dev and record it before cutover (GDW-051 requires it).
8. **DNS/www cutover plan.** Prod cert covers apex + www; confirm the
   redirect behaviour (www→apex or vice versa) and document rollback.
9. **Docs sweep.** README still describes the pre-implementation scaffold in
   places; cost-controls secret count and cms-hosting stack list are stale
   (details in the audit). Cheap, do it with GDW-051.

## Worth doing soon (not blocking)

- Extend the CDK Docker asset exclude list and schedule `cdk gc` — stops
  needless CMS image rebuilds and silent ECR storage growth (audit finding 3).
- Add pagination (or a loud >100-docs failure) to the site data layer before
  content volume grows.
- Decide the ESLint question once: adopt minimal `typescript-eslint`
  (including checked `.mjs`) or record staying with the custom scripts as a
  deliberate choice.
- Set `CMS_EMAIL`/`CMS_PASSWORD` repo secrets so the weekly content checks
  actually run (currently no-op).
- Refresh or retire the untracked `SESSION_HANDOFF.md` (a month stale).

## Suggested order from here

1. Quick-fix PR: worker 4xx retry + rebuild warm-up + Docker asset excludes
   + data-layer pagination (small, one PR).
2. GDW-042 (homepage/404/colophon) — finishes the public-facing surface.
3. GDW-050 threat model.
4. GDW-051: prod pipeline + parameterised rebuild + real secrets + alarms +
   restore drill + cutover checklist → launch.
5. Post-launch: GDW-052, then cherry-pick 043–049 by appetite.
