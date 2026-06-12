# Codex Implementation Ticket Backlog — George Dallas Website

**Repository:** `https://github.com/gdallas/georgedallaswebsite`  
**Document purpose:** Ordered implementation backlog for Codex  
**Audience:** George Dallas, Codex, and any future coding assistant working in the repo  
**Status:** Recommended ticket plan  
**Source documents:**

- `docs/personal-website-hub-requirements.pdf`
- `docs/personal-website-database-architecture-addendum.md`
- `CODEX_RULESET.md`
- `README.md`

---

## 1. How Codex should use this document

Codex should treat this document as the implementation roadmap for the personal website project. Each ticket is written so it can be copied into GitHub Issues, Jira, or another tracker.

Codex must not skip ahead to later feature work if foundation, security, deployment, testing, and data-protection tickets are incomplete. Later tickets may be implemented earlier only when their dependencies are satisfied and the change remains small, reviewed, tested, and aligned with `CODEX_RULESET.md`.

Every Codex PR must:

- follow the PR workflow in `README.md` and `CODEX_RULESET.md`
- target a feature branch, never direct commits to `develop` or `main`
- include or update tests for meaningful behavior
- update documentation when workflow, commands, infrastructure, architecture, content models, or environment variables change
- avoid committing secrets
- preserve dev/prod separation
- preserve the static-first public site and dynamic database-backed CMS split
- avoid exposing drafts, private notes, import queues, contact messages, subscribers, analytics, or admin-only data to the public site
- pass CI before merge
- wait for George’s manual approval before merge

---

## 2. Global security definition of done

These security requirements apply to every ticket, not only security-specific tickets.

A ticket is not done unless all relevant items below are satisfied:

- No real secrets, tokens, database URLs, API keys, session secrets, OAuth credentials, or AWS credentials are committed.
- `.env.example` documents variable names only and uses safe placeholder values.
- Local, dev, and prod environments remain separate.
- Local development does not connect to production by default.
- Dev does not read from or write to production resources.
- Production database access remains private and least-privileged.
- Production S3 buckets block public access by default unless a deliberate public delivery path is created through CloudFront or another approved mechanism.
- IAM policies are least-privilege and environment-scoped.
- GitHub Actions use OIDC or protected environment secrets; long-lived AWS keys are avoided.
- CMS admin access is authenticated and authorized.
- Public site queries only return content equivalent to `status = published`, `publishedAt <= now`, and `visibility = public`.
- Drafts, previews, private notes, subscribers, contact messages, import issues, analytics events, and admin dashboard data are not included in public builds.
- Inputs are validated server-side before database writes.
- Error messages do not leak secrets, SQL details, stack traces, or private data in public responses.
- Logs do not contain sensitive content unnecessarily.
- Contact and analytics features avoid storing full IP addresses where possible; if needed for abuse prevention, hash or truncate them.
- Database migrations are reviewed, reversible where practical, and tested before production.
- Destructive migrations include backup, recovery, and rollback notes.
- Accessibility is preserved or improved.
- CI remains at least as strict as before the change.

---

## 3. Recommended execution order

| Order | Ticket | Summary | Why this order matters |
|---:|---|---|---|
| 1 | GDW-001 | Confirm source docs and architectural defaults | Locks project assumptions before coding |
| 2 | GDW-002 | Initialize monorepo and tooling | Creates the repo shape Codex will use everywhere |
| 3 | GDW-003 | Local development stack | Enables safe local work without touching prod |
| 4 | GDW-004 | Environment config validation | Prevents config drift and accidental prod access |
| 5 | GDW-005 | CI, tests, lint, typecheck, build gates | Ensures PRs cannot merge without checks |
| 6 | GDW-006 | Branch protection, CODEOWNERS, PR templates | Enforces George’s manual approval process |
| 7 | GDW-007 | Repository security baseline | Adds secret scanning, dependency review, and security workflow |
| 8 | GDW-008 | Infrastructure-as-code foundation | Establishes repeatable AWS management |
| 9 | GDW-009 | AWS IAM, OIDC, KMS, secrets, naming, tagging | Creates secure deployment identity and secret handling |
| 10 | GDW-010 | Network and database infrastructure | Creates isolated PostgreSQL for dev/prod |
| 11 | GDW-011 | Database backup, restore, and migration safety | Protects content from loss before app work depends on it |
| 12 | GDW-012 | S3 media and CloudFront delivery | Creates secure media foundation |
| 13 | GDW-013 | CMS hosting on ECS Fargate | Creates runtime for Payload CMS |
| 14 | GDW-014 | Frontend hosting and custom domains | Creates runtime for public Astro site |
| 15 | GDW-015 | Dev/prod deployment pipelines | Makes PR merge the deployment trigger |
| 16 | GDW-016 | Observability and operational runbooks | Makes failures visible and recoverable |
| 17 | GDW-017 | Payload CMS scaffold | Starts backend product surface |
| 18 | GDW-018 | Admin auth, RBAC, sessions, audit security | Secures the CMS before content is added |
| 19 | GDW-019 | Core CMS collections | Creates shared content foundations |
| 20 | GDW-020 | Posts, pages, and publishing workflow | Enables writing/editor MVP |
| 21 | GDW-021 | Media library integration | Supports images, alt text, and S3 uploads |
| 22 | GDW-022 | Now, projects, and links CMS modules | Enables core personal hub content |
| 23 | GDW-023 | Admin dashboard MVP | Makes the backend pleasant and task-oriented |
| 24 | GDW-024 | Astro public site scaffold and design system | Starts public UI after data model exists |
| 25 | GDW-025 | Public content data layer | Ensures public site only reads published content |
| 26 | GDW-026 | MVP public routes | Implements Home, About, Writing, Now, Projects, Links, Contact |
| 27 | GDW-027 | RSS, sitemap, robots, metadata, structured data | Makes the site discoverable |
| 28 | GDW-028 | Accessibility baseline | Makes WCAG work part of the build, not an afterthought |
| 29 | GDW-029 | End-to-end smoke tests | Tests public and CMS-critical paths |
| 30 | GDW-030 | WordPress import proof of concept | Proves migration path early |
| 31 | GDW-031 | Full WordPress import pipeline | Imports posts, media, metadata, and redirects |
| 32 | GDW-032 | Import review and cleanup queue | Makes migration safe and reviewable |
| 33 | GDW-033 | Redirect migration and URL preservation | Protects old WordPress links and SEO |
| 34 | GDW-034 | Draft preview workflow | Enables safe review before publishing |
| 35 | GDW-035 | Revisions and scheduled publishing | Adds richer writing workflow |
| 36 | GDW-036 | Admin search, public search, and search indexes | Adds content findability |
| 37 | GDW-037 | Broken link and content quality jobs | Keeps the site maintainable over time |
| 38 | GDW-038 | SEO/social preview tools | Improves publishing confidence |
| 39 | GDW-039 | Native contact form and inbox | Adds contact workflow and spam protection |
| 40 | GDW-040 | Bookshelf | Adds reading log and book notes |
| 41 | GDW-041 | Visual timeline | Adds distinctive personal/professional timeline |
| 42 | GDW-042 | Advanced homepage, 404, colophon, visual polish | Makes public site memorable and complete |
| 43 | GDW-043 | Notes, Start Here, Resources, Uses | Adds optional content areas |
| 44 | GDW-044 | Newsletter | Adds subscriber and newsletter workflow |
| 45 | GDW-045 | GitHub project sync | Adds automated project suggestions |
| 46 | GDW-046 | ISBN lookup | Adds bookshelf helper automation |
| 47 | GDW-047 | Webmentions and IndieWeb | Adds moderated interaction |
| 48 | GDW-048 | Privacy-friendly analytics | Adds site insight without surveillance |
| 49 | GDW-049 | Content calendar, writing stats, public changelog | Adds long-term admin insights |
| 50 | GDW-050 | Security threat model and hardening pass | Reviews the whole system before launch |
| 51 | GDW-051 | Launch readiness and production cutover | Makes production launch controlled |
| 52 | GDW-052 | Post-launch maintenance automation | Keeps dependencies, backups, and monitoring healthy |

---

## 4. Traceability matrix

| Requirement / feature | Tickets covering it |
|---|---|
| Static-first public site | GDW-024, GDW-025, GDW-026, GDW-027 |
| Database-backed CMS/admin | GDW-017 through GDW-023 |
| Pleasant weekly update workflow | GDW-020, GDW-022, GDW-023, GDW-034, GDW-035, GDW-037, GDW-049 |
| Local development | GDW-002, GDW-003, GDW-004 |
| Dev and prod AWS environments | GDW-008 through GDW-016 |
| PR approval by George | GDW-005, GDW-006, GDW-015 |
| Tests required before merge | GDW-005, GDW-029 |
| Deploy on accepted PR / branch merge | GDW-015 |
| PostgreSQL database | GDW-010, GDW-011, GDW-017 |
| Database backups / never lose data goal | GDW-011, GDW-048, GDW-052 |
| S3 media storage | GDW-012, GDW-021, GDW-031 |
| Secrets outside repo | GDW-004, GDW-007, GDW-009 |
| Secure CMS admin | GDW-018, GDW-050 |
| Home page | GDW-026, GDW-042 |
| About/Bio | GDW-019, GDW-020, GDW-026 |
| Blog/Writing | GDW-020, GDW-026, GDW-027, GDW-034, GDW-035 |
| Now page | GDW-022, GDW-026 |
| Projects | GDW-022, GDW-026, GDW-045 |
| Links | GDW-022, GDW-026 |
| Bookshelf | GDW-040, GDW-046 |
| Timeline | GDW-041 |
| Contact | GDW-026, GDW-039 |
| RSS | GDW-027, GDW-044 |
| Multiple RSS feeds | GDW-044 |
| Sitemap | GDW-027 |
| Structured data | GDW-027, GDW-038 |
| SEO/social metadata | GDW-027, GDW-038 |
| Accessibility WCAG 2.2 AA target | GDW-028, GDW-042, GDW-050 |
| WordPress import POC | GDW-030 |
| Full WordPress import | GDW-031, GDW-032, GDW-033 |
| Redirect map | GDW-019, GDW-033 |
| Import cleanup queue | GDW-032 |
| Live preview / draft preview | GDW-034 |
| Revisions | GDW-035 |
| Scheduled publishing | GDW-035 |
| Admin dashboard | GDW-023, GDW-037, GDW-049 |
| Broken link checker | GDW-037 |
| Content quality checks | GDW-037 |
| Site search | GDW-036 |
| Admin search | GDW-036 |
| Colophon | GDW-042 |
| Beautiful 404 | GDW-042 |
| Reading-now widgets | GDW-040, GDW-042 |
| Newsletter | GDW-044 |
| Contact form inbox | GDW-039 |
| GitHub sync | GDW-045 |
| ISBN lookup | GDW-046 |
| Webmentions | GDW-047 |
| Privacy-friendly analytics | GDW-048 |
| Content calendar | GDW-049 |
| Admin writing statistics | GDW-049 |
| Public changelog | GDW-049 |

