# ADR: Default Architecture

## Status

Accepted

## Context

The George Dallas website is intended to be a static-first public website backed by a private, database-powered CMS. The initial implementation needs stable defaults before application code, infrastructure, or deployment workflows are introduced.

The repository ruleset and backlog define the target architecture and require pull request review before changes are merged. The database architecture addendum is present in `docs/`. The original requirements PDF is still expected but is not currently present in this checkout.

## Decision

Use the default architecture already established by `README.md` and `CODEX_RULESET.md`:

- Astro for the static-first public website.
- Payload CMS for the private admin/backend.
- PostgreSQL as the primary database.
- S3 for media storage.
- ECS Fargate for CMS/backend hosting.
- AWS Amplify Hosting as the first choice for the public frontend, with S3 and CloudFront acceptable if intentionally chosen later.
- GitHub Actions for CI/CD.
- AWS CDK for infrastructure as code, as accepted in `docs/adr/2026-06-11-infrastructure-as-code.md`.

The public site must render only public, published content. Drafts, private notes, import queues, contact messages, subscribers, analytics, and admin-only data must not be included in public builds.

Normal content editing should happen through the CMS and must not require manual file edits or Git changes.

All implementation work must go through feature branches, pull requests, passing checks, and George's manual approval before merge.

## Consequences

These defaults let the project begin with a clear static/dynamic split and reduce the risk of early application code contradicting the intended architecture.

The missing requirements PDF remains a blocker for fully satisfying `GDW-001`; it should be added before broad product implementation work proceeds beyond the foundation tickets.

## Alternatives considered

- A fully static site with file-based content was rejected because normal content updates should not require manual file edits.
- A fully dynamic public site was rejected because the public experience should be fast, SEO-friendly, and static-first.
- A non-PostgreSQL primary database was rejected because the ruleset standardizes on PostgreSQL.
