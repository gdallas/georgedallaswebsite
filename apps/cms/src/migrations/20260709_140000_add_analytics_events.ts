import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Privacy-friendly analytics events (GDW-048): one row per page view from the
// first-party beacon. Minimal columns — path, referrer domain, coarse device
// type, optional search query, timestamp. No IP, no cookies, no identifiers.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "analytics_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"path" varchar NOT NULL,
  	"referrer_domain" varchar,
  	"device_type" varchar,
  	"query" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "analytics_events_id" integer;
  CREATE INDEX IF NOT EXISTS "analytics_events_path_idx" ON "analytics_events" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "analytics_events_updated_at_idx" ON "analytics_events" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "analytics_events_created_at_idx" ON "analytics_events" USING btree ("created_at");
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_analytics_events_fk" FOREIGN KEY ("analytics_events_id") REFERENCES "public"."analytics_events"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_analytics_events_id_idx" ON "payload_locked_documents_rels" USING btree ("analytics_events_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_analytics_events_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_analytics_events_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "analytics_events_id";
  DROP TABLE IF EXISTS "analytics_events" CASCADE;`)
}