---

# 5. Tickets

---

## GDW-001 — Confirm source documents and architectural defaults

**Phase:** 0 — Project control  
**Dependencies:** None  
**Recommended order:** 1  
**Type:** Documentation / architecture

### Purpose

Make sure the repository contains the source requirements, architecture addendum, Codex ruleset, README, and this ticket backlog. Establish the default stack before Codex starts creating application code.

### Execution notes for Codex

- Create or confirm a `docs/` directory.
- Add the requirements PDF, database architecture addendum, Codex ruleset, README, and this backlog to the repo.
- Create an initial ADR confirming the default architecture unless already documented:
  - Astro public site
  - Payload CMS
  - PostgreSQL
  - S3 media storage
  - ECS Fargate CMS hosting
  - AWS Amplify Hosting or S3/CloudFront public hosting
  - GitHub Actions CI/CD
  - AWS CDK or Terraform for infrastructure
- Do not start replacing these choices without an ADR and George’s approval.

### Acceptance criteria

- [ ] `docs/` contains the requirements document and database architecture addendum.
- [ ] `CODEX_RULESET.md` exists at the repo root.
- [ ] `README.md` exists at the repo root.
- [ ] This ticket backlog exists in `docs/` or another clearly documented project location.
- [ ] `README.md` links to the source documents and ticket backlog.
- [ ] An ADR exists confirming the default implementation stack, or `CODEX_RULESET.md` explicitly confirms it.
- [ ] The ADR or ruleset confirms that the public site is static-first and the CMS is database-backed.
- [ ] The ADR or ruleset confirms that normal content editing should not require manual file edits.
- [ ] The ADR or ruleset confirms that all work goes through PRs and George’s approval.
- [ ] No application code is introduced that contradicts these source documents.

---

## GDW-002 — Initialize monorepo structure and project tooling

**Phase:** 0 — Foundation  
**Dependencies:** GDW-001  
**Recommended order:** 2  
**Type:** Engineering foundation

### Purpose

Create the repository structure Codex will use for the whole project, including app directories, shared packages, scripts, infrastructure, and documentation.

### Execution notes for Codex

- Use the monorepo shape defined in `CODEX_RULESET.md`:
  - `apps/site`
  - `apps/cms`
  - `packages/shared`
  - `scripts`
  - `infra`
  - `docs`
  - `.github`
- Use TypeScript and pnpm by default.
- Add workspace-level formatting, linting, testing, and build scripts.
- Keep initial code minimal; avoid premature feature work in this ticket.

### Acceptance criteria

- [ ] Repo uses a pnpm workspace.
- [ ] Root `package.json` includes workspace scripts for `dev`, `lint`, `typecheck`, `test`, `build`, and `format` or equivalent.
- [ ] `pnpm-workspace.yaml` includes `apps/*`, `packages/*`, and any relevant workspace paths.
- [ ] `apps/site` exists for the Astro public site.
- [ ] `apps/cms` exists for the Payload CMS app.
- [ ] `packages/shared` exists for shared types, schemas, validators, constants, and SEO helpers.
- [ ] `scripts` exists for importers and maintenance jobs.
- [ ] `infra` exists for infrastructure-as-code.
- [ ] `docs` exists for requirements, ADRs, runbooks, and project planning.
- [ ] TypeScript configuration exists at the root and/or app level.
- [ ] Formatting and linting configuration exists and is used consistently.
- [ ] `README.md` documents the repository structure.
- [ ] Running `pnpm install` succeeds from a clean checkout.
- [ ] No generated secrets, `.env.local`, node modules, build artifacts, or local database files are committed.

---

## GDW-003 — Create safe local development stack

**Phase:** 0 — Foundation  
**Dependencies:** GDW-002  
**Recommended order:** 3  
**Type:** Developer experience / security

### Purpose

Allow George and Codex to run the site, CMS, PostgreSQL, and media-compatible storage locally without using production services.

### Execution notes for Codex

- Add Docker Compose for local PostgreSQL.
- Add MinIO or LocalStack for local S3-compatible testing where practical.
- Add safe seed data for local development.
- Add scripts for starting, stopping, resetting, and seeding local services.
- Ensure local defaults cannot accidentally connect to production.

### Acceptance criteria

- [ ] `docker-compose.yml` or equivalent starts local PostgreSQL.
- [ ] Local S3-compatible media storage is configured, or a documented local media fallback exists.
- [ ] Local database name, user, password, port, and host are documented with non-sensitive placeholder values.
- [ ] `.env.example` includes all required local environment variable names with safe placeholders.
- [ ] `.env.local` is ignored by Git.
- [ ] Local seed data exists and is safe to commit.
- [ ] A local reset command exists or is documented.
- [ ] A local seed command exists or is documented.
- [ ] `README.md` explains how to start local services.
- [ ] `README.md` explains how to run the public site and CMS locally.
- [ ] Local development does not require production AWS access.
- [ ] Local development does not include production credentials.
- [ ] A clean checkout can reach a working local baseline using documented commands.

---

## GDW-004 — Add environment configuration validation

**Phase:** 0 — Foundation  
**Dependencies:** GDW-002, GDW-003  
**Recommended order:** 4  
**Type:** Security / developer experience

### Purpose

Prevent invalid, missing, or dangerous environment configuration from causing subtle bugs or accidental production access.

### Execution notes for Codex

- Add typed environment validation in `packages/shared` or app-specific config modules.
- Validate required variables at app startup and build time where appropriate.
- Separate local, development, and production configuration expectations.
- Never include real secret values in examples.

### Acceptance criteria

- [ ] Environment variables are validated with a typed schema or equivalent approach.
- [ ] Invalid configuration fails fast with a clear developer-friendly error.
- [ ] Public environment variables are explicitly separated from server-only secrets.
- [ ] Production-only variables cannot accidentally be required for local startup unless documented and safe.
- [ ] App code does not read raw `process.env` throughout the codebase when a typed config module is available.
- [ ] `.env.example` is complete and contains only placeholders.
- [ ] `README.md` documents required variables by app and environment.
- [ ] The validation layer includes tests for missing and invalid required variables.
- [ ] Config checks help prevent local/dev from using production database URLs by accident.
- [ ] No secrets are logged when config validation fails.

---

## GDW-005 — Implement CI quality gates

**Phase:** 0 — Foundation  
**Dependencies:** GDW-002  
**Recommended order:** 5  
**Type:** CI/CD / quality

### Purpose

Make tests, type checks, linting, and builds mandatory before PRs can merge.

### Execution notes for Codex

- Add `.github/workflows/ci.yml`.
- Run CI on PRs targeting `develop` and `main`.
- CI should install dependencies with a frozen lockfile.
- CI should fail on lint, type, test, or build errors.
- Keep checks fast enough for normal PR use.

### Acceptance criteria

- [ ] `ci.yml` runs on pull requests to `develop` and `main`.
- [ ] CI runs `pnpm install --frozen-lockfile` or equivalent.
- [ ] CI runs lint checks.
- [ ] CI runs type checks.
- [ ] CI runs unit tests.
- [ ] CI runs app/package builds.
- [ ] CI uses caching where safe and practical.
- [ ] CI fails when a required check fails.
- [ ] CI does not require real production secrets.
- [ ] A placeholder or initial test exists so the test command is meaningful.
- [ ] `README.md` documents the local commands that mirror CI.
- [ ] Codex does not weaken CI to make failures pass.

---

## GDW-006 — Configure branch protection, PR templates, and CODEOWNERS

**Phase:** 0 — Governance  
**Dependencies:** GDW-005  
**Recommended order:** 6  
**Type:** Repository governance

### Purpose

Enforce the development process: feature branches, PR review, passing checks, and George’s manual approval before merge.

### Execution notes for Codex

- Add `.github/pull_request_template.md`.
- Add `.github/CODEOWNERS` with George as owner.
- Document branch protection settings in `docs/runbooks/github-branch-protection.md` because Codex may not be able to configure GitHub UI settings directly.
- Ensure `develop` and `main` are protected.

### Acceptance criteria

- [ ] Pull request template exists.
- [ ] PR template includes testing evidence, security checklist, accessibility checklist, migration checklist, and docs checklist.
- [ ] `CODEOWNERS` exists and assigns all files to George’s GitHub user.
- [ ] Documentation explains that `develop` and `main` require PR review.
- [ ] Documentation explains that George must manually approve PRs.
- [ ] Documentation explains that required CI checks must pass before merge.
- [ ] Documentation says force pushes to protected branches should be disabled.
- [ ] Documentation says branch deletion for protected branches should be disabled.
- [ ] Documentation says unresolved PR conversations should block merge where practical.
- [ ] Documentation says production deployment should use a protected GitHub Environment.
- [ ] README reflects the PR workflow accurately.

---

## GDW-007 — Add repository security baseline

**Phase:** 0 — Security  
**Dependencies:** GDW-005, GDW-006  
**Recommended order:** 7  
**Type:** Security

### Purpose

Add automated and documented safeguards against common repository-level security failures.

### Execution notes for Codex

- Add Dependabot configuration for package updates and GitHub Actions updates.
- Add dependency review or equivalent GitHub security workflow where available.
- Add secret scanning guidance and optional pre-commit secret detection.
- Add security policy documentation.
- Add a security checklist to PRs.

### Acceptance criteria

- [ ] Dependabot config exists for npm/pnpm dependencies.
- [ ] Dependabot config exists for GitHub Actions updates.
- [ ] Dependency review or equivalent security check is configured where available.
- [ ] `.gitignore` excludes `.env`, `.env.local`, local database files, build artifacts, and secret files.
- [ ] `SECURITY.md` or equivalent documents how to report and handle security issues.
- [ ] PR template includes a no-secrets confirmation.
- [ ] PR template includes a public data exposure confirmation.
- [ ] PR template includes a migration safety confirmation.
- [ ] The repo includes guidance for rotating a leaked secret.
- [ ] Security checks do not require production secrets.
- [ ] README or docs recommend GitHub secret scanning and push protection.

---

## GDW-008 — Establish infrastructure-as-code foundation

**Phase:** 1 — AWS foundation  
**Dependencies:** GDW-001, GDW-002  
**Recommended order:** 8  
**Type:** Infrastructure

### Purpose

Create repeatable infrastructure definitions for dev and prod, using one infrastructure-as-code tool.

### Execution notes for Codex

