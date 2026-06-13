# ADR: CMS Hosting on Lambda Container Behind CloudFront

## Status

Accepted — changes the backend hosting model from the ECS Fargate default in `CODEX_RULESET.md`

## Context

GDW-013 hosts the Payload CMS in AWS. The ruleset default is ECS Fargate, but the cost ceiling for the whole site is USD $10/month (`docs/runbooks/cost-controls.md`), and the CMS is only active while George edits content or a site build queries the API:

- ECS Fargate always-on with an Application Load Balancer: ~$26/month (ALB alone is ~$16/month). Far over budget.
- ECS Fargate Spot without an ALB: ~$6.5/month including a public IPv4, but needs dynamic-DNS plumbing for a stable URL, and Spot can interrupt editing sessions.
- AWS App Runner is not available in `ca-central-1`.
- Lambda with a container image scales to zero between requests and costs effectively $0 idle.

## Decision

Package the CMS as a Lambda container image and serve it through CloudFront:

- The Next.js/Payload app builds with `output: "standalone"` and runs in Lambda via the AWS Lambda Web Adapter extension, listening as a normal HTTP server.
- The Lambda runs inside the foundation VPC's isolated subnets using the existing CMS security group, so the database path is unchanged (security-group-to-security-group on 5432).
- An S3 gateway VPC endpoint (free) gives the Lambda access to the media bucket; no NAT gateway and no interface endpoints.
- A Lambda Function URL with IAM auth is the CloudFront origin via Origin Access Control, so the function is only reachable through CloudFront.
- CloudFront serves `cms-dev.georgedallas.com` (dev) and `cms.georgedallas.com` (prod) with an ACM certificate in `us-east-1` and Route 53 alias records in the existing `georgedallas.com` hosted zone.
- Database migrations are committed to the repo and run automatically on Lambda cold start via the Payload `prodMigrations` mechanism; when none are pending this is a single query.
- Deployed secrets reach the function as environment variables resolved at deploy time through CloudFormation dynamic references into Secrets Manager — values never appear in templates or logs.

## Consequences

Better: idle CMS cost is ~$0 (CloudFront and Route 53 records are pennies; the hosted zone already exists). Editing-session compute is cents per month. Total projected site cost stays around $5/month with the dev foundation.

Worse:

- Cold start after idle: roughly 5–15 seconds for the Lambda plus up to ~15 seconds if Aurora is also resuming. Acceptable for a single-editor weekly workflow; the static public site is never affected.
- Lambda Function URLs cap request bodies at 6 MB, so media uploads are effectively limited to ~6 MB in deployed environments even though the app-level limit is 10 MB. If larger uploads are needed, enable the storage plugin's presigned client uploads in a future ticket.
- Secrets live in Lambda environment configuration (encrypted at rest, visible to IAM principals with `lambda:GetFunctionConfiguration`). Acceptable in a single-owner account; revisit if collaborators get AWS access.
- Long-running background jobs cannot live in this Lambda; the jobs runtime role and a queue-based worker remain the plan for import tickets.

## Alternatives considered

- ECS Fargate + ALB (ruleset default): rejected on cost (~$26/month).
- ECS Fargate Spot + EventBridge/Route 53 dynamic DNS: workable (~$6.5/month) but operationally fiddly, still near budget, and Spot interruptions can kill editing sessions.
- App Runner: not available in `ca-central-1`.
- Keeping the CMS local-only and publishing static builds from a laptop: rejected — the ruleset requires a deployed, PR-driven CMS.
