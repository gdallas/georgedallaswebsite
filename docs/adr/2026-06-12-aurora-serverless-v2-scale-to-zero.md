# ADR: Aurora Serverless v2 with Scale-to-Zero PostgreSQL Hosting

## Status

Accepted — supersedes `2026-06-11-postgresql-hosting.md`

## Context

George set a hard cost target for this website: total AWS spend should stay under USD $10/month. The site is low traffic, the public site is static-first, and the database is only active while editing content in the CMS or running builds and imports. The dev database does not need to run continuously.

The previously accepted RDS PostgreSQL `t4g.micro` instance costs roughly $13–15/month per environment plus ~$2.60/month for its 20 GB minimum storage, before any other resources. A single always-on environment would exceed the entire monthly budget.

## Decision

Use Aurora PostgreSQL Serverless v2 with scale-to-zero for both dev and prod databases:

- `serverlessV2MinCapacity: 0` with a 15-minute auto-pause, so compute cost is zero while idle.
- Max capacity 1 ACU for dev and 2 ACU for prod, enough for a single-editor CMS.
- Aurora PostgreSQL 16.6 (0-ACU auto-pause requires 16.3+).
- Storage is billed on actual usage (no 20 GB minimum), encrypted with the environment KMS key.
- All other protections carry over from the superseded ADR: isolated private subnets, no public access, security-group-only ingress from the CMS, generated credentials in Secrets Manager, 30-day production / 7-day dev backup retention, production deletion protection and snapshot-on-removal.

All project resources deploy to `ca-central-1`, matching George's other AWS workloads.

## Consequences

Better: idle database cost drops from ~$15.60/month to roughly $0.10/month (storage only) per environment. Editing a few hours a week costs an estimated $1–2/month in ACU-hours. The whole dev foundation (KMS key, Secrets Manager placeholders, S3, paused Aurora) idles around $4/month.

Worse: the first connection after an auto-pause takes roughly 15 seconds while the cluster resumes. For a single-editor CMS this is an acceptable login-time delay; it never affects the static public site. The CMS hosting ticket (GDW-013) must use a connection approach that tolerates resume latency, and deployment smoke tests must allow for the wake-up on first query.

The Aurora ACU rate is higher per compute-hour than an equivalent always-on `t4g.micro`, so if the site ever needs a continuously busy database, a future ADR should revisit provisioned instances.

## Alternatives Considered

- RDS `t4g.micro` always-on (the superseded decision): simplest, but ~$15.60/month per environment exceeds the total budget on its own.
- RDS instance with manual or scheduled stop/start: stopped instances still bill the 20 GB storage minimum (~$2.60/month), auto-restart after 7 days, and need start/stop orchestration before every editing session.
- External managed PostgreSQL (Neon, Supabase free tiers): cheaper still, but leaves the AWS-centered architecture and adds a third-party dependency; rejected without stronger cause.