- Choose AWS CDK or Terraform.
- Create an ADR if the choice is not already accepted.
- Do not mix CDK and Terraform without a documented reason.
- Structure infra so dev and prod stacks are isolated but share reusable modules/components.
- Include tags and naming conventions.

### Acceptance criteria

- [ ] Infrastructure tool choice is documented in an ADR.
- [ ] `infra/` contains a working IaC project.
- [ ] Dev and prod stacks/environments are represented separately.
- [ ] Resource names include project and environment identifiers.
- [ ] Standard tags are applied, including project, environment, owner, and managed-by.
- [ ] Infrastructure can be synthesized/planned locally without production secrets.
- [ ] README or an infra runbook documents how to plan, review, and apply infrastructure changes.
- [ ] Destructive infrastructure changes require explicit review notes.
- [ ] Infra code includes no hardcoded secret values.
- [ ] CI includes at least a syntax/synth/plan validation for infrastructure where practical.

---

## GDW-009 — Configure AWS IAM, GitHub OIDC, KMS, and Secrets Manager

**Phase:** 1 — AWS foundation / security  
**Dependencies:** GDW-008  
**Recommended order:** 9  
**Type:** Security / infrastructure

### Purpose

Create the secure identity and secret-management foundation for GitHub Actions, app services, database access, and media access.

### Execution notes for Codex

- Prefer GitHub OIDC for AWS deployments.
- Create separate IAM roles for dev deploy, prod deploy, CMS runtime, and jobs/workers.
- Scope roles by environment.
- Store deployed secrets in AWS Secrets Manager.
- Use KMS-managed encryption where appropriate.

### Acceptance criteria

- [ ] GitHub Actions can assume environment-scoped AWS roles without long-lived AWS access keys.
- [ ] Dev deploy role cannot modify prod resources.
- [ ] Prod deploy role is restricted to required prod deployment actions.
- [ ] CMS runtime role has least-privilege access to required secrets and media resources.
- [ ] Background job role has least-privilege access to only required queues, secrets, buckets, and APIs.
- [ ] Secrets Manager entries are defined or documented for database credentials, Payload secrets, API keys, webhook secrets, email credentials/config, and other deployed secrets.
- [ ] Secrets are not printed in logs.
- [ ] KMS keys or AWS-managed encryption are used where appropriate for secrets, database, and buckets.
- [ ] IAM policy intent is documented in an infra security runbook.
- [ ] PR template reminds Codex to update `.env.example` without adding real values when new secrets are introduced.

---

## GDW-010 — Create isolated dev/prod network and PostgreSQL infrastructure

**Phase:** 1 — AWS foundation  
**Dependencies:** GDW-008, GDW-009  
**Recommended order:** 10  
**Type:** Infrastructure / data

### Purpose

Provision the PostgreSQL databases and required networking for dev and prod, with production isolated and protected.

### Execution notes for Codex

- Use Aurora PostgreSQL Serverless v2 or RDS PostgreSQL, based on the accepted ADR.
- Ensure dev and prod databases are separate.
- Place production database in private networking where practical.
- Avoid public database exposure.
- Configure security groups and access from CMS service only.

### Acceptance criteria

- [ ] Dev PostgreSQL database is provisioned separately from prod.
- [ ] Prod PostgreSQL database is provisioned separately from dev.
- [ ] Production database is not publicly accessible.
- [ ] Database credentials are stored in Secrets Manager or equivalent.
- [ ] CMS runtime can connect to the database using least-privilege networking and credentials.
- [ ] Local development is not configured to use production database by default.
- [ ] Database encryption at rest is enabled.
- [ ] Production deletion protection is enabled where supported.
- [ ] Final snapshot on deletion is enabled or documented where supported.
- [ ] Connection limits and instance/serverless capacity are appropriate for a small personal site but can scale later.
- [ ] Database resource names clearly identify environment.
- [ ] Infra docs explain how to locate dev and prod database resources.

---

## GDW-011 — Implement database backups, restore process, and migration safety

**Phase:** 1 — Data protection  
**Dependencies:** GDW-010  
**Recommended order:** 11  
**Type:** Data protection / operations

### Purpose

Make data loss unlikely and make recovery testable. This ticket directly supports the requirement that database content be backed up so George does not lose his site data.

### Execution notes for Codex

- Configure automated backups and point-in-time recovery where supported.
- Use a strong default retention target of 30 days for production.
- Add pre-migration snapshot expectations.
- Add a restore runbook.
- Add at least one restore drill task or workflow.

### Acceptance criteria

- [ ] Production automated backups are enabled.
- [ ] Production point-in-time recovery is enabled where supported.
- [ ] Production backup retention is set to the accepted retention value, defaulting to 30 days unless George chooses otherwise.
- [ ] Development backups are enabled where practical, with shorter retention allowed.
- [ ] Deletion protection is enabled for production database resources.
- [ ] Final snapshot on deletion is configured or explicitly documented if not supported.
- [ ] A runbook documents how to restore production data to a safe restore target.
- [ ] A runbook documents how to perform a point-in-time restore.
- [ ] A runbook documents how to verify restored data.
- [ ] Deployment documentation requires a recent backup/snapshot before risky production migrations.
- [ ] Migration guidance explains that destructive migrations require backup and rollback notes.
- [ ] A periodic restore test is scheduled/documented.
- [ ] Restore testing never overwrites production.
- [ ] README summarizes the backup policy.

---

## GDW-012 — Provision S3 media storage and secure public delivery

**Phase:** 1 — AWS foundation  
**Dependencies:** GDW-008, GDW-009  
**Recommended order:** 12  
**Type:** Infrastructure / media / security

### Purpose

Create secure media storage for uploads, WordPress imports, book covers, project images, and social images.

### Execution notes for Codex

- Create separate dev and prod media buckets.
- Block public access by default.
- Enable production bucket versioning.
- Serve public media through CloudFront or another deliberate public delivery mechanism.
- Organize media prefixes for uploads, WordPress imports, book covers, project images, and social images.

### Acceptance criteria

- [ ] Dev media bucket exists and is separate from prod.
- [ ] Prod media bucket exists and is separate from dev.
- [ ] Public access block is enabled by default.
- [ ] Production bucket versioning is enabled.
- [ ] Bucket encryption is enabled.
- [ ] CMS runtime has least-privilege write access to required prefixes only.
- [ ] Public media delivery path is documented.
- [ ] CloudFront or equivalent is configured if selected for public delivery.
- [ ] Direct bucket public listing is disabled.
- [ ] CORS is restricted to required origins only.
- [ ] Lifecycle rules are conservative and do not delete originals without explicit review.
- [ ] Media prefix structure includes `uploads/`, `wordpress-imports/`, `book-covers/`, `project-images/`, and `social-images/` or documented equivalents.
- [ ] README or media runbook explains where uploaded files are stored and how they are backed up/versioned.

---

## GDW-013 — Deploy Payload CMS backend to ECS Fargate

**Phase:** 1 — AWS foundation  
**Dependencies:** GDW-009, GDW-010, GDW-012, GDW-017  
**Recommended order:** 13  
**Type:** Infrastructure / backend deployment

### Purpose

Provide managed AWS hosting for the CMS/API without managing servers.

### Execution notes for Codex

- Create ECR repositories for CMS images.
- Create ECS Fargate services for dev and prod.
- Connect CMS to the correct database, media bucket, and secrets per environment.
- Add health checks.
- Add logs.
- Keep prod and dev isolated.

### Acceptance criteria

- [ ] Dev CMS service runs in ECS Fargate or the accepted backend hosting target.
- [ ] Prod CMS service runs separately from dev.
- [ ] CMS container images are pushed to ECR or accepted registry.
- [ ] CMS service uses environment-specific secrets from Secrets Manager.
- [ ] CMS service connects to environment-specific PostgreSQL.
- [ ] CMS service writes media only to the matching environment bucket.
- [ ] Health check endpoint exists and is used by the service/load balancer.
- [ ] Logs are sent to CloudWatch or accepted logging target.
- [ ] The CMS is reachable at the configured dev/prod admin URLs once DNS is ready.
- [ ] Production service does not expose database credentials or stack traces in public responses.
- [ ] Deployment failure leaves the previous stable service running where practical.

---

## GDW-014 — Provision public frontend hosting, CDN, HTTPS, and custom domains

**Phase:** 1 — AWS foundation  
**Dependencies:** GDW-008, GDW-009, GDW-024  
**Recommended order:** 14  
**Type:** Infrastructure / frontend deployment

### Purpose

Host the static-first public Astro site with HTTPS, CDN delivery, custom domains, and separate dev/prod environments.

### Execution notes for Codex

- Use AWS Amplify Hosting or S3 + CloudFront, based on accepted project decision.
- Configure dev and prod as separate frontend deployments.
- Configure HTTPS certificates.
- Configure custom domain mappings when domains are available.
- Add cache invalidation or deployment cache handling as needed.

### Acceptance criteria

- [ ] Dev public site has its own hosting target.
- [ ] Prod public site has its own hosting target.
- [ ] HTTPS is enabled for public site URLs.
- [ ] `georgedallas.com` and `www.georgedallas.com` are supported for production when DNS is ready.
- [ ] `dev.georgedallas.com` or an accepted temporary dev URL is supported.
- [ ] CDN caching is configured appropriately for static assets.
- [ ] Cache invalidation or equivalent is documented for production deploys.
- [ ] Rollback support is documented.
- [ ] Public site deployment does not expose CMS secrets.
- [ ] Public site build consumes only public published CMS data.
- [ ] README documents the chosen frontend hosting model.

---

## GDW-015 — Implement dev and production deployment pipelines

**Phase:** 1 — CI/CD  
**Dependencies:** GDW-005, GDW-006, GDW-013, GDW-014  
**Recommended order:** 15  
**Type:** CI/CD / deployment

### Purpose

Make accepted PRs and branch merges the only standard deployment path.

### Execution notes for Codex

- Add `deploy-dev.yml` triggered by merge to `develop`.
- Add `deploy-prod.yml` triggered by merge to `main`.
- Dev deploy should be automatic after merge to `develop`.
- Prod deploy should use GitHub Environment protection and George approval where configured.
- Include smoke tests after deploy.

### Acceptance criteria

