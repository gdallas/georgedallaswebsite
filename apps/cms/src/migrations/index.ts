import * as migration_20260612_203710_initial_schema from './20260612_203710_initial_schema';
import * as migration_20260614_074954_add_wordpress_import_collections from './20260614_074954_add_wordpress_import_collections';
import * as migration_20260614_090000_add_import_review_fields from './20260614_090000_add_import_review_fields';
import * as migration_20260614_100000_add_redirect_status from './20260614_100000_add_redirect_status';
import * as migration_20260615_002008_add_content_versions from './20260615_002008_add_content_versions';
import * as migration_20260615_043010_add_content_health from './20260615_043010_add_content_health';

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
];
