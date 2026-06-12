# Infrastructure

Infrastructure is managed with AWS CDK, as accepted in `../docs/adr/2026-06-11-infrastructure-as-code.md`.

## Environments

The CDK app represents two isolated environments:

- `dev`
- `prod`

Each stack name and resource name includes the project identifier and environment. Standard tags are applied to every stack:

- `project=georgedallaswebsite`
- `environment=<dev|prod>`
- `owner=George Dallas`
- `managed-by=aws-cdk`

## Commands

Install dependencies from the repository root:

```bash
pnpm install
```

Validate infrastructure synthesis:

```bash
pnpm --filter @georgedallas/infra synth
```

List configured stacks:

```bash
pnpm --filter @georgedallas/infra list
```

## Review Rules

No AWS credentials are required to synthesize these foundation stacks.

Do not commit AWS credentials, generated state, `.env.local`, or CDK output. Destructive infrastructure changes must be called out in the pull request with the affected resources, backup/recovery notes, and rollback path.

Security roles, OIDC assumptions, KMS keys, and Secrets Manager placeholders are documented in `../docs/runbooks/infra-security.md`.

Database networking, security groups, and RDS PostgreSQL resources are documented in `../docs/runbooks/database-infrastructure.md`.

Media buckets and CloudFront delivery are documented in `../docs/runbooks/media-storage.md`.