- [ ] Merge to `develop` triggers dev deployment.
- [ ] Merge to `main` triggers production deployment.
- [ ] Deployment workflows do not run on arbitrary local commands as the standard path.
- [ ] Dev deployment uses dev AWS role and dev resources only.
- [ ] Production deployment uses prod AWS role and prod resources only.
- [ ] Production deployment is tied to a protected GitHub Environment or documented equivalent.
- [ ] Production deployment requires George’s approval where GitHub environment protection is configured.
- [ ] CMS image build and deploy are included.
- [ ] Public Astro build and deploy are included.
- [ ] Database migrations run in a controlled step before app deployment or in a documented safe order.
- [ ] Production migration step checks for backup/snapshot requirements before risky migrations.
- [ ] Deployment smoke tests run after dev deploy.
- [ ] Deployment smoke tests run after prod deploy.
- [ ] Failed deploys report clearly in GitHub Actions.
- [ ] README documents the full dev and prod deployment flow.

---

## GDW-016 — Add observability, alerts, and operational runbooks

**Phase:** 1 — Operations  
**Dependencies:** GDW-013, GDW-014, GDW-015  
**Recommended order:** 16  
**Type:** Operations / reliability

### Purpose

Make app, deployment, and infrastructure problems visible and diagnosable.

### Execution notes for Codex

- Add CloudWatch logging for CMS and worker services.
- Add deployment status visibility.
- Add basic alarms for service health and error conditions.
- Add runbooks for common failures.
- Keep monitoring cost appropriate for a personal site.

### Acceptance criteria

- [ ] CMS logs are available in CloudWatch or accepted logging target.
- [ ] Worker/job logs are available when workers exist.
- [ ] Frontend deployment failures are visible in GitHub Actions or hosting provider logs.
- [ ] Basic alarms exist or are documented for CMS service unhealthy, repeated task failures, database connection failure, and high error rate where practical.
- [ ] A runbook exists for failed CMS deploy.
- [ ] A runbook exists for failed public site deploy.
- [ ] A runbook exists for database migration failure.
- [ ] A runbook exists for restoring database backup.
- [ ] A runbook exists for suspected secret leak.
- [ ] Logs avoid unnecessary sensitive data.
- [ ] Observability choices are documented with expected monthly cost considerations where practical.

---

## GDW-017 — Scaffold Payload CMS application

**Phase:** 2 — CMS foundation  
**Dependencies:** GDW-002, GDW-003, GDW-004  
**Recommended order:** 17  
**Type:** Backend / CMS

### Purpose

Create the Payload CMS app that will become the private personal operating system for the website.

### Execution notes for Codex

- Initialize Payload CMS in `apps/cms`.
- Use PostgreSQL as the primary database.
- Use TypeScript.
- Configure local dev connection to Docker PostgreSQL.
- Keep initial collections minimal until later tickets add models.

### Acceptance criteria

- [ ] `apps/cms` contains a working Payload CMS app.
- [ ] CMS runs locally with documented command.
- [ ] CMS connects to local PostgreSQL.
- [ ] CMS configuration uses typed environment validation.
- [ ] CMS build succeeds in CI.
- [ ] CMS has a health check endpoint suitable for ECS/load balancer use.
- [ ] CMS has no hardcoded secrets.
- [ ] CMS startup fails safely if required secrets are missing.
- [ ] CMS uses project linting and formatting.
- [ ] README documents how to run the CMS locally.

---

## GDW-018 — Secure CMS admin authentication, RBAC, sessions, and audit logging

**Phase:** 2 — CMS security  
**Dependencies:** GDW-017  
**Recommended order:** 18  
**Type:** Security / CMS

### Purpose

Protect the admin area before meaningful private content and workflows are added.

### Execution notes for Codex

- Implement users and roles.
- Recommended roles: Owner, Editor, Read-only, API.
- Configure session/cookie security for deployed environments.
- Enable 2FA where supported, or document the selected 2FA/auth provider plan if Payload’s chosen auth approach requires an extension.
- Add audit logging for important admin actions.

### Acceptance criteria

- [ ] CMS admin requires authentication.
- [ ] Owner role exists and has full administrative access.
- [ ] Editor role exists and has content management access without infrastructure/security administration.
- [ ] Read-only role exists and cannot mutate content.
- [ ] API role/service user exists only if needed and is least-privileged.
- [ ] Role-based access rules are enforced server-side.
- [ ] Session cookies are secure in production.
- [ ] CSRF/session protections are configured according to framework best practices.
- [ ] 2FA is enabled where supported or an ADR/runbook documents the accepted approach and limitation.
- [ ] Failed login attempts are handled safely.
- [ ] Admin routes do not expose private data to unauthenticated users.
- [ ] Audit log records login-relevant/security-relevant events where practical.
- [ ] Audit log records content create/update/publish/delete actions where practical.
- [ ] Tests cover at least one allowed and one denied role action.

---

## GDW-019 — Implement core CMS collections: site settings, redirects, tags, categories, media shell

**Phase:** 2 — CMS data model  
**Dependencies:** GDW-017, GDW-018  
**Recommended order:** 19  
**Type:** CMS / data model

### Purpose

Create shared CMS foundations used across public pages, redirects, SEO, writing, and navigation.

### Execution notes for Codex

- Add `site_settings` global/collection.
- Add `redirects` collection.
- Add `tags` and `categories` for writing organization.
- Add initial media collection shell; full S3 behavior is in GDW-021.
- Add validation and access controls.

### Acceptance criteria

- [ ] Site settings support site title, default SEO title, default description, default social image, owner name, primary links, navigation controls, and footer controls.
- [ ] Redirects support source path, destination URL/path, status code, enabled flag, notes, and environment-safe validation.
- [ ] Redirects prevent invalid source paths and unsafe redirect values where practical.
- [ ] Tags support name and unique slug.
- [ ] Categories support name and unique slug.
- [ ] Media shell supports filename, alt text, caption, credit, source, MIME type, size, width, height, storage key, and review status.
- [ ] Public images have alt text enforcement or publish-blocking validation where practical.
- [ ] Access controls prevent unauthenticated mutation.
- [ ] Public API exposure is limited to fields needed by the public site.
- [ ] Tests cover slug uniqueness or validation for tags/categories.
- [ ] Tests cover redirect validation.

---

## GDW-020 — Implement posts, pages, and core publishing workflow

**Phase:** 2 — CMS publishing  
**Dependencies:** GDW-019  
**Recommended order:** 20  
**Type:** CMS / publishing

### Purpose

Enable George to write, draft, edit, preview-ready, and publish blog posts and editorial pages without manually editing files.

### Execution notes for Codex

- Add Posts collection.
- Add Pages collection.
- Use publishing states: `draft`, `in_review`, `scheduled`, `published`, `archived`.
- Include metadata and WordPress migration fields.
- Include validation that prevents invalid publish states.

### Acceptance criteria

- [ ] Posts collection includes title, slug, excerpt, body, status, publishedAt, updatedAt, author, tags, category, featuredImage, seoTitle, seoDescription, socialImage, canonicalUrl, wordpressOriginalId, wordpressOriginalUrl, redirectFrom, readingTime, visibility, and relatedPosts where practical.
- [ ] Pages collection includes title, slug, body, template, status, seoTitle, seoDescription, showInNav, visibility, and updatedAt where practical.
- [ ] Slugs are unique within their collection.
- [ ] Slugs are stable and not automatically changed after publication unless explicitly edited.
- [ ] Published content requires required metadata and publish date.
- [ ] Scheduled content requires a future publishedAt date.
- [ ] Archived content does not appear on the public site.
- [ ] Private/draft/in_review/scheduled future content is excluded from public build queries.
- [ ] Rich text editor supports headings, links, lists, quotes, images/media embeds, and code blocks where practical.
- [ ] Editor experience is calm and understandable, not a generic confusing schema dump.
- [ ] Reading time is calculated or stored consistently.
- [ ] Tests cover public visibility filtering.
- [ ] Tests cover invalid publish states.
- [ ] George can create and publish a post locally without editing code.

---

## GDW-021 — Implement S3-backed media library and image rules

**Phase:** 2 — CMS media  
**Dependencies:** GDW-012, GDW-019  
**Recommended order:** 21  
**Type:** CMS / media / security

### Purpose

Allow George to upload and manage images/media through the CMS, with storage in S3 and safe public delivery.

### Execution notes for Codex

- Connect Payload media uploads to environment-specific S3 buckets.
- Store metadata in PostgreSQL.
- Enforce alt text for public image usage.
- Track imported WordPress media separately.
- Support captions and credits.

### Acceptance criteria

- [ ] CMS uploads media to the correct environment S3 bucket.
- [ ] CMS stores media metadata in PostgreSQL.
- [ ] Media records include alt text, caption, credit, source, width, height, MIME type, size, S3 key, and review status where available.
- [ ] Public image usage requires alt text unless image is explicitly decorative and handled accessibly.
- [ ] Imported media can be flagged as needing review.
- [ ] Media URLs exposed to the public site use the approved public delivery path.
- [ ] S3 bucket credentials are not exposed to the browser.
- [ ] Upload size and MIME type restrictions are enforced.
- [ ] Unsafe file types are rejected.
- [ ] Tests cover media metadata validation.
- [ ] README or media docs explain upload behavior and alt text expectations.

---

## GDW-022 — Implement Now, Projects, and Links CMS modules

**Phase:** 2 — CMS personal hub  
**Dependencies:** GDW-019  
**Recommended order:** 22  
**Type:** CMS / content model

### Purpose

Create core structured content modules for the personal hub beyond blog posts and pages.

### Execution notes for Codex

- Add Now page as singleton/global.
- Add Projects collection.
- Add Links collection.
- Include fields from the architecture addendum.
- Include ordering, featured flags, visibility, and validation.

### Acceptance criteria

- [ ] Now page supports currentFocus, work, reading, listening, watching, personal, updatedAt, and status.
- [ ] Admin dashboard or CMS navigation makes Now page easy to update quickly.
- [ ] Projects support title, slug, summary, description, status, featured, technologies, GitHub URL, live URL, case study URL, image, startDate, endDate, relatedPosts, and sortOrder.
- [ ] Links support title, URL, description, category, icon, featured, sortOrder, and visibility.
- [ ] Projects and links support public/private visibility.
- [ ] Projects and links have stable ordering.
- [ ] Invalid URLs are rejected.
- [ ] Draft/private projects and links do not appear publicly.
- [ ] Tests cover Now page public visibility.
- [ ] Tests cover project/link URL validation.
- [ ] George can update Now, add a project, and add a link through the CMS without editing code.

---

## GDW-023 — Build calm admin dashboard MVP

**Phase:** 2 — CMS experience  
**Dependencies:** GDW-018, GDW-020, GDW-021, GDW-022  
**Recommended order:** 23  
**Type:** CMS / UX

### Purpose

Make the backend feel like George’s personal website operating system, not a raw database admin panel.

### Execution notes for Codex

- Customize the Payload admin dashboard.
- Surface common actions prominently.
- Prioritize weekly update workflow.
- Include missing metadata/alt text tasks when data exists.
- Keep the dashboard calm and task-oriented.

