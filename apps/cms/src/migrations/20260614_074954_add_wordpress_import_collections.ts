import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_import_jobs_status" AS ENUM('running', 'completed', 'failed');
  CREATE TYPE "public"."enum_imported_items_status" AS ENUM('imported', 'skipped', 'failed', 'needs_review');
  CREATE TYPE "public"."enum_import_issues_kind" AS ENUM('unsupported_shortcode', 'broken_embed', 'missing_excerpt', 'duplicate_slug', 'media_missing_alt', 'media_download_failed', 'image_relink_failed', 'other');
  CREATE TYPE "public"."enum_import_issues_severity" AS ENUM('info', 'warning', 'error');
  CREATE TABLE "import_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"source" varchar NOT NULL,
  	"status" "enum_import_jobs_status" DEFAULT 'running' NOT NULL,
  	"started_at" timestamp(3) with time zone,
  	"finished_at" timestamp(3) with time zone,
  	"fetched" numeric DEFAULT 0,
  	"imported" numeric DEFAULT 0,
  	"skipped" numeric DEFAULT 0,
  	"failed" numeric DEFAULT 0,
  	"needs_review" numeric DEFAULT 0,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "imported_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"wordpress_id" varchar NOT NULL,
  	"wordpress_url" varchar,
  	"title" varchar,
  	"status" "enum_imported_items_status" DEFAULT 'imported' NOT NULL,
  	"job_id" integer,
  	"post_id" integer,
  	"media_count" numeric DEFAULT 0,
  	"error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "import_issues" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_import_issues_kind" NOT NULL,
  	"severity" "enum_import_issues_severity" DEFAULT 'warning' NOT NULL,
  	"wordpress_id" varchar,
  	"detail" varchar,
  	"job_id" integer,
  	"imported_item_id" integer,
  	"resolved" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "import_jobs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "imported_items_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "import_issues_id" integer;
  ALTER TABLE "imported_items" ADD CONSTRAINT "imported_items_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "imported_items" ADD CONSTRAINT "imported_items_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_issues" ADD CONSTRAINT "import_issues_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_issues" ADD CONSTRAINT "import_issues_imported_item_id_imported_items_id_fk" FOREIGN KEY ("imported_item_id") REFERENCES "public"."imported_items"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "import_jobs_updated_at_idx" ON "import_jobs" USING btree ("updated_at");
  CREATE INDEX "import_jobs_created_at_idx" ON "import_jobs" USING btree ("created_at");
  CREATE UNIQUE INDEX "imported_items_wordpress_id_idx" ON "imported_items" USING btree ("wordpress_id");
  CREATE INDEX "imported_items_job_idx" ON "imported_items" USING btree ("job_id");
  CREATE INDEX "imported_items_post_idx" ON "imported_items" USING btree ("post_id");
  CREATE INDEX "imported_items_updated_at_idx" ON "imported_items" USING btree ("updated_at");
  CREATE INDEX "imported_items_created_at_idx" ON "imported_items" USING btree ("created_at");
  CREATE INDEX "import_issues_wordpress_id_idx" ON "import_issues" USING btree ("wordpress_id");
  CREATE INDEX "import_issues_job_idx" ON "import_issues" USING btree ("job_id");
  CREATE INDEX "import_issues_imported_item_idx" ON "import_issues" USING btree ("imported_item_id");
  CREATE INDEX "import_issues_updated_at_idx" ON "import_issues" USING btree ("updated_at");
  CREATE INDEX "import_issues_created_at_idx" ON "import_issues" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_jobs_fk" FOREIGN KEY ("import_jobs_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_imported_items_fk" FOREIGN KEY ("imported_items_id") REFERENCES "public"."imported_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_issues_fk" FOREIGN KEY ("import_issues_id") REFERENCES "public"."import_issues"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_import_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("import_jobs_id");
  CREATE INDEX "payload_locked_documents_rels_imported_items_id_idx" ON "payload_locked_documents_rels" USING btree ("imported_items_id");
  CREATE INDEX "payload_locked_documents_rels_import_issues_id_idx" ON "payload_locked_documents_rels" USING btree ("import_issues_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "import_jobs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "imported_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "import_issues" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "import_jobs" CASCADE;
  DROP TABLE "imported_items" CASCADE;
  DROP TABLE "import_issues" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_import_jobs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_imported_items_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_import_issues_fk";
  
  DROP INDEX "payload_locked_documents_rels_import_jobs_id_idx";
  DROP INDEX "payload_locked_documents_rels_imported_items_id_idx";
  DROP INDEX "payload_locked_documents_rels_import_issues_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "import_jobs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "imported_items_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "import_issues_id";
  DROP TYPE "public"."enum_import_jobs_status";
  DROP TYPE "public"."enum_imported_items_status";
  DROP TYPE "public"."enum_import_issues_kind";
  DROP TYPE "public"."enum_import_issues_severity";`)
}
