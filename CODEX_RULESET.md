# Codex Ruleset — George Dallas Website

**Repository:** `https://github.com/gdallas/georgedallaswebsite`  
**Audience:** Codex and any automated coding assistant working on this repo  
**Status:** Project rules, architecture guardrails, and development workflow requirements  

---

## 1. Purpose of this document

This document defines the rules Codex must follow when writing code for the George Dallas personal website.

The project is not just a static personal site. It is a polished public website backed by a calm, enjoyable, database-powered personal CMS. The public experience should be fast, accessible, distinctive, and static-first. The private admin experience should be smooth enough that George wants to update the site weekly.

Codex must treat this document as a binding ruleset unless George explicitly overrides it in a later instruction.

---

## 2. Source documents Codex must read first

Before making architectural or implementation decisions, Codex must read the project source documents in the repo, especially:

1. `docs/personal-website-hub-requirements.pdf` or the matching requirements PDF if the filename differs.
2. `docs/personal-website-database-architecture-addendum.md` or the matching database architecture addendum if the filename differs.
3. This file: `CODEX_RULESET.md`.
4. `README.md`.

If the source documents are renamed, Codex must search the `docs/` directory for the personal website requirements document and database architecture addendum.

Do not ignore the source documents and do not replace them with generic web-app assumptions.

---

## 3. Core product principle

The most important product rule is:

> The website must be enjoyable enough for George to update weekly.

This has practical consequences:

- The admin/backend experience is a first-class product surface.
- Normal content updates must not require editing files manually.
- George should be able to draft, preview, publish, schedule, and update content through the CMS.
- Public performance must not come at the cost of a frustrating backend.
- The public site should be static-first; the admin system should be dynamic and powerful.

---

## 4. Target architecture

Codex should build toward this architecture:

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
AWS CDK or Terraform for infrastructure
```

### 4.1 Preferred monorepo shape

Use a monorepo structure unless George instructs otherwise:

```text
.
├── apps/
│   ├── site/        # Astro public website
│   └── cms/         # Payload CMS admin + API
├── packages/
│   └── shared/      # Shared types, schemas, validators, SEO helpers
├── scripts/         # Importers, maintenance jobs, developer scripts
├── infra/           # AWS CDK or Terraform infrastructure
├── docs/            # Requirements, architecture, runbooks, decisions
├── .github/         # GitHub Actions workflows, CODEOWNERS, templates
├── CODEX_RULESET.md
└── README.md
```

### 4.2 Static/dynamic responsibility split

The public site should render only public, published content.

Production public builds must never include:

- drafts
- private notes
- unpublished content
- admin analytics
- import cleanup queues
- contact messages
- subscriber records
- internal workflow data
- secrets or private configuration

The CMS/admin should own:

- content editing
- drafts and revisions
- publishing workflow
- media library
- WordPress import review
- admin dashboard
- background job status
- content quality checks
- structured data used by the public site

---

## 5. Environments

The project must have separate local, development, and production environments.

### 5.1 Local

Local development runs on the developer machine.

Local development should use:

- local Node.js runtime
- local PostgreSQL via Docker Compose
- local S3-compatible storage via LocalStack or MinIO where practical
- local `.env.local` files
- seed data that is safe to commit or regenerate

Local development must not connect to the production database by default.

### 5.2 Development AWS environment

The development environment is for testing changes before production.

Use separate AWS resources for dev, including:

- dev frontend hosting
- dev CMS service
- dev PostgreSQL database
- dev media bucket
- dev secrets
- dev IAM roles
- dev DNS/subdomains where needed

Recommended names:

```text
dev.georgedallas.ca
cms-dev.georgedallas.ca
```

If final domains are not yet available, use AWS-generated temporary URLs until DNS is configured.

### 5.3 Production AWS environment

Production is the public live site and live CMS.

Use separate AWS resources for prod, including:

- prod frontend hosting
- prod CMS service
- prod PostgreSQL database
- prod media bucket
- prod secrets
- prod IAM roles
- prod DNS/subdomains

Recommended names:

```text
georgedallas.ca
www.georgedallas.ca
cms.georgedallas.ca
```

Production must be protected by stricter IAM, branch protections, deployment approvals, database backups, and deletion protection.

---

## 6. Branching and pull request workflow

Codex must follow this workflow.

### 6.1 Branches

Use these long-lived branches:

```text
main      # production branch
develop   # development environment branch
```

Use short-lived feature branches for work:

```text
feature/<short-description>
fix/<short-description>
chore/<short-description>
infra/<short-description>
```

Codex must not commit directly to `main` or `develop`.

### 6.2 Pull requests

All changes must enter through a pull request.

Required PR flow:

```text
feature branch
  ↓
