# George Dallas Website

Personal website and publishing hub for George Dallas.

This project is intended to be more than a static personal homepage. It is a public website backed by a private, enjoyable, database-powered CMS so that writing, updating, publishing, importing, and maintaining content feels easy enough to do regularly.

Public site principle:

> Fast, accessible, SEO-friendly, static-first, and polished.

Admin/CMS principle:

> Calm, structured, pleasant, and powerful enough that George can update the site without editing code.

---

## Source documents

Codex and human contributors should read these documents before making architectural decisions:

```text
docs/personal-website-hub-requirements.pdf
docs/personal-website-database-architecture-addendum.md
CODEX_RULESET.md
```

If filenames differ, use the matching requirements document and database architecture addendum in `docs/`.

---

## Target architecture

The target architecture is:

```text
Astro public website
Payload CMS admin/backend
PostgreSQL database
S3 media storage
ECS Fargate backend hosting
Amplify Hosting or S3 + CloudFront frontend hosting
EventBridge / Lambda / SQS background jobs
Amazon SES for email
AWS Secrets Manager for secrets
CloudFront CDN
GitHub Actions CI/CD
AWS CDK or Terraform infrastructure
```

The public website should be static-first. The CMS/admin should be dynamic and database-backed.

---

## Repository structure

Expected structure:

```text
.
├── apps/
│   ├── site/        # Astro public website
│   └── cms/         # Payload CMS admin + API
├── packages/
│   └── shared/      # Shared types, schemas, validators, SEO helpers
├── scripts/         # Importers, maintenance jobs, developer scripts
├── infra/           # AWS CDK or Terraform infrastructure
├── docs/            # Requirements, architecture, runbooks, ADRs
├── .github/         # GitHub Actions workflows and PR templates
├── CODEX_RULESET.md
└── README.md
```

---

## Environments

The project uses three environments.

### Local

Used for day-to-day development.

Local development should use:

- local Node.js runtime
- Docker Compose for PostgreSQL
- LocalStack or MinIO for S3-compatible media testing where practical
- local `.env.local` files
- safe seed data

Local development must not connect to the production database by default.

### Development

The development AWS environment is used to test changes before production.

Recommended URLs:

```text
dev.georgedallas.ca
cms-dev.georgedallas.ca
```

The development environment has its own database, media bucket, secrets, CMS service, and frontend deployment.

### Production

The production AWS environment is the live public website and live CMS.

Recommended URLs:

```text
georgedallas.ca
www.georgedallas.ca
cms.georgedallas.ca
```

Production must have separate infrastructure, stricter permissions, protected deployment, and stronger backup settings.

---

## Development workflow

All work should happen through pull requests.

Do not commit directly to `main` or `develop`.

Branch naming:

```text
feature/<short-description>
fix/<short-description>
chore/<short-description>
infra/<short-description>
```

Standard flow:

```text
feature branch
  ↓
open PR into develop
  ↓
CI tests run
  ↓
George manually approves PR
  ↓
merge into develop
  ↓
automatic deployment to dev
  ↓
George tests dev
  ↓
open PR into main
  ↓
CI tests run
  ↓
George manually approves PR
  ↓
merge into main
  ↓
production deployment
```

A pull request cannot be merged unless required tests pass.

---

## Required PR checks

Every PR into `develop` or `main` must pass CI.

Minimum required checks:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

As the project matures, CI should also include:

- unit tests
- integration tests
- Playwright smoke tests
- accessibility checks
- database migration validation
- broken link checks where practical
- dependency/security review

Do not weaken tests or branch protections to merge a PR.

---

## Deployment process

Deployments are triggered by accepted PRs and branch merges, not by local manual deploys.

### Dev deploy

A merge into `develop` triggers deployment to the development AWS environment.

Dev deployment should:

1. build the CMS container
2. push it to ECR
3. run safe migrations against the dev database
4. deploy the CMS/API to dev ECS Fargate
5. build the Astro site using dev CMS content
6. deploy the site to dev frontend hosting
7. run smoke tests against the dev URLs

### Production deploy

A merge into `main` triggers deployment to production.

