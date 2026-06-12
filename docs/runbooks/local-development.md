# Local Development Runbook

## Services

Use Docker Compose for local-only services:

```bash
pnpm local:up
```

This starts PostgreSQL on `localhost:5432` and MinIO on `localhost:9000` with non-sensitive local credentials from `.env.example`.

## Reset

```bash
pnpm local:reset
```

This deletes local Docker volumes and recreates the local services. Do not point local configuration at development or production databases.

## Seed

```bash
pnpm seed
```

The current seed command writes a safe placeholder marker. Real CMS seed content belongs in later CMS tickets.
