# Threat model — George Dallas website

_GDW-050. Written 2026-07-06 against the shipped surface (GDW-001…042; the
growth features GDW-043…049 are deferred by ADR
`2026-07-06-defer-growth-features-to-post-launch.md` and must extend this
document when they land). Review this file whenever a new public endpoint,
collection, or pipeline is added, and before production launch (GDW-051)._

## 1. What we are protecting (assets)

| Asset | Where it lives | Impact if compromised |
| --- | --- | --- |
| CMS owner/editor accounts | Payload users table | Full content control, defacement |
| Database (content, contact messages, audit log) | Aurora PostgreSQL (private subnets) | Data loss, PII exposure (contact email addresses) |
| Media | Private S3 + CloudFront | Low sensitivity (all published media is public anyway) |
| Secrets | Secrets Manager (7/env), Lambda env vars, GitHub env vars | Lateral movement: DB access, CMS crypto, GitHub workflow dispatch |
| Source + CI/CD | GitHub repo, Actions, OIDC deploy roles | Supply-chain: attacker-controlled deploys |
| AWS account 833090513890 | Shared with other personal projects | Cost abuse, resource deletion |
| Public reputation | dev./www./georgedallas.com | Defacement, SEO poisoning, malware hosting |
| Contact messages (PII: name, email, message) | contact-messages collection, admin-only | Privacy breach |

## 2. Who we defend against (realistic attackers)

1. **Untargeted internet scanners/bots** — credential stuffing on the CMS
   login, form spam, vulnerability scans. By far the most likely.
2. **Opportunistic attackers exploiting a published CVE** in Payload, Next.js,
   Astro, or a transitive dep before we patch.
3. **Supply-chain compromise** of an npm dependency or GitHub Action.
4. **A curious/malicious reader** probing for drafts, private content, or
   admin data.
5. Out of scope: nation-state attackers, DDoS beyond CloudFront absorption,
   physical attacks. A personal site does not justify defending these.

## 3. Trust boundaries and entry points

```text
Internet -> CloudFront (site)  -> private S3 (static HTML only)
Internet -> CloudFront (cms)   -> Lambda Function URL -> Payload (auth boundary)
                                   -> /api/contact  (anonymous write, validated)
                                   -> /api/internal/publish-scheduled (HMAC)
                                   -> /preview      (signed expiring token)
GitHub PR -> Actions CI        -> no secrets, no AWS
GitHub merge -> Actions deploy -> OIDC role -> CDK bootstrap roles -> AWS
S3 marker -> publishing worker -> GitHub API (PAT) + EventBridge + CMS webhook
```

## 4. Review by area

### Authentication and authorization (CMS)

- Payload local auth; login lockout 5 attempts/15 min; httpOnly cookies,
  `SameSite=Lax`, `secure` in production; JWT expiry 2h;
  `removeTokenFromResponses` on. Roles: owner/editor/read-only/api with
  access rules in `apps/cms/src/access/` — user management and audit-log
  reads are owner-only; first user is forced to owner.
- Anonymous API reads are constrained by query-level access filters to
  published+public content (`payloadAccess.ts`), independently re-checked by
  the site data layer, and verified end-to-end by Playwright specs. This
  triple enforcement is the core defence for draft/private leakage.
- **Gap (accepted):** no MFA on CMS accounts (Payload local auth has no
  first-party TOTP). Mitigated by lockout, a strong unique password, and the
  small user count. Revisit if editors beyond George are added.
- **Action for George:** enable MFA on the GitHub account and the AWS root +
  `gdallas` IAM user; these accounts outrank every control in this repo.

### Draft/private content leakage

- Enforced three times (CMS access filter, site data-layer re-check, e2e
  tests). Imported posts default draft+private. The Now global redacts
  unpublished content for anonymous readers. Media visibility gated by
  `reviewStatus=public`. Sitemap/RSS/search index build only from the
  filtered data layer. Preview requires a signed, expiring, per-document
  token and sends `X-Robots-Tag: noindex`.
- Residual risk: an authenticated CMS user pasting private content into a
  public field. Process risk, not technical; audit log records changes.

### Database

