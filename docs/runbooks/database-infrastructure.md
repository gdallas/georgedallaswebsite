# Database Infrastructure Runbook

PostgreSQL infrastructure is managed with AWS CDK in `infra/`.

## Resources

Each environment has:

- VPC: `georgedallaswebsite-<environment>-vpc`
- CMS service security group: `georgedallaswebsite-<environment>-cms-sg`
- database security group: `georgedallaswebsite-<environment>-database-sg`
- Aurora PostgreSQL Serverless v2 cluster: `georgedallaswebsite-<environment>-postgres`
- database credential secret: `/georgedallaswebsite/<environment>/database-credentials`

All resources deploy to `ca-central-1`.

## Network Access

The PostgreSQL cluster is placed in isolated private subnets and is not publicly accessible.

Only the CMS service security group can connect to PostgreSQL on port `5432`. Future ECS services must use the CMS service security group or a deliberately reviewed replacement.

## Capacity and Scale-to-Zero

The cluster is Aurora PostgreSQL Serverless v2 with `serverlessV2MinCapacity: 0` and a 15-minute auto-pause (see `docs/adr/2026-06-12-aurora-serverless-v2-scale-to-zero.md`). Compute costs nothing while paused; the first connection after a pause takes roughly 15 seconds while the cluster resumes. Max capacity is 1 ACU for dev and 2 ACU for prod and can be raised later through reviewed infrastructure changes.

Storage is billed on actual usage and encrypted with the environment KMS key.

## Protection

Production has deletion protection enabled and uses a snapshot removal policy. Development is easier to recreate and may be destroyed through reviewed changes.

Do not disable production deletion protection without explicit PR notes covering backup status, affected resources, and rollback.

Backup and restore procedures are documented in `database-backup-restore.md`.

## Local Development

Local development continues to use Docker Compose PostgreSQL from `docker-compose.yml`. Local `.env.local` files must not point at the production database.
