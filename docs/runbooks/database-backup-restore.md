# Database Backup and Restore Runbook

This runbook covers PostgreSQL backup, restore, and migration safety for the AWS environments.

## Backup Policy

Production:

- automated Aurora backups enabled (continuous, supports point-in-time recovery)
- 30-day backup retention
- deletion protection enabled
- snapshot policy on database deletion or replacement

Development:

- automated Aurora backups enabled
- 7-day backup retention
- development restores must never overwrite production

Aurora backups continue while the cluster is auto-paused; scale-to-zero does not reduce backup coverage.

## Before Risky Migrations

Before a destructive or hard-to-reverse production migration:

1. Confirm the current production DB is healthy.
2. Confirm an automated backup exists inside the retention window.
3. Create or verify a fresh manual snapshot.
4. Record the snapshot identifier in the PR or deployment notes.
5. Confirm the rollback path and expected data-loss window.

Do not run destructive migrations without explicit review notes.

## Point-in-Time Restore

Use an Aurora point-in-time restore to create a new cluster. Never restore over production.

Expected process:

1. Choose a restore timestamp before the incident or migration.
2. Restore into a temporary isolated cluster with a clear name such as `georgedallaswebsite-prod-restore-YYYYMMDD`.
3. Keep the restored cluster private.
4. Attach only reviewed security groups.
5. Validate the restored data before any cutover.

## Snapshot Restore

Use a manual or final snapshot when point-in-time restore is not the right recovery path.

Expected process:

1. Restore the snapshot into a new temporary DB cluster.
2. Keep it isolated from production traffic.
3. Compare key CMS records, users, posts, media references, redirects, and settings.
4. Export or migrate only the data needed for recovery.
5. Delete temporary restore resources after review.

## Restore Verification

A restore is not considered verified until:

- the CMS can connect to the restored database from a safe test target
- expected recent posts/pages/settings exist
- private/admin-only records remain private
- database extensions and migrations are compatible
- no production endpoint points at the restore target by accident

## Restore Drill

Run a restore drill at least quarterly after production launch.

The drill should restore production from backup into a non-production target, verify CMS startup against the restored database, document the elapsed restore time, and delete temporary resources afterward.