PR into develop
  ↓
CI checks pass
  ↓
George manually approves
  ↓
merge to develop
  ↓
automatic dev deploy
  ↓
George tests dev
  ↓
PR from develop into main, or release branch into main
  ↓
CI checks pass
  ↓
George manually approves
  ↓
merge to main
  ↓
production deploy
```

George is the manual approval gate. Codex must not bypass this with direct pushes, force pushes, disabled checks, or unreviewed deployment workflows.

### 6.3 Branch protection requirements

The repo should be configured so `develop` and `main` require:

- pull request before merge
- at least one approval from George
- passing CI status checks
- no unresolved conversations
- branch up to date before merge where practical
- signed commits if George enables them
- no force pushes
- no branch deletion

Recommended `CODEOWNERS`:

```text
* @gdallas
```

---

## 7. CI requirements

A PR cannot be merged unless tests pass.

The required CI workflow should run on every pull request to `develop` or `main`.

At minimum, CI must run:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

As the project matures, CI should also include:

- unit tests
- integration tests
- CMS/API tests
- database migration validation
- Astro build validation
- Playwright smoke tests
- accessibility checks
- broken link checks where practical
- formatting checks
- security/dependency checks

Codex must not remove or weaken CI checks to make a PR pass.

---

## 8. Deployment rules

Deployments must be triggered by accepted PRs, not by local manual commands.

### 8.1 Dev deploy

A merge into `develop` triggers deployment to the development AWS environment.

Dev deploy should:

1. build and push the CMS container to ECR
2. run safe migrations against the dev database
3. deploy the CMS/API to the dev ECS Fargate service
4. build the Astro site using dev CMS content
5. deploy the public site to the dev frontend host
6. run smoke tests against dev URLs

### 8.2 Production deploy

A merge into `main` triggers deployment to production.

Production deploy must:

1. use GitHub Actions production environment protection
2. require George as a reviewer before production deployment if configured separately from merge approval
3. create or verify a recent database backup/snapshot before migrations
4. run migrations safely
5. deploy the CMS/API to production ECS Fargate
6. build the Astro site using production CMS content
7. deploy the public site to production frontend hosting
8. invalidate CloudFront cache if applicable
9. run production smoke tests
10. report success or failure in GitHub Actions

Codex must not add a deployment path that bypasses GitHub PR approval.

---

## 9. Database and data protection rules

George wants the database backed up so the content is not lost. No system can literally guarantee data can never be lost, but the architecture must be designed around strong recovery protections.

### 9.1 Database choice

Use PostgreSQL.

Recommended AWS options:

- Aurora PostgreSQL Serverless v2 for the long-term AWS-native target
- RDS PostgreSQL if simpler or cheaper during early buildout

Do not introduce a different primary database without documenting the reason in an Architecture Decision Record.

### 9.2 Environment separation

Production and development databases must be separate.

Rules:

- Dev must not write to prod.
- Local must not write to prod.
- Prod credentials must not exist in local env examples.
- Production data must not be copied into dev unless sanitized.

### 9.3 Backups

Production database must have:

- automated backups enabled
- point-in-time recovery enabled where supported
- a backup retention window appropriate for the project, with a strong default of 30 days
- deletion protection enabled
- final snapshot on deletion
- pre-migration backup/snapshot before risky schema changes
- documented restore process
- periodic restore test

Development database should have:

- automated backups enabled where practical
- shorter retention is acceptable
- no dependency on dev as the source of truth

### 9.4 Media backups

S3 media buckets must have:

- versioning enabled for production
- public access blocked by default
- least-privilege write access
- lifecycle rules only after explicit review
- optional replication/backups if costs are acceptable

Do not store user-uploaded media inside application containers.

### 9.5 Migrations

Database migrations must be:

- version controlled
- reviewed in PRs
- tested locally
- tested in dev before prod
- backward-compatible where practical
- accompanied by rollback or recovery notes for risky changes

Codex must not write migrations that casually drop data.

Any migration that deletes, truncates, rewrites, or backfills important data must include:

- explanation in the PR
- backup expectation
- rollback/recovery note
- testing evidence

---

## 10. Security rules

Codex must follow these security rules:

- Do not commit secrets.
- Use AWS Secrets Manager or equivalent for deployed secrets.
- Use `.env.example` for variable names only.
- Keep the production database private, not publicly exposed.
- Keep S3 buckets private by default.
- Serve approved public media through CloudFront or signed/public-safe URLs.
- Protect the CMS admin route.
- Use strong authentication for Payload CMS.
- Enable 2FA where supported.
- Use least-privilege IAM roles.
- Do not expose draft content publicly.
- Do not expose admin-only data in public builds.
- Do not log sensitive content unnecessarily.
- Hash or avoid IP storage for analytics/contact spam prevention.

---

## 11. Content model rules

The CMS should model content as structured collections, not unstructured blobs wherever structure is valuable.

MVP collections should include:

- users
- posts
- pages
- projects
- links
- media
- now page / now updates
- redirects
- site settings
- WordPress import proof of concept records

Later collections may include:

- books
- timeline entries
- import jobs
- import issues
- contact messages
- subscribers
- newsletter issues
- webmentions
- GitHub repos
- analytics events
- content quality checks
- broken link checks

Rules:

- Public content must have `status`, `publishedAt`, and `visibility` or equivalent controls.
- Slugs must be stable and unique.
- Public images must support alt text.
- Imported WordPress content must preserve original IDs/URLs where possible.
- Redirects must be supported for old WordPress URLs.
- Drafts and scheduled content must not leak into production public builds.

---

## 12. WordPress import rules

The WordPress migration should be repeatable and reviewable, not a one-time manual scrape.

Preferred import source:

```text
WordPress REST API
```

Scraping is only a fallback.

Import flow:

```text
WordPress REST API
  ↓