### Acceptance criteria

- [ ] Dashboard includes “Continue latest draft”.
- [ ] Dashboard includes “Update Now page”.
- [ ] Dashboard includes “Add quick link”.
- [ ] Dashboard includes “Add project”.
- [ ] Dashboard includes “Upload media”.
- [ ] Dashboard includes recent drafts.
- [ ] Dashboard includes recently published content.
- [ ] Dashboard includes scheduled posts when scheduled publishing exists or a placeholder until implemented.
- [ ] Dashboard includes imported WordPress review tasks when import data exists or a placeholder until implemented.
- [ ] Dashboard includes missing metadata/alt text tasks when checks exist or a placeholder until implemented.
- [ ] Dashboard does not expose private admin information publicly.
- [ ] Dashboard respects RBAC.
- [ ] Dashboard loads without requiring external third-party services.
- [ ] George can reach the main weekly update actions within one or two clicks after login.

---

## GDW-024 — Scaffold Astro public site and design system

**Phase:** 3 — Public site foundation  
**Dependencies:** GDW-002, GDW-019  
**Recommended order:** 24  
**Type:** Frontend / design system

### Purpose

Create the static-first public website foundation with a calm, credible, distinctive visual direction.

### Execution notes for Codex

- Initialize Astro in `apps/site`.
- Use the approved Cedar & Circuitry style kit as the public-site design system.
- Read and follow `docs/brand/cedar-circuitry-style-guide.md` and `docs/brand/cedar-circuitry-codex-implementation.md` before implementing public UI.
- Import `apps/site/src/styles/cedar-circuitry.css` exactly once from the root Astro layout or global entrypoint.
- Use `apps/site/public/brand/favicon.svg` for the favicon and the Cedar & Circuitry mark/logo in the header/footer where appropriate.
- Add shared layout, typography, spacing, cards, navigation primitives, and content containers.
- Prefer dark mode support and accessible color tokens.
- Use Pacific Northwest design cues subtly: ocean, granite, trees, night sky, quiet natural details.
- Avoid heavy animation and unnecessary JavaScript.

### Acceptance criteria

- [ ] Astro app exists in `apps/site`.
- [ ] Site builds successfully.
- [ ] Shared layout component exists.
- [ ] Navigation component exists.
- [ ] Footer component exists.
- [ ] Card/list components exist for content previews.
- [ ] Cedar & Circuitry global styles are imported once.
- [ ] Header, favicon, and brand usage use the Cedar & Circuitry assets.
- [ ] Typography is readable on desktop and mobile.
- [ ] Color palette supports accessible contrast.
- [ ] Color, border, shadow, spacing, card, button, and prose treatments use the Cedar & Circuitry token system unless documented.
- [ ] Dark mode is supported or the initial design is dark-mode-first as documented.
- [ ] Responsive layout works at mobile, tablet, and desktop widths.
- [ ] Animations are minimal and respect reduced-motion where present.
- [ ] No heavy client-side framework is added unless justified.
- [ ] Design tokens or CSS variables are documented.
- [ ] Build output is static-first by default.

---

## GDW-025 — Build public content data layer with strict visibility filtering

**Phase:** 3 — Public site security/data  
**Dependencies:** GDW-020, GDW-022, GDW-024  
**Recommended order:** 25  
**Type:** Frontend / security / data

### Purpose

Ensure the public site only renders content that is safe, published, and public.

### Execution notes for Codex

- Create typed data fetching helpers in `apps/site` and/or `packages/shared`.
- Centralize public visibility filters.
- Public build queries must exclude drafts, private content, scheduled future content, import issues, contact messages, subscribers, analytics, and admin-only records.
- Add tests for visibility filtering.

### Acceptance criteria

- [ ] Public site data fetching is centralized and typed.
- [ ] Public content queries require `status = published` or equivalent.
- [ ] Public content queries require `publishedAt <= now()` where applicable.
- [ ] Public content queries require `visibility = public` where applicable.
- [ ] Draft posts are excluded from public builds.
- [ ] Scheduled future posts are excluded from public builds.
- [ ] Private posts/pages/projects/links are excluded from public builds.
- [ ] Admin-only collections are not queried by the public build.
- [ ] Import issues are not exposed publicly.
- [ ] Contact messages are not exposed publicly.
- [ ] Subscriber and newsletter records are not exposed publicly.
- [ ] Analytics records are not exposed publicly.
- [ ] Tests cover representative content visibility cases.
- [ ] Public build fails safely if CMS is unavailable, with documented behavior.

---

## GDW-026 — Implement MVP public routes

**Phase:** 3 — Public site MVP  
**Dependencies:** GDW-024, GDW-025  
**Recommended order:** 26  
**Type:** Frontend / content

### Purpose

Build the MVP public website routes required for the personal hub.

### Execution notes for Codex

- Implement routes:
  - `/`
  - `/about`
  - `/now`
  - `/writing`
  - `/writing/[slug]`
  - `/projects`
  - `/links`
  - `/contact`
- Use CMS content where applicable.
- For contact, MVP can be a simple contact/links page if the native form ticket is not complete.

### Acceptance criteria

- [ ] Home page exists and communicates who George is and what the site contains.
- [ ] Home page links to writing, projects, Now page, links, and relevant external sites.
- [ ] About page exists and renders CMS-managed content.
- [ ] Now page exists and renders the latest public Now content.
- [ ] Writing index exists and lists public published posts.
- [ ] Writing detail page exists for each public published post.
- [ ] Projects page exists and renders public projects.
- [ ] Links page exists and renders public structured links, including LinkedIn, GitHub, counselling website, and other external sites when configured.
- [ ] Contact page exists with a safe contact method or links.
- [ ] Public pages are responsive.
- [ ] Public pages use semantic HTML.
- [ ] Public pages have meaningful page titles.
- [ ] Empty states are handled gracefully.
- [ ] Draft/private/scheduled content does not appear on any MVP public route.
- [ ] Build succeeds with seed content.

---

## GDW-027 — Generate RSS, sitemap, robots.txt, metadata, and baseline structured data

**Phase:** 3 — Discoverability  
**Dependencies:** GDW-025, GDW-026  
**Recommended order:** 27  
**Type:** SEO / public site

### Purpose

Improve discoverability, sharing, and machine readability for the public site.

### Execution notes for Codex

- Generate `/rss.xml` from public writing content.
- Generate `/sitemap.xml` from public routes and public content.
- Add `robots.txt`.
- Add canonical URLs.
- Add Open Graph and social metadata.
- Add baseline JSON-LD structured data.

### Acceptance criteria

- [ ] `/rss.xml` exists.
- [ ] RSS feed includes only public published writing content.
- [ ] RSS feed excludes drafts, private posts, and future scheduled posts.
- [ ] RSS feed validates with a standard RSS validator or has automated structural tests.
- [ ] `/sitemap.xml` exists.
- [ ] Sitemap includes public routes and public published content.
- [ ] Sitemap excludes admin routes and private content.
- [ ] `robots.txt` exists and points to sitemap.
- [ ] Each public page has a title and meta description.
- [ ] Canonical URL is generated for each public route.
- [ ] Open Graph metadata is present for major pages and posts.
- [ ] Social image fallback is configured.
- [ ] Baseline JSON-LD is added for website, person, and article content where appropriate.
- [ ] Tests validate RSS and sitemap generation.

---

## GDW-028 — Implement accessibility baseline and quality checks

**Phase:** 3 — Accessibility  
**Dependencies:** GDW-024, GDW-026  
**Recommended order:** 28  
**Type:** Accessibility / quality

### Purpose

Make accessibility part of the definition of done from the start, targeting WCAG 2.2 AA where practical.

### Execution notes for Codex

- Audit components for semantic HTML.
- Add visible focus states.
- Check color contrast.
- Add keyboard navigation support.
- Add automated accessibility checks where practical.
- Do not rely only on automation.

### Acceptance criteria

- [ ] Site uses semantic landmarks: header, nav, main, footer where appropriate.
- [ ] Heading hierarchy is logical.
- [ ] Interactive elements are keyboard accessible.
- [ ] Focus states are visible.
- [ ] Links have meaningful accessible names.
- [ ] Images exposed publicly have alt text or are marked decorative appropriately.
- [ ] Color contrast meets WCAG 2.2 AA where practical.
- [ ] Forms have labels, descriptions, and accessible error messages where forms exist.
- [ ] Reduced-motion preference is respected where animations exist.
- [ ] Skip link exists or navigation is otherwise keyboard-friendly.
- [ ] Automated accessibility smoke checks run in CI or are documented if deferred.
- [ ] Manual accessibility review checklist exists in docs.
- [ ] README states accessibility is part of definition of done.

---

## GDW-029 — Add end-to-end smoke tests for public and CMS-critical paths

**Phase:** 3 — Testing  
**Dependencies:** GDW-005, GDW-017, GDW-026  
**Recommended order:** 29  
**Type:** Testing

### Purpose

Create confidence that the site, CMS, publishing flow, and deployment outputs work after changes.

### Execution notes for Codex

- Use Playwright or equivalent.
- Start with smoke tests that are reliable and fast.
- Avoid putting real admin credentials in the repo.
- Use test credentials/seeds only in local/CI-safe contexts.

### Acceptance criteria

- [ ] E2E test framework is installed and configured.
- [ ] Homepage smoke test exists.
- [ ] Writing index smoke test exists.
- [ ] Writing detail smoke test exists using seed or test content.
- [ ] Projects page smoke test exists.
- [ ] Links page smoke test exists.
- [ ] Now page smoke test exists.
- [ ] Contact page smoke test exists.
- [ ] CMS health check smoke test exists.
- [ ] Admin login smoke test exists where safe and practical.
- [ ] Draft/private content leakage test exists or is covered by integration tests.
- [ ] Tests run locally with documented command.
- [ ] Tests run in CI or deployment smoke workflows where practical.
- [ ] Tests do not require production credentials.

---

## GDW-030 — Build WordPress import proof of concept

**Phase:** 4 — WordPress migration  
**Dependencies:** GDW-020, GDW-021  
**Recommended order:** 30  
**Type:** Migration / scripts

### Purpose

Prove that existing WordPress blog content can be imported through the WordPress REST API before building the full migration pipeline.

### Execution notes for Codex

- Use WordPress REST API as the preferred source.
- Scraping is fallback only and must be documented if used.
- Import a small subset of posts into dev/local as drafts or imported records.
- Preserve original IDs and URLs.
- Flag unsupported elements.

### Acceptance criteria

