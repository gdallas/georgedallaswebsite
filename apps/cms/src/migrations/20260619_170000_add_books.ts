import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_books_reading_status" AS ENUM('reading', 'finished', 'paused', 'want_to_read', 'reference');
  CREATE TYPE "public"."enum_books_status" AS ENUM('draft', 'published', 'archived');
  CREATE TYPE "public"."enum_books_visibility" AS ENUM('public', 'unlisted', 'private');
  CREATE TABLE "books" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"author" varchar NOT NULL,
  	"isbn" varchar,
  	"cover_image_id" integer,
  	"reading_status" "enum_books_reading_status" DEFAULT 'want_to_read' NOT NULL,
  	"rating" numeric,
  	"date_started" timestamp(3) with time zone,
  	"date_finished" timestamp(3) with time zone,
  	"notes" jsonb,
  	"external_url" varchar,
  	"status" "enum_books_status" DEFAULT 'draft' NOT NULL,
  	"sort_order" numeric DEFAULT 0 NOT NULL,
  	"visibility" "enum_books_visibility" DEFAULT 'private' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "books_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"posts_id" integer
  );
  
  ALTER TABLE "books" ADD CONSTRAINT "books_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "books_rels" ADD CONSTRAINT "books_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "books_rels" ADD CONSTRAINT "books_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "books_id" integer;
  CREATE INDEX "books_isbn_idx" ON "books" USING btree ("isbn");
  CREATE INDEX "books_cover_image_idx" ON "books" USING btree ("cover_image_id");
  CREATE INDEX "books_updated_at_idx" ON "books" USING btree ("updated_at");
  CREATE INDEX "books_created_at_idx" ON "books" USING btree ("created_at");
  CREATE INDEX "books_rels_order_idx" ON "books_rels" USING btree ("order");
  CREATE INDEX "books_rels_parent_idx" ON "books_rels" USING btree ("parent_id");
  CREATE INDEX "books_rels_path_idx" ON "books_rels" USING btree ("path");
  CREATE INDEX "books_rels_posts_id_idx" ON "books_rels" USING btree ("posts_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_books_fk" FOREIGN KEY ("books_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_books_id_idx" ON "payload_locked_documents_rels" USING btree ("books_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "books" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "books_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "books_rels" CASCADE;
  DROP TABLE "books" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_books_fk";
  DROP INDEX "payload_locked_documents_rels_books_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "books_id";
  DROP TYPE "public"."enum_books_reading_status";
  DROP TYPE "public"."enum_books_status";
  DROP TYPE "public"."enum_books_visibility";`)
}
