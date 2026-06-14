import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// GDW-032: review-queue fields layered onto the GDW-031 import collections.
// Hand-written (Payload's migrate:create is Linux/Docker-only in this repo) to
// match the column names/types Payload generates from the collection configs:
//   imported-items.reviewStatus (select) -> review_status enum, default pending
//   imported-items.reviewNotes  (textarea) -> review_notes varchar
//   import-issues.notes         (textarea) -> notes varchar
//   import-issues.resolvedAt    (date)     -> resolved_at timestamptz
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_imported_items_review_status" AS ENUM('pending', 'in_review', 'approved');
  ALTER TABLE "imported_items" ADD COLUMN "review_status" "enum_imported_items_review_status" DEFAULT 'pending' NOT NULL;
  ALTER TABLE "imported_items" ADD COLUMN "review_notes" varchar;
  ALTER TABLE "import_issues" ADD COLUMN "notes" varchar;
  ALTER TABLE "import_issues" ADD COLUMN "resolved_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "imported_items" DROP COLUMN "review_status";
  ALTER TABLE "imported_items" DROP COLUMN "review_notes";
  ALTER TABLE "import_issues" DROP COLUMN "notes";
  ALTER TABLE "import_issues" DROP COLUMN "resolved_at";
  DROP TYPE "public"."enum_imported_items_review_status";`)
}