- Aurora in private isolated subnets, no internet route, security group
  admits only the CMS Lambda SG on 5432. Not publicly accessible; TLS +
  encryption at rest (KMS). Access via Payload/Drizzle parameterized queries
  — no string-built SQL in the codebase (verified by audit).
- Backups: 7d dev / 30d prod, deletion protection + snapshot-on-delete in
  prod. Restore drill required before launch (GDW-051).

### S3 / media

- All buckets Block-Public-Access + SSL-enforced; site and media buckets
  reachable only through CloudFront OAC; CMS writes limited to approved
  prefixes; prod versioning on. Control-bucket markers expire after 1 day;
  worker validates marker shape before acting.
- Uploads: CMS-authenticated users only; size-capped (4 MB app-level, under
  the ~6 MB Function URL event cap); Payload/sharp process images.
  Malicious-file risk is bounded: objects are served from a cookieless media
  CDN domain (`*.cloudfront.net`), not the site origin.

### Network / origin protection

- CMS Lambda serves only requests carrying the CloudFront-injected
  `x-origin-verify` secret header (timing-safe compare; `/api/health`
  exempt, and it exposes no data). Direct Function URL calls are rejected.
  This is deliberate — OAC cannot sign browser POSTs (see cms-hosting.md);
  do not "upgrade" it.
- Security headers are set at the edge for both distributions (HSTS,
  nosniff, SAMEORIGIN framing, referrer policy, minimal Permissions-Policy;
  the CMS additionally sends `X-Robots-Tag: noindex` so admin/API never
  index). A strict CSP for the site is a follow-up: Astro inlines styles and
  Pagefind uses dynamic imports + WASM, so a CSP needs testing, not
  guessing.

### GitHub Actions / OIDC / IAM

- Deploys authenticate via OIDC — no long-lived AWS keys in GitHub. The
  trust policy pins repo + environment (`repo:gdallas/georgedallaswebsite:
  environment:development|production`). Deploy role can only assume CDK
  bootstrap roles, sync the site bucket, and invalidate distributions.
- CI for PRs runs with `permissions: contents: read` and no secrets.
  Dependabot/dependency-review run without production secrets.
- Runtime roles are split (cms-runtime vs jobs-runtime) with least-privilege
  grants; cross-stack access uses deterministic ARNs, not wildcards (except
  distribution-scoped invalidation, which CloudFront cannot narrow further).
- **Gap (fix pending, manual):** `develop` and `main` have **no branch
  protection** — the documented rules were never applied. Apply the rulesets
  in `docs/runbooks/github-branch-protection.md` (PR required, CI checks
  required, no force-push/deletion). Without this, a compromised
  collaborator token could push directly to a deploy branch.
- **Gap (accepted):** GitHub Actions are referenced by major version tag
  (e.g. `actions/checkout@v7`), not SHA-pinned. Dependabot updates them;
  SHA-pinning is the stricter posture if wanted later.

### Secrets

- Seven per environment in Secrets Manager, KMS-encrypted, never in git
  (verified; secret scanning + push protection should be enabled in repo
  settings). Rotation = update secret + redeploy stack.
- **Accepted risk:** secrets are materialised into Lambda environment
  variables via CloudFormation dynamic references. Anyone with
  `lambda:GetFunctionConfiguration` in the account can read them. In this
  single-owner account that is George and CI's scoped roles. The
  alternative (runtime Secrets Manager reads) adds cold-start latency and a
  VPC endpoint cost. Revisit if account access ever widens.
- Two credentials were pasted into chat transcripts in June 2026 (dev CMS
  password, dev GitHub PAT). **Rotate both before launch** (GDW-051
  checklist).

### Supply chain

- pnpm with committed lockfile + `--frozen-lockfile` everywhere; Dependabot
  weekly; dependency-review action on PRs; security overrides force patched
  transitive versions (esbuild, dompurify, postcss, yaml, undici). The CMS
  Docker image builds from the lockfile inside CDK. No postinstall-heavy
  dependencies; the site has two runtime deps (astro, shared).
- Residual: a malicious minor-version bump inside a semver range at image
  build time. Mitigated by lockfile-frozen installs — versions cannot drift
  without a PR.

