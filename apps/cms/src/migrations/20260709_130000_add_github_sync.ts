import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// GitHub project sync (GDW-045): github_repos (synced repositories, admin-only
// review surface) and github_sync_runs (run history). A single relationship to
// projects is a direct project_id FK column, not a rels table.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
   CREATE TYPE "public"."enum_github_sync_runs_status" AS ENUM('success', 'partial', 'error');
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  CREATE TABLE IF NOT EXISTS "github_repos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"github_id" numeric NOT NULL,
  	"name" varchar,
  	"full_name" varchar,
  	"description" varchar,
  	"url" varchar,
  	"homepage" varchar,
  	"stars" numeric,
  	"forks" numeric,
  	"language" varchar,
  	"topics" jsonb,
  	"pushed_at" timestamp(3) with time zone,
  	"is_archived" boolean,
  	"is_fork" boolean,
  	"last_synced_at" timestamp(3) with time zone,
  	"promote_to_project" boolean DEFAULT false,
  	"project_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "github_sync_runs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"finished_at" timestamp(3) with time zone,
  	"status" "enum_github_sync_runs_status" DEFAULT 'success' NOT NULL,
  	"repos_seen" numeric,
  	"repos_upserted" numeric,
  	"error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "github_repos_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "github_sync_runs_id" integer;

  DO $$ BEGIN
   ALTER TABLE "github_repos" ADD CONSTRAINT "github_repos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_github_repos_fk" FOREIGN KEY ("github_repos_id") REFERENCES "public"."github_repos"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_github_sync_runs_fk" FOREIGN KEY ("github_sync_runs_id") REFERENCES "public"."github_sync_runs"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$;

  CREATE UNIQUE INDEX IF NOT EXISTS "github_repos_github_id_idx" ON "github_repos" USING btree ("github_id");
  CREATE INDEX IF NOT EXISTS "github_repos_project_idx" ON "github_repos" USING btree ("project_id");
  CREATE INDEX IF NOT EXISTS "github_repos_updated_at_idx" ON "github_repos" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "github_repos_created_at_idx" ON "github_repos" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "github_sync_runs_updated_at_idx" ON "github_sync_runs" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "github_sync_runs_created_at_idx" ON "github_sync_runs" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_github_repos_id_idx" ON "payload_locked_documents_rels" USING btree ("github_repos_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_github_sync_runs_id_idx" ON "payload_locked_documents_rels" USING btree ("github_sync_runs_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_github_repos_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_github_sync_runs_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_github_repos_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_github_sync_runs_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "github_repos_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "github_sync_runs_id";
  DROP TABLE IF EXISTS "github_repos" CASCADE;
  DROP TABLE IF EXISTS "github_sync_runs" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_github_sync_runs_status";`)
}
