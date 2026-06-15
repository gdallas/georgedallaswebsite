import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_content_issues_kind" AS ENUM('broken_link', 'missing_seo_title', 'missing_seo_description', 'missing_excerpt', 'missing_social_image', 'media_missing_alt', 'stale_now', 'other');
  CREATE TYPE "public"."enum_content_issues_severity" AS ENUM('info', 'warning', 'error');
  CREATE TYPE "public"."enum_content_issues_status" AS ENUM('open', 'resolved', 'dismissed');
  CREATE TYPE "public"."enum_content_checks_type" AS ENUM('all', 'links', 'quality');
  CREATE TYPE "public"."enum_content_checks_status" AS ENUM('running', 'completed', 'failed');
  CREATE TABLE "content_issues" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_content_issues_kind" NOT NULL,
  	"severity" "enum_content_issues_severity" DEFAULT 'warning' NOT NULL,
  	"status" "enum_content_issues_status" DEFAULT 'open' NOT NULL,
  	"collection" varchar,
  	"document_id" varchar,
  	"fingerprint" varchar,
  	"url" varchar,
  	"http_status" numeric,
  	"detail" varchar,
  	"checked_at" timestamp(3) with time zone,
  	"notes" varchar,
  	"resolved_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_checks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_content_checks_type" DEFAULT 'all' NOT NULL,
  	"status" "enum_content_checks_status" DEFAULT 'completed' NOT NULL,
  	"started_at" timestamp(3) with time zone,
  	"finished_at" timestamp(3) with time zone,
  	"scanned" numeric DEFAULT 0,
  	"links_checked" numeric DEFAULT 0,
  	"broken_links" numeric DEFAULT 0,
  	"issues_open" numeric DEFAULT 0,
  	"issues_resolved" numeric DEFAULT 0,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_issues_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_checks_id" integer;
  CREATE INDEX "content_issues_document_id_idx" ON "content_issues" USING btree ("document_id");
  CREATE INDEX "content_issues_fingerprint_idx" ON "content_issues" USING btree ("fingerprint");
  CREATE INDEX "content_issues_updated_at_idx" ON "content_issues" USING btree ("updated_at");
  CREATE INDEX "content_issues_created_at_idx" ON "content_issues" USING btree ("created_at");
  CREATE INDEX "content_checks_updated_at_idx" ON "content_checks" USING btree ("updated_at");
  CREATE INDEX "content_checks_created_at_idx" ON "content_checks" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_issues_fk" FOREIGN KEY ("content_issues_id") REFERENCES "public"."content_issues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_checks_fk" FOREIGN KEY ("content_checks_id") REFERENCES "public"."content_checks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_content_issues_id_idx" ON "payload_locked_documents_rels" USING btree ("content_issues_id");
  CREATE INDEX "payload_locked_documents_rels_content_checks_id_idx" ON "payload_locked_documents_rels" USING btree ("content_checks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "content_issues" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_checks" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "content_issues" CASCADE;
  DROP TABLE "content_checks" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_issues_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_content_checks_fk";
  
  DROP INDEX "payload_locked_documents_rels_content_issues_id_idx";
  DROP INDEX "payload_locked_documents_rels_content_checks_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_issues_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_checks_id";
  DROP TYPE "public"."enum_content_issues_kind";
  DROP TYPE "public"."enum_content_issues_severity";
  DROP TYPE "public"."enum_content_issues_status";
  DROP TYPE "public"."enum_content_checks_type";
  DROP TYPE "public"."enum_content_checks_status";`)
}