- [ ] Import script can fetch posts from WordPress REST API.
- [ ] Script handles pagination.
- [ ] Script imports a limited test subset into local/dev Payload.
- [ ] Imported posts are not automatically published.
- [ ] Original WordPress ID is stored.
- [ ] Original WordPress URL is stored.
- [ ] Original title, slug, date, excerpt, body, and author where available are preserved or mapped.
- [ ] Unsupported shortcodes/embeds are detected and flagged.
- [ ] Import produces a summary report.
- [ ] Import can run repeatedly without duplicating the same imported post.
- [ ] Script has unit tests for transformation helpers.
- [ ] README or migration docs explain how to run the proof of concept safely.

---

## GDW-031 — Build full repeatable WordPress import pipeline

**Phase:** 4 — WordPress migration  
**Dependencies:** GDW-030, GDW-012, GDW-021  
**Recommended order:** 31  
**Type:** Migration / background jobs

### Purpose

Import WordPress content as a repeatable workflow, including posts, media, metadata, redirects, and cleanup issues.

### Execution notes for Codex

- Extend the POC into a full import pipeline.
- Use import jobs, imported items, import issues, and redirects.
- Download media into S3.
- Relink media references in imported content.
- Generate cleanup issues for manual review.

### Acceptance criteria

- [ ] Import jobs are tracked in the database.
- [ ] Imported items are tracked in the database.
- [ ] Import issues are tracked in the database.
- [ ] Import can fetch all WordPress posts through the REST API.
- [ ] Import handles pagination and retries safely.
- [ ] Import stores original WordPress IDs and URLs.
- [ ] Import downloads media to the correct environment S3 bucket.
- [ ] Import stores imported media under a WordPress-specific prefix.
- [ ] Imported media records are flagged for review when metadata/alt text is missing.
- [ ] Internal image links are relinked to imported media where possible.
- [ ] Unsupported shortcodes are flagged.
- [ ] Broken embeds are flagged.
- [ ] Missing excerpts are flagged.
- [ ] Duplicate slugs are resolved or flagged.
- [ ] Redirect records are created or proposed for old URLs.
- [ ] Import can be resumed safely after failure.
- [ ] Import can be rerun idempotently.
- [ ] Import report summarizes imported, skipped, failed, and needs-review items.
- [ ] Tests cover transformation, idempotency, and issue generation.

---

## GDW-032 — Build WordPress import review and cleanup queue in admin

**Phase:** 4 — WordPress migration  
**Dependencies:** GDW-031, GDW-023  
**Recommended order:** 32  
**Type:** CMS / migration UX

### Purpose

Let George review imported WordPress posts, fix cleanup issues, and approve content before publication.

### Execution notes for Codex

- Add admin dashboard widgets for import status.
- Add filterable views for imported content needing review.
- Show issue type, severity, affected content, and suggested action.
- Keep imported content unpublished until reviewed unless George explicitly changes the workflow.

### Acceptance criteria

- [ ] Admin dashboard shows WordPress import status.
- [ ] Admin dashboard links to items needing review.
- [ ] Import issues can be filtered by type.
- [ ] Import issues can be filtered by severity/status.
- [ ] Each issue links to the affected post/media/redirect.
- [ ] George can mark an issue resolved.
- [ ] George can add notes to an import issue.
- [ ] Imported posts clearly show original WordPress ID and URL.
- [ ] Imported posts clearly show review status.
- [ ] Imported posts are not published automatically by default.
- [ ] Review workflow supports approving a post for publication after cleanup.
- [ ] Dashboard includes counts for imported, reviewed, unresolved issues, and ready-to-publish.
- [ ] Access controls prevent unauthenticated users from seeing import data.
- [ ] Tests cover review status transitions.

---

## GDW-033 — Implement redirect migration and URL preservation validation

**Phase:** 4 — WordPress migration / SEO  
**Dependencies:** GDW-019, GDW-031, GDW-027  
**Recommended order:** 33  
**Type:** Redirects / SEO / migration

### Purpose

Protect old WordPress URLs, backlinks, and search value by mapping legacy URLs to new routes.

### Execution notes for Codex

- Use redirect collection from GDW-019.
- Generate redirect proposals during WordPress import.
- Apply redirects at hosting layer, app layer, or static redirect output depending on selected hosting.
- Validate redirects do not create loops or unsafe open redirects.

### Acceptance criteria

- [ ] Redirect records support source path and destination path/URL.
- [ ] WordPress import creates redirect proposals for imported posts.
- [ ] Redirects can be reviewed before activation.
- [ ] Activated redirects are included in the deployed public site/hosting config.
- [ ] Redirects use appropriate HTTP status code, defaulting to permanent where appropriate.
- [ ] Redirect loops are detected and blocked.
- [ ] Unsafe open redirects are blocked where practical.
- [ ] Legacy URL test list exists.
- [ ] Automated test validates representative legacy URLs redirect correctly.
- [ ] Redirects do not expose drafts/private imported content.
- [ ] Migration docs explain final URL structure and redirect strategy.

---

## GDW-034 — Implement draft preview workflow

**Phase:** 5 — Publishing workflow  
**Dependencies:** GDW-020, GDW-025  
**Recommended order:** 34  
**Type:** CMS / frontend integration / security

### Purpose

Allow George to preview drafts before publication without exposing them publicly.

### Execution notes for Codex

- Create secure preview URLs from CMS to Astro preview route/API.
- Use signed tokens or secure preview sessions.
- Ensure preview mode is not indexed and not accessible without authorization.
- Keep preview behavior separate from static public builds.

### Acceptance criteria

- [ ] CMS provides a preview action for posts and pages.
- [ ] Preview URL renders draft content accurately.
- [ ] Preview URL requires a secure token/session or equivalent protection.
- [ ] Preview tokens expire or are revocable where practical.
- [ ] Preview pages are not included in sitemap.
- [ ] Preview pages are marked noindex.
- [ ] Public users cannot guess or access draft preview content without authorization.
- [ ] Published public pages are not affected by preview mode.
- [ ] Tests cover authorized preview access.
- [ ] Tests cover unauthorized preview denial.
- [ ] README or CMS docs explain preview workflow.

---

## GDW-035 — Implement revisions and scheduled publishing

**Phase:** 5 — Publishing workflow  
**Dependencies:** GDW-020, GDW-015, GDW-016  
**Recommended order:** 35  
**Type:** CMS / jobs / data protection

### Purpose

Add revision safety and scheduling so George can confidently edit and publish over time.

### Execution notes for Codex

- Enable or implement revisions for posts/pages and key content modules.
- Implement scheduled publishing with EventBridge/Lambda/SQS or an accepted worker model.
- Scheduled publishing should trigger public site rebuild/deployment as needed.
- Ensure scheduled future content is not publicly rendered before its publish time.

### Acceptance criteria

- [ ] Posts support revision history.
- [ ] Pages support revision history.
- [ ] Key structured modules support revision history where practical.
- [ ] George can view previous revisions.
- [ ] George can restore or copy from a previous revision where practical.
- [ ] Scheduled posts can be created with future publishedAt dates.
- [ ] Scheduled pages/content are supported where needed or documented as post-only initially.
- [ ] Scheduled content remains hidden from public site until due.
- [ ] Scheduled publishing worker finds due content.
- [ ] Scheduled publishing worker updates status to published.
- [ ] Scheduled publishing triggers public site rebuild or cache refresh.
- [ ] Scheduled worker is idempotent.
- [ ] Worker failures are logged and visible.
- [ ] Tests cover scheduled content visibility before and after due time.
- [ ] Docs explain scheduled publishing behavior.

---

## GDW-036 — Implement public search and admin search

**Phase:** 5 — Search  
**Dependencies:** GDW-025, GDW-026, GDW-020, GDW-022  
**Recommended order:** 36  
**Type:** Search / frontend / CMS

### Purpose

Make public content discoverable on the site and make admin content easier for George to find.

### Execution notes for Codex

- Use Pagefind or equivalent static search for public search first.
- Use PostgreSQL full-text search for admin search initially.
- Do not introduce Meilisearch/Typesense/OpenSearch unless PostgreSQL/Pagefind are insufficient and an ADR is accepted.

### Acceptance criteria

- [ ] Public search indexes only public published content.
- [ ] Public search excludes drafts, private content, import issues, contact messages, subscribers, and analytics.
- [ ] Search page or UI exists if public search is enabled.
- [ ] Search works without hitting the production database at runtime where static search is used.
- [ ] Search index is generated during build.
- [ ] Search result titles, excerpts, and URLs are useful.
- [ ] Admin search can search posts, pages, projects, books when implemented, timeline entries when implemented, links, media, contact messages when implemented, and import issues where appropriate.
- [ ] Admin search respects RBAC.
- [ ] Tests verify private content is not in the public search index.
- [ ] Docs explain search architecture and future upgrade path.

---

## GDW-037 — Implement broken link checker and content quality checks

**Phase:** 5 — Admin maintenance  
**Dependencies:** GDW-016, GDW-023, GDW-020, GDW-021, GDW-022  
**Recommended order:** 37  
**Type:** Background jobs / admin UX

### Purpose

Help George keep the site healthy over time by surfacing broken links, missing metadata, missing alt text, stale content, and content quality tasks.

### Execution notes for Codex

- Implement background jobs for link checking and content quality checks.
- Store check results in database collections/tables.
- Surface actionable tasks in admin dashboard.
- Avoid blocking public site on external link failures.

### Acceptance criteria

- [ ] Broken link checks can run manually from admin or script.
- [ ] Broken link checks can run on a schedule where infrastructure exists.
- [ ] Check results are stored in the database.
- [ ] Results include URL, source content, status, checkedAt, and error details where safe.
- [ ] External link check failures do not break public builds.
- [ ] Content quality checks identify missing SEO titles/descriptions.
- [ ] Content quality checks identify missing social images where expected.
- [ ] Content quality checks identify missing alt text for public images.
- [ ] Content quality checks identify stale Now page updates.
- [ ] Content quality checks identify posts missing excerpts.
- [ ] Admin dashboard surfaces actionable counts and links.
- [ ] George can mark or dismiss tasks where appropriate.
- [ ] Checks respect robots/rate limits where appropriate.
- [ ] Tests cover issue creation for missing metadata and broken links with mocked responses.

---

## GDW-038 — Add SEO and social preview tooling

**Phase:** 5 — Publishing confidence  
**Dependencies:** GDW-020, GDW-021, GDW-027, GDW-023  
**Recommended order:** 38  
**Type:** CMS / SEO

### Purpose

Help George understand how a post or page will appear in search results and social sharing before publishing.

### Execution notes for Codex

- Add SEO fields to relevant collections if not already done.
- Add preview UI in admin for title, description, canonical URL, and social image.
- Add validation warnings for missing or too-long metadata.
- Do not block all publishing unnecessarily; warnings should be helpful.

### Acceptance criteria

