import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Adds Books.coverUrl (George feedback, 2026-07-08): the ISBN lookup stores the
// looked-up cover image URL directly on the book so it shows on the bookshelf
// and in the admin list without an upload step. Books has no drafts/versions
// table, so only the "books" table changes.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "cover_url" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "books" DROP COLUMN IF EXISTS "cover_url";`)
}
