# CMS hosting runbook

The CMS runs as a Lambda container behind CloudFront (see `docs/adr/2026-06-12-cms-lambda-hosting.md`), not ECS Fargate, to honour the scale-to-zero cost rules in `cost-controls.md`.

## URLs

- Dev: `https://cms-dev.georgedallas.com` (CloudFront alias in the existing `georgedallas.com` Route 53 zone)
- Prod: `https://cms.georgedallas.com` (defined, deployed at launch prep)

## Architecture

```text
Browser / site build
  ↓ HTTPS
CloudFront (cms-dev.georgedallas.com, caching disabled, ACM cert in us-east-1)
  ↓ injects secret x-origin-verify header
Lambda Function URL → Lambda container (Next.js + Payload, Lambda Web Adapter)
  ↓ VPC isolated subnets, CMS security group
Aurora Serverless v2 (scale-to-zero)  +  S3 media bucket (via free gateway endpoint)
```

- The Function URL accepts unsigned requests (OAC signing is incompatible with browser POST bodies), but CMS middleware rejects any request that does not carry the CloudFront-injected `x-origin-verify` header, so the Lambda effectively only serves CloudFront traffic. The header value lives in Secrets Manager (`/georgedallaswebsite/<env>/origin-verify`); rotating it means updating the secret and redeploying the CMS stack. `/api/health` is exempt because the Lambda Web Adapter probes it from inside the container.
- The Lambda uses the `georgedallaswebsite-<env>-cms-runtime` role (secrets read, media prefixes, VPC execution).
- Secrets (database password, Payload secret, session secret) are injected as environment variables through CloudFormation dynamic references — resolved at deploy time, never stored in templates or the repo.
- Logs go to CloudWatch (`/aws/lambda/georgedallaswebsite-<env>-cms`, 1-month retention).
- Health check: `GET /api/health` (no database access, also used as the container readiness probe).

## Cold starts

After idle, the first request pays a Lambda cold start (~5–15s) and possibly an Aurora resume (~15s). The deploy smoke test and any API clients should allow ~60s on the first request. Do not add keep-warm pings — they defeat scale-to-zero.

## Database migrations

Migrations are committed under `apps/cms/src/migrations/` and run automatically on Lambda startup via Payload `prodMigrations`. To create a new migration after changing collections, run it in a Linux container (the Payload CLI migration generator is broken on Windows):

```bash
docker compose up -d postgres
docker run --rm --network georgedallaswebsite_default \
  -v "$(pwd):/repo" -v gdw-mig-root-nm:/repo/node_modules \
  -v gdw-mig-cms-nm:/repo/apps/cms/node_modules \
  -v gdw-mig-shared-nm:/repo/packages/shared/node_modules \
  -v gdw-mig-infra-nm:/repo/infra/node_modules \
  -w /repo --env-file <local placeholder env> \
  public.ecr.aws/docker/library/node:22-bookworm-slim \
  bash -c "corepack enable && pnpm install --frozen-lockfile --filter '@georgedallas/cms...' && pnpm --filter @georgedallas/cms payload migrate:create <name>"
```

Review generated migrations in the PR like any other code. Destructive migrations need backup and rollback notes per `database-backup-restore.md`.

## Deployment

Merge to `develop` triggers `.github/workflows/deploy-dev.yml`:

1. GitHub OIDC assumes `georgedallaswebsite-dev-github-deploy` (no long-lived keys).
2. `cdk deploy dev-foundation dev-cms-cert dev-cms` builds the container image, pushes it to the CDK assets ECR repository, and updates the stacks.
3. A smoke test polls `https://cms-dev.georgedallas.com/api/health` with retries to absorb the cold start.

CloudFormation rolls back automatically on failure, leaving the previous Lambda version serving. Production deployment lands with GDW-015 and uses the protected `production` GitHub environment.

## Upload size limit

Lambda Function URLs cap request bodies at 6 MB, so deployed media uploads are effectively limited to ~6 MB (the app-level cap is 10 MB and still applies locally). Enable the storage plugin's presigned client uploads in a future ticket if larger files are needed.
