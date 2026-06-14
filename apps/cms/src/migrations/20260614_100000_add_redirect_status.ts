import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// GDW-033: redirect review lifecycle. Adds redirects.status (select) ->
// status enum column. Hand-written to match Payload's generated naming
// (migrate:create is Linux/Docker-only here). Existing rows default to
// 'active'; future WordPress-import proposals are written as 'proposed'.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_redirects_status" AS ENUM('proposed', 'active', 'disabled');
  ALTER TABLE "redirects" ADD COLUMN "status" "enum_redirects_status" DEFAULT 'active' NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "redirects" DROP COLUMN "status";
  DROP TYPE "public"."enum_redirects_status";`)
}