- [ ] Posts and pages have SEO title and description fields.
- [ ] Projects and other major public content types have SEO/social metadata where appropriate.
- [ ] Admin displays a search-result-style preview.
- [ ] Admin displays a social-card-style preview.
- [ ] Missing SEO description creates a warning or content quality task.
- [ ] Missing social image uses a documented fallback.
- [ ] Metadata length guidance is shown.
- [ ] Canonical URL is visible or derivable.
- [ ] Social images are served through approved media delivery.
- [ ] Structured data uses the same canonical/public data.
- [ ] Tests cover metadata fallback behavior.

---

## GDW-039 — Implement native contact form and admin inbox

**Phase:** 6 — Communication  
**Dependencies:** GDW-009, GDW-016, GDW-023, GDW-026  
**Recommended order:** 39  
**Type:** Contact / privacy / security

### Purpose

Add a privacy-conscious contact form that stores messages in the CMS, sends email notifications, and protects against spam.

### Execution notes for Codex

- Use SES for email notifications if native form is implemented.
- Store contact messages in PostgreSQL.
- Add spam protection.
- Avoid storing full IP addresses where possible; hash/truncate if needed.
- Keep messages admin-only.

### Acceptance criteria

- [ ] Contact form exists on `/contact` or the accepted route.
- [ ] Contact form includes name, email, subject, message, and sourcePage where appropriate.
- [ ] Form has accessible labels and validation messages.
- [ ] Server-side validation is enforced.
- [ ] Spam protection exists, such as honeypot, rate limiting, CAPTCHA alternative, or accepted lightweight control.
- [ ] Contact messages are stored in `contact_messages` or equivalent.
- [ ] Stored fields avoid full IP address where possible; if abuse data is stored, it is hashed/truncated and documented.
- [ ] Email notification is sent through SES or accepted provider.
- [ ] Email notification does not expose secrets.
- [ ] Contact messages are admin-only.
- [ ] Admin inbox supports status such as new, read, replied, archived, or spam.
- [ ] George can add private notes to a contact message.
- [ ] Public users receive a safe success/error response.
- [ ] Error responses do not leak implementation details.
- [ ] Tests cover validation, spam rejection, successful submission, and admin-only access.
- [ ] Privacy notice is present or linked near the form.

---

## GDW-040 — Implement Bookshelf, book notes, and reading-now features

**Phase:** 6 — Personal hub features  
**Dependencies:** GDW-019, GDW-021, GDW-024, GDW-025  
**Recommended order:** 40  
**Type:** CMS / frontend

### Purpose

Add a public reading log/bookshelf and admin-managed book notes that make the site feel personal and alive.

### Execution notes for Codex

- Add Books collection.
- Add Book Notes if separate notes are useful.
- Add public `/bookshelf` route.
- Add reading-now support for homepage/Now page widgets.
- ISBN lookup automation is a later separate ticket.

### Acceptance criteria

- [ ] Books collection supports title, author, ISBN, coverImage, status, rating, dateStarted, dateFinished, notes, relatedPosts, externalUrl, visibility, and sortOrder.
- [ ] Book notes are supported either as fields or a separate related collection.
- [ ] Reading statuses are defined, such as reading, finished, paused, want-to-read, reference, or equivalent.
- [ ] Public bookshelf route exists at `/bookshelf`.
- [ ] Public bookshelf shows only public books/notes.
- [ ] Public bookshelf supports useful sorting or grouping.
- [ ] Book covers use the media library and require alt text or appropriate accessible handling.
- [ ] Books can link to related posts.
- [ ] Now page or homepage can display currently reading items.
- [ ] Admin dashboard includes “Add book note” or equivalent.
- [ ] Tests cover public visibility filtering for books.
- [ ] Empty bookshelf state is polished.

---

## GDW-041 — Implement visual timeline

**Phase:** 6 — Personal hub features  
**Dependencies:** GDW-019, GDW-021, GDW-024, GDW-025  
**Recommended order:** 41  
**Type:** CMS / frontend

### Purpose

Create a distinctive visual timeline for career milestones, projects, writing milestones, education, personal interests, and site updates.

### Execution notes for Codex

- Add Timeline Entries collection.
- Add public `/timeline` route.
- Support type/category, date, image, links, and relations.
- Keep the visual design accessible and not dependent on heavy animation.

### Acceptance criteria

- [ ] Timeline entries support title, date, type, summary, body, image, links, relatedPosts, relatedProjects, visibility, and sortOrder.
- [ ] Timeline type/category values are defined.
- [ ] Public timeline route exists at `/timeline`.
- [ ] Public timeline shows only public entries.
- [ ] Timeline is readable on mobile and desktop.
- [ ] Timeline can be navigated by keyboard.
- [ ] Timeline does not rely on inaccessible hover-only interactions.
- [ ] Images use media library and alt text rules.
- [ ] Timeline entries can relate to projects and posts.
- [ ] Admin dashboard includes “Add timeline entry” or equivalent.
- [ ] Tests cover public visibility filtering for timeline entries.
- [ ] Empty timeline state is polished.

---

## GDW-042 — Add advanced homepage sections, colophon, beautiful 404, and visual polish

**Phase:** 6 — Public site polish  
**Dependencies:** GDW-026, GDW-040, GDW-041  
**Recommended order:** 42  
**Type:** Frontend / design

### Purpose

Make the public site feel polished, complete, personal, and memorable.

### Execution notes for Codex

- Add advanced homepage sections pulling from public content modules.
- Add `/colophon` route.
- Add thoughtful 404 page.
- Improve cards, mobile polish, print-friendly articles, consistent icons, and link treatments.
- Keep the Pacific Northwest feel subtle and calm.

### Acceptance criteria

- [ ] Homepage includes thoughtful sections for writing, projects, Now, links, and optionally bookshelf/timeline when content exists.
- [ ] Homepage sections are manageable through CMS settings or structured content where practical.
- [ ] Homepage has polished empty/fallback states.
- [ ] `/colophon` route exists.
- [ ] Colophon explains tools, design choices, privacy/analytics posture, and content ownership where appropriate.
- [ ] Custom 404 page exists.
- [ ] 404 page is helpful, calm, and links users back to useful routes.
- [ ] Article pages have print-friendly styling.
- [ ] Cards have consistent visual treatment.
- [ ] Icons and external links are styled consistently.
- [ ] Mobile experience is polished.
- [ ] Dark mode/palette remains accessible.
- [ ] Visual polish does not add heavy JavaScript unnecessarily.
- [ ] Accessibility checks continue to pass.

---

## GDW-043 — Implement optional Notes, Start Here, Resources, and Uses sections

**Phase:** 6 — Extended content  
**Dependencies:** GDW-019, GDW-020, GDW-024, GDW-025  
**Recommended order:** 43  
**Type:** CMS / frontend

### Purpose

Prepare the optional future content areas mentioned in the requirements without forcing them into MVP.

### Execution notes for Codex

- Add only the sections George wants active.
- Use Pages if a dedicated collection is unnecessary.
- Use structured collections for resources/uses if they benefit from filtering or repeated entries.
- Hide routes from nav until enabled.

### Acceptance criteria

- [ ] `/notes` is implemented or explicitly deferred in docs.
- [ ] `/start-here` is implemented or explicitly deferred in docs.
- [ ] `/resources` is implemented or explicitly deferred in docs.
- [ ] `/uses` is implemented or explicitly deferred in docs.
- [ ] Implemented sections are CMS-editable.
- [ ] Implemented sections support draft/public visibility controls.
- [ ] Hidden/deferred sections do not appear in navigation.
- [ ] Public routes do not expose private drafts.
- [ ] Sitemap includes only enabled public routes.
- [ ] Tests cover enabled/disabled route behavior where practical.

---

## GDW-044 — Implement newsletter signup, issues, sends, email events, and multiple RSS feeds

**Phase:** 7 — Growth features  
**Dependencies:** GDW-009, GDW-016, GDW-020, GDW-027  
**Recommended order:** 44  
**Type:** Newsletter / email / privacy

### Purpose

Support newsletter functionality while preserving privacy and avoiding unnecessary complexity.

### Execution notes for Codex

- Decide whether MVP newsletter uses native system or external provider; document with ADR if external.
- If native, implement subscribers, newsletter issues, sends, email events, confirmation, and unsubscribe.
- Use SES if native email sending is implemented.
- Add multiple RSS feeds if useful, such as all writing, notes, or newsletter feed.

### Acceptance criteria

- [ ] Newsletter approach is documented: native or external initially.
- [ ] If external, integration points and migration path are documented.
- [ ] If native, subscribers collection/table exists.
- [ ] If native, newsletter issues collection/table exists.
- [ ] If native, newsletter sends and email events are tracked.
- [ ] If native, signup uses double opt-in or accepted confirmation flow.
- [ ] If native, unsubscribe links are supported.
- [ ] If native, subscriber data is admin-only.
- [ ] If native, email sending uses SES or accepted provider.
- [ ] If native, bounce/error handling is documented or implemented.
- [ ] Public signup form has accessible labels and validation.
- [ ] Spam/abuse controls exist for signup.
- [ ] Multiple RSS feeds are implemented where useful or explicitly deferred.
- [ ] RSS feeds include only public published content.
- [ ] Privacy notice explains newsletter data use.
- [ ] Tests cover signup validation and unsubscribe behavior where native.

---

## GDW-045 — Implement GitHub project sync background job

**Phase:** 7 — Automation  
**Dependencies:** GDW-009, GDW-016, GDW-022  
**Recommended order:** 45  
**Type:** Background jobs / CMS

### Purpose

Use GitHub data to suggest project updates while keeping the public Projects page curated by George.

### Execution notes for Codex

- Add `github_repos` and `github_sync_runs` data models.
- Use scheduled job or manual admin-triggered sync.
- Do not automatically publish every repository.
- Make sync failures non-blocking for the public site.

### Acceptance criteria

- [ ] GitHub sync configuration is stored securely.
- [ ] GitHub API token, if required, is stored in Secrets Manager or local `.env.local`, not committed.
- [ ] Sync job can run manually or on schedule.
- [ ] Sync stores repository metadata in `github_repos` or equivalent.
- [ ] Sync run history is stored in `github_sync_runs` or equivalent.
- [ ] Admin can review synced repositories.
- [ ] Admin can choose whether a repository should become or update a public project.
- [ ] Repositories are not automatically published without review.
- [ ] Sync failure is logged and visible in admin/operations.
- [ ] Sync failure does not break public site builds.
- [ ] Rate limiting and API errors are handled safely.
- [ ] Tests mock GitHub API responses.

---

## GDW-046 — Implement Bookshelf ISBN lookup helper

