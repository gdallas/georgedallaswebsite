# Database Infrastructure Runbook

PostgreSQL infrastructure is managed with AWS CDK in `infra/`.

## Resources

Each environment has:

- VPC: `georgedallaswebsite-<environment>-vpc`
- CMS service security group: `georgedallaswebsite-<environment>-cms-sg`
- database security group: `georgedallaswebsite-<environment>-database-sg`
- RDS PostgreSQL instance: `georgedallaswebsite-<environment>-postgres`
- database credential secret: `/georgedallaswebsite/<environment>/database-credentials`

## Network Access

The PostgreSQL instance is placed in isolated private subnets and is not publicly accessible.

Only the CMS service security group can connect to PostgreSQL on port `5432`. Future ECS services must use the CMS service security group or a deliberately reviewed replacement.

## Capacity

The initial instance class is `t4g.micro` with 20 GB allocated storage and autoscaling storage. This is sized for a small personal site and can be increased later through reviewed infrastructure changes.

## Protection

Production has deletion protection enabled and uses a snapshot removal policy. Development is easier to recreate and may be destroyed through reviewed changes.

Do not disable production deletion protection without explicit PR notes covering backup status, affected resources, and rollback.

Backup and restore procedures are documented in `database-backup-restore.md`.

## Local Development

Local development continues to use Docker Compose PostgreSQL from `docker-compose.yml`. Local `.env.local` files must not point at the production database.