### XSS / rendering

- All rich text renders through the shared serializer: every text node is
  HTML-escaped, URLs pass an http/https/mailto allowlist, `target="_blank"`
  links get `rel="noopener noreferrer"`, unknown nodes render children only.
  No `dangerouslySetInnerHTML`/`set:html` of unescaped CMS content (the one
  `set:html` call renders serializer output). Contact-message content is
  displayed by Payload's admin UI as plain field text.

### CSRF / sessions

- Payload CSRF allowlist is pinned to the CMS origin; cookies are
  `SameSite=Lax` + httpOnly (+ `secure` in prod), which blocks cross-site
  POST cookie attachment in modern browsers. The contact form is anonymous
  (no session to ride) and validates Origin/Referer against the site and CMS
  URLs. The internal publish endpoint ignores cookies entirely (HMAC over
  the body).

### Contact form (anonymous write path)

- Validation + length caps, honeypot/keyword classification, Origin check,
  messages stored admin-only, IP stored only as a keyed hash (session
  secret), success responses identical for accepted and silently-dropped
  spam.
- **Accepted risk:** no rate limiting/CAPTCHA/WAF (AWS WAF ~$5+/mo would
  consume the budget). Worst case is inbox noise and a few Lambda
  invocations; CloudFront + budget alerts bound the damage. Revisit if spam
  volume becomes real.

### Publishing pipeline

- Marker bucket is private; only the CMS role can write markers, only the
  worker role can read them. Worker → CMS publish calls are HMAC-signed and
  idempotent; 4xx rejections do not retry. Worker → GitHub uses a
  fine-grained PAT scoped to this repo's Actions (**expiry/renewal is a
  manual calendar item — see launch checklist**). Rebuild dispatch can, at
  worst, rebuild the site from already-filtered content.

## 5. Accepted risks (summary)

1. Secrets in Lambda env vars (single-owner account; revisit on access
   growth).
2. No WAF / rate limiting on public endpoints (cost; blast radius is spam +
   pennies).
3. No MFA on CMS accounts (Payload limitation; lockout + strong password;
   single user).
4. Actions pinned by version tag, not SHA (Dependabot-managed).
5. Shared AWS account with other personal projects (namespaced resources +
   scoped roles; account-level compromise is out of scope for project
   controls).
6. No CSP on the site yet (needs testing against Astro/Pagefind; headers
   otherwise strict).

## 6. Pre-launch security actions (feed GDW-051)

- [ ] Apply the develop/main rulesets (manual — repo settings; commands in
      `github-branch-protection.md`).
- [ ] Rotate the dev CMS owner password and the dev GitHub PAT (both were
      exposed in chat transcripts in June 2026).
- [ ] Confirm GitHub secret scanning + push protection are enabled.
- [ ] Enable MFA on GitHub and AWS accounts (verify, since this is outside
      the repo).
- [ ] Populate prod secrets fresh (never copy dev values), including a new
      fine-grained PAT for the prod worker.
- [ ] Verify prod deploy uses the `production` environment with required
      reviewers configured in repo settings.

## 7. Incident response (basics)

1. **Suspected secret exposure:** rotate at the source (Secrets Manager →
   redeploy stack; GitHub PAT → regenerate), review CloudWatch/CloudTrail
   and the CMS audit log for misuse, treat git history/chat transcripts as
   permanently compromised for that value.
2. **CMS account compromise:** reset password from a trusted session, review
   audit-events for content/user changes, rotate `payload-secret` +
   `session-secret` (invalidates sessions), redeploy.
3. **Defacement/bad publish:** the site is rebuilt from CMS content — fix
   content, re-run `rebuild-site.yml`; for a bad deploy, redeploy the
   previous commit from `develop`/`main` (CloudFormation keeps the prior
   Lambda image; S3 sync republishes the old build).
4. **AWS anomaly (cost/budget alert):** check Cost Explorer by the
   `project=georgedallaswebsite` tag, CloudTrail for unexpected API calls,
   disable the deploy roles if compromise is suspected.
5. Record what happened in `docs/security/` afterwards.
