import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Adds the now-entries archive (George, 2026-07-09): snapshots of the Now page
// captured when a changed Now is published, powering the public /now history.
// No relationships or arrays, so only the base table + the locked-documents rel.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "now_entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"captured_at" timestamp(3) with time zone NOT NULL,
  	"current_focus" varchar,
  	"work" varchar,
  	"reading" varchar,
  	"listening" varchar,
  	"watching" varchar,
  	"personal" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "now_entries_id" integer;
  CREATE INDEX IF NOT EXISTS "now_entries_captured_at_idx" ON "now_entries" USING btree ("captured_at");
  CREATE INDEX IF NOT EXISTS "now_entries_updated_at_idx" ON "now_entries" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "now_entries_created_at_idx" ON "now_entries" USING btree ("created_at");
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_now_entries_fk" FOREIGN KEY ("now_entries_id") REFERENCES "public"."now_entries"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_now_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("now_entries_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_now_entries_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_now_entries_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "now_entries_id";
  DROP TABLE IF EXISTS "now_entries" CASCADE;`)
}