Import worker/script
  ↓
HTML/rich text conversion
  ↓
Media download to S3
  ↓
Create draft/imported posts in Payload
  ↓
Create redirects
  ↓
Generate cleanup issues
  ↓
Review in admin
```

Imported content must track:

- original WordPress ID
- original WordPress URL
- import status
- cleanup issues
- redirect source
- media issues
- review status

Do not automatically publish imported content without review unless George explicitly instructs it.

---

## 13. Public website rules

The public site should be:

- fast
- static-first
- accessible
- mobile-friendly
- SEO-friendly
- RSS-enabled
- readable
- calm and distinctive
- compatible with dark mode
- visually aligned with a Pacific Northwest feel

Public routes should include at minimum:

```text
/
/about
/now
/writing
/writing/[slug]
/projects
/links
/contact
/rss.xml
/sitemap.xml
```

Expected later routes:

```text
/bookshelf
/timeline
/colophon
/notes
/start-here
/resources
/uses
```

Do not add heavy client-side JavaScript unless it clearly improves the user experience.

---

## 14. Accessibility and quality rules

Accessibility is not optional.

Codex must preserve or improve:

- semantic HTML
- keyboard navigability
- visible focus states
- accessible color contrast
- alt text support
- readable typography
- responsive layout
- reduced-motion compatibility where animations exist
- form labels and error messaging
- heading hierarchy

Target WCAG 2.2 AA where practical.

Codex should add automated accessibility checks as the project matures, but must not treat automation as a full substitute for thoughtful implementation.

---

## 15. Testing strategy

Codex should create and maintain tests around meaningful behavior.

Recommended layers:

### 15.1 Unit tests

Use for:

- validation helpers
- slug generation
- SEO helpers
- date formatting
- content visibility filters
- RSS/sitemap helpers
- import transformations

### 15.2 Integration tests

Use for:

- CMS API behavior
- database access
- content queries
- import pipeline
- publishing workflow
- redirects

### 15.3 End-to-end tests

Use Playwright or equivalent for:

- homepage loads
- writing index loads
- post detail loads
- links/projects pages load
- admin login flow where safe to test
- draft preview flow where practical
- contact form smoke test where practical

### 15.4 Build tests

Every PR must verify:

- public site builds
- CMS builds
- shared packages build
- generated RSS is valid
- generated sitemap is valid

---

## 16. Infrastructure rules

Infrastructure should be defined as code.

Use either AWS CDK or Terraform. Do not mix both unless there is a documented reason.

Infrastructure should define separate dev and prod stacks.

Production infrastructure should use:

- deletion protection for database resources
- protected S3 buckets
- least-privilege IAM
- private networking for database where practical
- managed certificates for HTTPS
- clear names/tags for resources
- logs and monitoring
- backup policies

Codex must not create irreversible infrastructure changes without documenting the risk.

---

## 17. GitHub Actions workflow expectations

Expected workflows:

```text
.github/workflows/ci.yml
.github/workflows/deploy-dev.yml
.github/workflows/deploy-prod.yml
```

Optional later workflows:

```text
.github/workflows/backup-verify.yml
.github/workflows/link-check.yml
.github/workflows/dependency-review.yml
.github/workflows/accessibility.yml
```

Rules:

- `ci.yml` runs on pull requests.
- `deploy-dev.yml` runs after merge to `develop`.
- `deploy-prod.yml` runs after merge to `main`.
- Production deployment uses a protected GitHub Environment.
- Deployment secrets must be stored in GitHub Environments or AWS OIDC roles, not committed files.
- Prefer GitHub OIDC to long-lived AWS access keys.

---

## 18. README maintenance rules

Whenever Codex changes the development workflow, deployment workflow, required commands, environment variables, or architecture, it must update `README.md` in the same PR.

The README must stay useful for George as the human owner of the project.

The README should clearly explain:

- what the project is
- how to run it locally
- how to run tests
- how PRs work
- how dev/prod deploys work
- what must pass before merge
- how database backups are handled
- where source documents live
- how to avoid touching production data accidentally

---

## 19. Coding style rules

Codex should prefer:

- TypeScript
- explicit types at module boundaries
- small composable functions
- shared validation schemas
- readable names
- predictable file organization
- minimal dependencies
- strong error handling
- clear comments for non-obvious decisions

Codex should avoid:

- large unreviewable rewrites
- hidden magic
- unnecessary frameworks
- hardcoded domains/secrets
- public exposure of admin data
- weakening tests
- changing architecture without documenting why

---

## 20. PR checklist Codex must satisfy

Every Codex-generated PR should answer:

- [ ] Does this respect the source requirements and architecture addendum?
- [ ] Does this preserve the static-first public site and dynamic CMS split?
- [ ] Does this keep dev and prod separate?
- [ ] Does this avoid direct production data access?
- [ ] Does this include or update tests?
- [ ] Does CI pass locally or in GitHub Actions?
- [ ] Does this require database migration? If yes, is it safe and documented?
- [ ] Does this affect deployment? If yes, is README updated?
- [ ] Does this affect secrets? If yes, are `.env.example` and docs updated without committing real secrets?
- [ ] Does this preserve accessibility?
- [ ] Does this avoid draft/private/admin data leakage?
- [ ] Does this maintain or improve the admin experience?
- [ ] Does this update documentation where needed?

---

## 21. Architecture Decision Records

If Codex proposes a major architectural change, it must create an ADR in:

```text
docs/adr/YYYY-MM-DD-short-title.md
```

Use this format:

```markdown
# ADR: <Decision title>

