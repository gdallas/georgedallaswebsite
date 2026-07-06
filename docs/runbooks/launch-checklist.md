# Launch checklist — production cutover (GDW-051)

_Work top to bottom. Items marked **[George]** need a human with account
access and cannot be automated; everything else is scripted or automatic.
Rollback and post-launch verification are at the end. Nothing on
georgedallas.com/www exists before this cutover (the zone has no apex/www
records), so there is no legacy traffic to migrate._

## 1. Before the first prod deploy

- [x] **Apply branch protection rulesets** for `develop` and `main` — done
      2026-07-06 (`protect-develop`/`protect-main`, active; approvals=0 while
      merge authority is delegated — raise to 1 post-launch).
- [x] **GitHub environment `production`** — required reviewer configured
      2026-07-06; deploy runs now pause for approval.
- [ ] **[George] Enable MFA** on the GitHub account and AWS root/`gdallas`
      IAM users (threat model action).
- [ ] **[George] Rotate the exposed dev credentials**: the dev CMS owner
      password (admin UI) and the dev GitHub PAT (regenerate in GitHub →
      update `/georgedallaswebsite/dev/github-token` `placeholder` key →
      redeploy dev-cms stack or wait for the next dev deploy).
- [x] Deploy `prod-foundation` + cert stacks — done 2026-07-06 (all three
      CREATE_COMPLETE).
- [x] Set the `production` environment variables — done 2026-07-06
      (`AWS_DEPLOY_ROLE_ARN`, `AWS_REGION`).
- [ ] **[George] Create the prod GitHub PAT** (fine-grained: this repo only,
      Actions read+write, 90-day expiry with a calendar reminder) and store
      it: `aws secretsmanager put-secret-value --secret-id
      /georgedallaswebsite/prod/github-token --secret-string
      '{"placeholder":"<PAT>"}'` (Git Bash: prefix `MSYS_NO_PATHCONV=1`).
      Without it, prod content publishes won't auto-rebuild the site (deploys
      still work).
- [ ] Verify prod secrets exist and are fresh (never copied from dev):
      `aws secretsmanager list-secrets --query
      "SecretList[?starts_with(Name, '/georgedallaswebsite/prod/')].Name"`

## 2. Cutover

- [ ] Open a PR `develop` → `main`; confirm CI is green; merge.
- [ ] `deploy-prod.yml` runs (pausing for **[George]** approval if the
      environment reviewer is configured): deploys all five prod stacks,
      health-checks `https://cms.georgedallas.com/api/health`, builds the
      site against the prod CMS, syncs + invalidates, smoke-tests
      `https://georgedallas.com/` and `https://www.georgedallas.com/`.
      The first run takes ~30–45 min (Aurora cluster + two CloudFront
      distributions + ACM DNS validation).
- [ ] **[George] Create the prod CMS owner account**: first registration at
      `https://cms.georgedallas.com/admin` becomes owner (`firstUser` hook).
      Do this promptly after deploy — until an owner exists, the register
      screen is open to anyone who finds the URL.
- [ ] **[George] Confirm the SNS alert subscription** emails (one per
      environment) so Lambda-error alarms can reach you.
- [ ] Content: prod starts empty. Either re-run the WordPress import against
      prod (`docs/runbooks/wordpress-import.md`, with
      `CMS_API_URL=https://cms.georgedallas.com`) and publish, or author
      fresh content. Publishing triggers the prod rebuild automatically once
      the PAT is in place; otherwise run `gh workflow run rebuild-site.yml
      --ref main`.

## 3. Verify (launch acceptance)

- [ ] `https://georgedallas.com` and `https://www.georgedallas.com` resolve
      with valid HTTPS and serve the homepage.
- [ ] `/writing`, `/now`, `/projects`, `/links`, `/contact`, `/bookshelf`,
      `/timeline`, `/colophon` render; an unknown path returns the custom
      404 with status 404.
- [ ] `/rss.xml`, `/sitemap.xml`, `/robots.txt` respond 200.
- [ ] Contact form submission appears in the prod admin inbox.
- [ ] CMS admin reachable, login works, lockout after bad attempts, and
      `curl -H "User-Agent: x" <function-url>` (direct, no CloudFront)
      returns 403.
- [ ] Response headers present on the site (HSTS, nosniff, frame,
      referrer-policy) and `X-Robots-Tag: noindex` on the CMS.
- [ ] Aurora prod: deletion protection on, 30-day backups, snapshot-on-
      delete (all set by CDK — verify in console once).
- [ ] Prod media + site buckets show versioning enabled.
- [ ] **Restore drill performed and dated** (see
      `database-backup-restore.md`): restore the latest prod (or dev)
      snapshot to a scratch cluster, connect, count rows, tear down. Record
      the date here: `last drill: 2026-07-06` (dev PITR restore to scratch
      cluster reached available; scratch cluster deleted).
- [ ] **[George] Final human pass** on the live site — launch is not
      complete until you have read it on your own devices.

## 4. Rollback

- **Bad site build/content:** re-run `rebuild-site.yml --ref main` after
  fixing content, or `aws s3 sync` a previous build; CloudFront invalidation
  completes the swap. S3 versioning on the prod site bucket keeps every
  prior object.
- **Bad deploy (infra/CMS):** CloudFormation auto-rolls-back a failed stack
  update, leaving the previous Lambda image serving. For a bad-but-deployed
  change: `git revert` the merge on `main` via PR → deploy-prod redeploys
  the previous state.
- **Bad migration:** restore from snapshot per
  `database-backup-restore.md` (30-day window in prod), then redeploy the
  matching code version. Destructive migrations require a pre-migration
  snapshot per policy.
- **DNS:** apex/www records are CDK-managed alias records to CloudFront; to
  take the site dark intentionally, disable the distribution rather than
  deleting records.

## 5. Post-launch (first week)

- [ ] Watch the AWS budget email thresholds (prod roughly doubles the ~$5
      baseline; still inside $10).
- [ ] Confirm scheduled publishing works in prod end to end (schedule a
      test post).
- [ ] Set `CMS_EMAIL`/`CMS_PASSWORD` repo secrets to a prod read/write
      content account if the weekly content checks should run against prod
      (they currently point at dev).
- [ ] **[George] Raise required PR approvals to 1** in the rulesets if you
      want the human review gate back.
- [ ] Proceed to GDW-052 (maintenance automation).