Production deployment should:

1. use GitHub Actions production environment protection
2. require George approval where configured
3. verify or create a recent database backup before risky migrations
4. run production migrations safely
5. deploy the CMS/API to production ECS Fargate
6. build the Astro site using production CMS content
7. deploy the site to production frontend hosting
8. invalidate CloudFront cache if applicable
9. run smoke tests against production URLs

---

## Database and backup policy

The primary database is PostgreSQL.

Recommended AWS options:

- Aurora PostgreSQL Serverless v2 for the long-term AWS-native target
- RDS PostgreSQL if simpler or cheaper during early development

Production database requirements:

- automated backups enabled
- point-in-time recovery enabled where supported
- default target retention: 30 days
- deletion protection enabled
- final snapshot on deletion
- pre-migration backup/snapshot before risky migrations
- documented restore process
- periodic restore test

Development database requirements:

- separate from production
- automated backups where practical
- shorter retention acceptable
- not treated as the source of truth

Media bucket requirements:

- production S3 versioning enabled
- public access blocked by default
- least-privilege write access
- CloudFront or approved public delivery path for public media

No system can literally guarantee data can never be lost, but this project should be designed so accidental data loss is unlikely and recovery is tested.

---

## Local setup

Install dependencies:

```bash
pnpm install
```

Copy environment variables:

```bash
cp .env.example .env.local
```

Start local services:

```bash
docker compose up -d
```

Run the app locally:

```bash
pnpm dev
```

Run checks before opening a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Exact commands may evolve as the repo is implemented. When commands change, update this README in the same PR.

---

## Content and publishing rules

The public site should only render content that is public and published.

Content should not appear on the production public site unless it satisfies the equivalent of:

```text
status = "published"
publishedAt <= now()
visibility = "public"
```

Drafts, private notes, import issues, contact messages, subscribers, analytics, and admin-only data must never be included in production public builds.

---

## WordPress import

Existing WordPress blog content should be imported through a repeatable import process.

Preferred source:

```text
WordPress REST API
```

Scraping should only be used as a fallback.

The import process should:

- preserve original WordPress IDs where possible
- preserve original URLs where possible
- download and relink media into S3
- create redirects for old URLs
- flag cleanup issues
- support review before publishing
- avoid automatically publishing imported content without George approving the workflow

---

## Security rules

Do not commit secrets.

Use:

- `.env.example` for variable names only
- `.env.local` for local secrets
- AWS Secrets Manager for deployed secrets
- GitHub Environments or AWS OIDC for deployment permissions

Production rules:

- production database must not be publicly exposed
- production S3 bucket should be private by default
- CMS admin route must be protected
- least-privilege IAM should be used
- draft/private/admin data must not be exposed publicly

---

## Accessibility and quality

Target WCAG 2.2 AA where practical.

Preserve or improve:

- semantic HTML
- keyboard navigation
- visible focus states
- readable typography
- color contrast
- alt text support
- responsive layouts
- form labels and validation messages
- reduced-motion support where animations exist

Accessibility should be considered part of the definition of done.

---

## PR checklist

Before requesting review, confirm:

- [ ] The change follows `CODEX_RULESET.md`.
- [ ] The change supports the static-first public site and database-backed CMS architecture.
- [ ] Local checks pass.
- [ ] Tests were added or updated where appropriate.
- [ ] No secrets are committed.
- [ ] Dev and prod separation is preserved.
- [ ] Draft/private/admin data cannot leak into public builds.
- [ ] Database migrations are safe and documented.
- [ ] README/docs were updated if workflow, commands, env vars, infra, or deployment changed.
- [ ] Accessibility was preserved or improved.
- [ ] George manually approves before merge.

---

## Codex instructions

Codex should use `CODEX_RULESET.md` as its main working ruleset.

Codex must not:

- push directly to `main` or `develop`
- bypass PR review
- bypass tests
- weaken CI to make a PR pass
- commit secrets
- connect local/dev work to the production database by default
- expose drafts or admin-only data publicly
- make destructive data changes without backup and recovery notes

When in doubt, prefer a smaller PR with tests and documentation.
