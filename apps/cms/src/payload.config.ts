import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Users } from "./collections/Users";
import { loadCmsConfig } from "./env";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const config = loadCmsConfig();

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname)
    }
  },
  collections: [Users],
  db: postgresAdapter({
    pool: {
      connectionString: config.databaseUrl
    }
  }),
  editor: lexicalEditor(),
  secret: config.payloadSecret,
  serverURL: config.cmsPublicUrl,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts")
  }
});
