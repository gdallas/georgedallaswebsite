# ADR: PostgreSQL Hosting

## Status

Accepted

## Context

The project requires PostgreSQL as the source of truth for Payload CMS content, publishing workflow, imports, contact data, newsletter data, analytics summaries, and future admin features.

The ruleset allows Aurora PostgreSQL Serverless v2 as a long-term AWS-native target or RDS PostgreSQL when simpler or cheaper during early buildout.

## Decision

Use Amazon RDS for PostgreSQL for the initial AWS database implementation.

Each environment gets a separate RDS PostgreSQL instance in an isolated database subnet. The database is not publicly accessible. Credentials are generated into AWS Secrets Manager and encrypted with the environment KMS key.

Production uses deletion protection and snapshot removal policy. Automated backups are enabled with a 30-day production retention default and a shorter development retention window.

## Consequences

RDS PostgreSQL is simpler and more cost-conscious for the early personal-site workload. The schema and app layer remain portable to Aurora PostgreSQL Serverless v2 if the workload later justifies the operational change.

Later tickets may increase instance size, add read replicas, or migrate to Aurora through a separate ADR and migration plan.

## Alternatives Considered

- Aurora PostgreSQL Serverless v2 was considered as the long-term AWS-native target. It was deferred because the first implementation benefits from simpler, predictable RDS operations.
- External managed PostgreSQL providers were rejected for now because the target architecture is AWS-centered.
