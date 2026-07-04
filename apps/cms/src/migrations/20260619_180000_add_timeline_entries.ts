import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_timeline_entries_type" AS ENUM('career', 'project', 'writing', 'education', 'personal', 'site_update');
  CREATE TYPE "public"."enum_timeline_entries_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_timeline_entries_visibility" AS ENUM('public', 'unlisted', 'private');
  CREATE TABLE "timeline_entries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"event_date" timestamp(3) with time zone NOT NULL,
  	"type" "enum_timeline_entries_type" DEFAULT 'personal' NOT NULL,
  	"summary" varchar,
  	"body" jsonb,
  	"image_id" integer,
  	"status" "enum_timeline_entries_status" DEFAULT 'draft' NOT NULL,
  	"sort_order" numeric DEFAULT 0 NOT NULL,
  	"visibility" "enum_timeline_entries_visibility" DEFAULT 'private' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "timeline_entries_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "timeline_entries_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"posts_id" integer,
  	"projects_id" integer
  );
  
  ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "timeline_entries_links" ADD CONSTRAINT "timeline_entries_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."timeline_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "timeline_entries_rels" ADD CONSTRAINT "timeline_entries_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."timeline_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "timeline_entries_rels" ADD CONSTRAINT "timeline_entries_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "timeline_entries_rels" ADD CONSTRAINT "timeline_entries_rels_projects_fk" FOREIGN KEY ("projects_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "timeline_entries_id" integer;
  CREATE INDEX "timeline_entries_event_date_idx" ON "timeline_entries" USING btree ("event_date");
  CREATE INDEX "timeline_entries_image_idx" ON "timeline_entries" USING btree ("image_id");
  CREATE INDEX "timeline_entries_updated_at_idx" ON "timeline_entries" USING btree ("updated_at");
  CREATE INDEX "timeline_entries_created_at_idx" ON "timeline_entries" USING btree ("created_at");
  CREATE INDEX "timeline_entries_links_order_idx" ON "timeline_entries_links" USING btree ("_order");
  CREATE INDEX "timeline_entries_links_parent_id_idx" ON "timeline_entries_links" USING btree ("_parent_id");
  CREATE INDEX "timeline_entries_rels_order_idx" ON "timeline_entries_rels" USING btree ("order");
  CREATE INDEX "timeline_entries_rels_parent_idx" ON "timeline_entries_rels" USING btree ("parent_id");
  CREATE INDEX "timeline_entries_rels_path_idx" ON "timeline_entries_rels" USING btree ("path");
  CREATE INDEX "timeline_entries_rels_posts_id_idx" ON "timeline_entries_rels" USING btree ("posts_id");
  CREATE INDEX "timeline_entries_rels_projects_id_idx" ON "timeline_entries_rels" USING btree ("projects_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_timeline_entries_fk" FOREIGN KEY ("timeline_entries_id") REFERENCES "public"."timeline_entries"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_timeline_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("timeline_entries_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "timeline_entries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "timeline_entries_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "timeline_entries_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_timeline_entries_fk";
  DROP INDEX "payload_locked_documents_rels_timeline_entries_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "timeline_entries_id";
  DROP TABLE "timeline_entries_links" CASCADE;
  DROP TABLE "timeline_entries_rels" CASCADE;
  DROP TABLE "timeline_entries" CASCADE;
  DROP TYPE "public"."enum_timeline_entries_type";
  DROP TYPE "public"."enum_timeline_entries_status";
  DROP TYPE "public"."enum_timeline_entries_visibility";`)
}
