import * as migration_20260612_203710_initial_schema from './20260612_203710_initial_schema';
import * as migration_20260614_074954_add_wordpress_import_collections from './20260614_074954_add_wordpress_import_collections';
import * as migration_20260614_090000_add_import_review_fields from './20260614_090000_add_import_review_fields';
import * as migration_20260614_100000_add_redirect_status from './20260614_100000_add_redirect_status';
import * as migration_20260615_002008_add_content_versions from './20260615_002008_add_content_versions';
import * as migration_20260615_043010_add_content_health from './20260615_043010_add_content_health';
import * as migration_20260619_160000_add_contact_messages from './20260619_160000_add_contact_messages';
import * as migration_20260619_170000_add_books from './20260619_170000_add_books';
import * as migration_20260619_180000_add_timeline_entries from './20260619_180000_add_timeline_entries';
import * as migration_20260708_120000_add_book_cover_url from './20260708_120000_add_book_cover_url';
import * as migration_20260709_120000_add_now_entries from './20260709_120000_add_now_entries';
import * as migration_20260709_130000_add_github_sync from './20260709_130000_add_github_sync';

export const migrations = [
  {
    up: migration_20260612_203710_initial_schema.up,
    down: migration_20260612_203710_initial_schema.down,
    name: '20260612_203710_initial_schema',
  },
  {
    up: migration_20260614_074954_add_wordpress_import_collections.up,
    down: migration_20260614_074954_add_wordpress_import_collections.down,
    name: '20260614_074954_add_wordpress_import_collections',
  },
  {
    up: migration_20260614_090000_add_import_review_fields.up,
    down: migration_20260614_090000_add_import_review_fields.down,
    name: '20260614_090000_add_import_review_fields',
  },
  {
    up: migration_20260614_100000_add_redirect_status.up,
    down: migration_20260614_100000_add_redirect_status.down,
    name: '20260614_100000_add_redirect_status',
  },
  {
    up: migration_20260615_002008_add_content_versions.up,
    down: migration_20260615_002008_add_content_versions.down,
    name: '20260615_002008_add_content_versions',
  },
  {
    up: migration_20260615_043010_add_content_health.up,
    down: migration_20260615_043010_add_content_health.down,
    name: '20260615_043010_add_content_health'
  },
  {
    up: migration_20260619_160000_add_contact_messages.up,
    down: migration_20260619_160000_add_contact_messages.down,
    name: '20260619_160000_add_contact_messages'
  },
  {
    up: migration_20260619_170000_add_books.up,
    down: migration_20260619_170000_add_books.down,
    name: '20260619_170000_add_books'
  },
  {
    up: migration_20260619_180000_add_timeline_entries.up,
    down: migration_20260619_180000_add_timeline_entries.down,
    name: '20260619_180000_add_timeline_entries'
  },
  {
    up: migration_20260708_120000_add_book_cover_url.up,
    down: migration_20260708_120000_add_book_cover_url.down,
    name: '20260708_120000_add_book_cover_url'
  },
  {
    up: migration_20260709_120000_add_now_entries.up,
    down: migration_20260709_120000_add_now_entries.down,
    name: '20260709_120000_add_now_entries'
  },
  {
    up: migration_20260709_130000_add_github_sync.up,
    down: migration_20260709_130000_add_github_sync.down,
    name: '20260709_130000_add_github_sync'
  },
];