**Phase:** 7 — Automation  
**Dependencies:** GDW-009, GDW-016, GDW-040  
**Recommended order:** 46  
**Type:** Background jobs / CMS helper

### Purpose

Let George enter an ISBN and receive editable book metadata suggestions.

### Execution notes for Codex

- Implement ISBN lookup as an admin helper, not a public runtime dependency.
- Store or cache cover images in S3 where appropriate.
- Make fetched metadata editable.
- Failed lookups should create admin tasks, not public errors.

### Acceptance criteria

- [ ] Admin can enter an ISBN for a book record.
- [ ] Lookup job fetches title, author, cover, and metadata where available.
- [ ] Lookup result creates or updates a draft/editable book entry.
- [ ] George can edit all fetched metadata.
- [ ] User notes remain primary and are not overwritten unexpectedly.
- [ ] Cover image is stored or cached through the media system where appropriate.
- [ ] Failed lookup creates a clear admin message/task.
- [ ] Failed lookup does not break public pages.
- [ ] External API keys, if any, are stored securely.
- [ ] Rate limiting and timeout behavior are handled.
- [ ] Tests mock ISBN lookup responses and failures.

---

## GDW-047 — Implement Webmentions / IndieWeb moderation workflow

**Phase:** 7 — IndieWeb  
**Dependencies:** GDW-009, GDW-016, GDW-020, GDW-023  
**Recommended order:** 47  
**Type:** Webmentions / moderation / security

### Purpose

Support moderated Webmentions so public writing can receive approved mentions without opening spam holes.

### Execution notes for Codex

- Add incoming Webmention endpoint.
- Validate source URLs.
- Store mentions in a moderation queue.
- Show only approved mentions on public post pages.
- Add spam/rate-limit protections.

### Acceptance criteria

- [ ] Webmention endpoint exists if feature is enabled.
- [ ] Webmention data model exists.
- [ ] Incoming mentions validate source and target URLs where practical.
- [ ] Invalid mentions are rejected safely.
- [ ] Mentions enter moderation queue by default.
- [ ] Admin can approve, reject, or mark mentions as spam.
- [ ] Only approved mentions appear publicly.
- [ ] Public mentions are sanitized before rendering.
- [ ] Spam/rate-limit protection exists.
- [ ] Webmention processing failures are logged and do not break public pages.
- [ ] Tests cover valid, invalid, rejected, and approved mention flows.
- [ ] Privacy/spam posture is documented.

---

## GDW-048 — Implement privacy-friendly analytics dashboard

**Phase:** 7 — Analytics  
**Dependencies:** GDW-016, GDW-023, GDW-025  
**Recommended order:** 48  
**Type:** Analytics / privacy / admin

### Purpose

Give George useful site insight without creepy tracking or unnecessary personal data collection.

### Execution notes for Codex

- Decide native analytics or privacy-friendly external provider; document if external.
- If native, store minimal events and aggregate daily stats.
- Avoid full IP storage, cross-site tracking, ad IDs, or user profiling.
- Admin dashboard should show content-focused insights.

### Acceptance criteria

- [ ] Analytics approach is documented.
- [ ] If native, analytics_events collection/table exists.
- [ ] If native, daily_page_stats or equivalent aggregate exists.
- [ ] If native, tracked data is limited to path, referrer domain, device type, approximate region if needed, and timestamp bucket where practical.
- [ ] Full IP addresses are not stored unless explicitly justified and documented.
- [ ] No ad IDs or cross-site tracking identifiers are used.
- [ ] Analytics does not expose individual user profiles.
- [ ] Public pages include privacy notice or colophon explanation where appropriate.
- [ ] Admin dashboard shows most read posts, popular projects, outbound link popularity, stale pages, search queries if available, and writing cadence where practical.
- [ ] Analytics data is admin-only.
- [ ] Analytics failure does not affect public page rendering.
- [ ] Tests cover that analytics endpoints do not expose private data.

---

## GDW-049 — Implement content calendar, admin writing stats, and public changelog

**Phase:** 7 — Admin insights  
**Dependencies:** GDW-020, GDW-023, GDW-035, GDW-037  
**Recommended order:** 49  
**Type:** CMS / admin UX

### Purpose

Help George maintain the website over time by showing writing cadence, upcoming work, content planning, and site change history.

### Execution notes for Codex

- Add content calendar items or derive calendar from scheduled/draft content.
- Add writing statistics to admin.
- Add public changelog if George wants to show site evolution.
- Keep admin insights useful, not overwhelming.

### Acceptance criteria

- [ ] Content calendar exists as a collection or derived admin view.
- [ ] Calendar shows scheduled posts.
- [ ] Calendar shows draft target dates where supported.
- [ ] Admin writing stats show recent publishing cadence.
- [ ] Admin writing stats show drafts in progress.
- [ ] Admin writing stats show stale drafts or stale Now page where practical.
- [ ] Public changelog route or section exists if enabled.
- [ ] Changelog entries are CMS-managed or generated from approved release notes.
- [ ] Changelog shows only public-safe information.
- [ ] Admin dashboard links to calendar and stats.
- [ ] Tests cover public/private changelog visibility.

---

## GDW-050 — Perform security threat model and hardening pass

**Phase:** 8 — Security hardening  
**Dependencies:** GDW-015, GDW-018, GDW-025, GDW-039, GDW-044, GDW-047, GDW-048 as applicable  
**Recommended order:** 50  
**Type:** Security review

### Purpose

Review the complete system for realistic threats before production launch or after major feature additions.

### Execution notes for Codex

- Create a threat model document.
- Review public site, CMS, API, database, S3, CI/CD, GitHub, AWS IAM, contact form, newsletter, analytics, Webmentions, and import tools.
- Fix high-risk issues before launch.
- Document accepted risks.

### Acceptance criteria

- [ ] Threat model exists in `docs/security/` or equivalent.
- [ ] Threat model identifies assets: admin account, database, media, secrets, source code, deployments, subscriber data, contact messages, analytics, imported content, and public reputation.
- [ ] Threat model identifies likely attackers and failure modes.
- [ ] Threat model reviews authentication and authorization.
- [ ] Threat model reviews draft/private content leakage risk.
- [ ] Threat model reviews SQL/database access risk.
- [ ] Threat model reviews S3/media exposure risk.
- [ ] Threat model reviews GitHub Actions/OIDC/IAM risk.
- [ ] Threat model reviews dependency/supply-chain risk.
- [ ] Threat model reviews XSS/rich text rendering risk.
- [ ] Threat model reviews CSRF/session risks.
- [ ] Threat model reviews contact form spam/privacy risk.
- [ ] Threat model reviews newsletter unsubscribe/confirmation risks where applicable.
- [ ] Threat model reviews Webmention spam/rendering risks where applicable.
- [ ] High-risk findings have remediation tickets or fixes.
- [ ] No known critical/high dependency vulnerabilities remain unaddressed without documented acceptance.
- [ ] Security headers are configured where applicable.
- [ ] Admin routes are not indexed.
- [ ] Public site does not expose admin API secrets or private content.
- [ ] README/security docs include incident response basics.

---

## GDW-051 — Complete launch readiness and production cutover

**Phase:** 8 — Launch  
**Dependencies:** GDW-011, GDW-015, GDW-016, GDW-026, GDW-027, GDW-028, GDW-029, GDW-050  
**Recommended order:** 51  
**Type:** Launch / operations

### Purpose

Launch production carefully with backups, rollback, smoke tests, DNS, HTTPS, and final human verification.

### Execution notes for Codex

- Create launch checklist.
- Verify domain and HTTPS.
- Verify production CMS access.
- Verify production database backups.
- Verify public site smoke tests.
- Verify rollback path.

### Acceptance criteria

- [ ] Launch checklist exists.
- [ ] Production custom domain resolves correctly.
- [ ] `www` domain behavior is correct.
- [ ] HTTPS certificate is valid.
- [ ] Production CMS admin URL is reachable and protected.
- [ ] Production database backups are enabled and verified.
- [ ] Production S3 media bucket versioning is enabled.
- [ ] Production secrets are present in Secrets Manager/GitHub Environment as appropriate.
- [ ] Production deploy runs from `main` only.
- [ ] Production deployment uses protected approval where configured.
- [ ] Public homepage smoke test passes.
- [ ] Writing page smoke test passes.
- [ ] Now/projects/links/contact smoke tests pass.
- [ ] RSS and sitemap are accessible.
- [ ] Robots.txt is accessible.
- [ ] Admin login smoke test passes where safe.
- [ ] Rollback process is documented.
- [ ] DNS cutover steps are documented.
- [ ] George manually verifies the production site before considering launch complete.

---

## GDW-052 — Add post-launch maintenance automation and recurring checks

**Phase:** 8 — Maintenance  
**Dependencies:** GDW-016, GDW-037, GDW-050, GDW-051  
**Recommended order:** 52  
**Type:** Operations / maintenance

### Purpose

Keep the site healthy after launch with dependency updates, backup verification, link checks, content checks, and security review cadence.

### Execution notes for Codex

- Add recurring workflows where useful.
- Keep alerts actionable and low-noise.
- Document maintenance routines George can follow.
- Ensure maintenance does not bypass PR review.

### Acceptance criteria

- [ ] Dependabot or equivalent continues to open dependency update PRs.
- [ ] Dependency update PRs run full CI.
- [ ] Security update process is documented.
- [ ] Backup restore drill cadence is documented.
- [ ] Broken link checker schedule is configured or documented.
- [ ] Content quality check schedule is configured or documented.
- [ ] Accessibility review cadence is documented.
- [ ] Performance review cadence is documented.
- [ ] Secret rotation process is documented.
- [ ] Production incident checklist exists.
- [ ] Maintenance tasks do not deploy directly to production without PR/approval.
- [ ] README points to maintenance runbooks.

---

# 6. Implementation guidance for Codex

## 6.1 Keep PRs small and reviewable

Codex should not try to complete multiple major tickets in one enormous PR unless George explicitly asks. A good PR should usually map to one ticket or one coherent slice of a ticket.

## 6.2 Do not build public features before the data rules exist

Public routes must not be built in a way that casually fetches all CMS content. The public data layer and visibility filtering must be in place before public feature work expands.

## 6.3 Do not treat security as a final cosmetic pass

Security tickets exist separately, but every ticket has security implications. Codex must apply the global security definition of done throughout the project.

## 6.4 Prefer documentation over hidden assumptions

Whenever Codex makes a choice that affects architecture, deployment, backup, authentication, content model, or data privacy, it should document that choice in the same PR.

## 6.5 Preserve the central product principle

The public website is important, but the admin experience is a core product requirement. If the CMS is unpleasant to use, too technical, or requires normal content edits in Git, the implementation has missed the point.
