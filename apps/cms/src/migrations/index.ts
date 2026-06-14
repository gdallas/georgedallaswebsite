import * as migration_20260612_203710_initial_schema from './20260612_203710_initial_schema';
import * as migration_20260614_074954_add_wordpress_import_collections from './20260614_074954_add_wordpress_import_collections';

export const migrations = [
  {
    up: migration_20260612_203710_initial_schema.up,
    down: migration_20260612_203710_initial_schema.down,
    name: '20260612_203710_initial_schema',
  },
  {
    up: migration_20260614_074954_add_wordpress_import_collections.up,
    down: migration_20260614_074954_add_wordpress_import_collections.down,
    name: '20260614_074954_add_wordpress_import_collections'
  },
];
