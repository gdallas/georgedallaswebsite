# ADR: Infrastructure as Code Tool

## Status

Accepted

## Context

The project rules require infrastructure to be defined as code, with separate development and production environments and a documented choice between AWS CDK and Terraform.

The repository is already a TypeScript and pnpm workspace. The infrastructure will target AWS resources including ECS Fargate, PostgreSQL, S3, CloudFront, Secrets Manager, EventBridge, Lambda, SQS, SES, IAM, and monitoring.

## Decision

Use AWS CDK for infrastructure as code.

The initial CDK project will live in `infra/` and define separate `dev` and `prod` stacks from shared configuration. Resource names must include the project identifier and environment. Standard tags must include `project`, `environment`, `owner`, and `managed-by`.

CDK synth must run locally without production secrets. Destructive infrastructure changes require explicit PR notes before apply/deploy.

## Consequences

CDK keeps infrastructure in the same language family as the rest of the monorepo and allows reusable constructs to grow alongside application code.

Terraform should not be introduced unless a later ADR explains why mixing or replacing tools is worth the operational cost.

## Alternatives Considered

- Terraform was considered because it is widely used and has strong planning workflows. It was not chosen because the project is already TypeScript-oriented and CDK is a simpler fit for this repo.
- Hand-managed AWS resources were rejected because dev/prod separation, reviewability, and recovery requirements need repeatable infrastructure.