## Status
Proposed | Accepted | Rejected | Superseded

## Context
What problem are we solving?

## Decision
What are we choosing?

## Consequences
What gets better? What gets worse?

## Alternatives considered
What else did we consider?
```

Architectural changes that need an ADR include:

- changing the frontend framework
- changing the CMS
- changing the primary database
- changing AWS hosting model
- changing deployment workflow
- changing backup strategy
- adding major external services
- changing authentication model

---

## 22. Non-negotiables

Codex must not:

- deploy from local machines as the standard path
- bypass PR approval
- bypass tests
- commit secrets
- expose production database publicly
- use the same database for dev and prod
- make production deploys without a rollback/recovery path
- drop or overwrite production data casually
- expose drafts/private content on the public site
- make normal content updates require manual Git/file editing
- ignore accessibility
- ignore the admin experience

---

## 23. Default implementation choices

Unless George decides otherwise, use these defaults:

```text
Package manager: pnpm
Language: TypeScript
Public site: Astro
CMS: Payload CMS
Database: PostgreSQL
Media: S3
Backend hosting: ECS Fargate
Frontend hosting: AWS Amplify Hosting first; S3 + CloudFront acceptable if chosen intentionally
Infrastructure as code: AWS CDK or Terraform, decided early and documented
CI/CD: GitHub Actions
Dev branch: develop
Prod branch: main
Testing: Vitest + Playwright + build checks
```

If a different choice is made, document why.
