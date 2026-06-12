import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { AuditEvents } from "./collections/AuditEvents";
import { Categories } from "./collections/Categories";
import { Links } from "./collections/Links";
import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";
import { Posts } from "./collections/Posts";
import { Projects } from "./collections/Projects";
import { Redirects } from "./collections/Redirects";
import { Tags } from "./collections/Tags";
import { createUsersCollection } from "./collections/Users";
import { loadCmsConfig } from "./env";
import { NowPage } from "./globals/NowPage";
import { SiteSettings } from "./globals/SiteSettings";
import { createMediaStoragePlugin } from "./storage/s3";
import { maxMediaUploadBytes } from "./validation/content.mjs";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const config = loadCmsConfig();
const secureCookies = config.appEnv === "production";
const Users = createUsersCollection({ secureCookies });

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      views: {
        dashboard: {
          Component: "/components/Dashboard#Dashboard"
        }
      }
    },
    importMap: {
      baseDir: path.resolve(dirname)
    }
  },
  auth: {
    jwtOrder: ["cookie", "Bearer", "JWT"]
  },
  bodyParser: {
    limits: {
      fileSize: maxMediaUploadBytes
    }
  },
  collections: [Users, Media, Tags, Categories, Redirects, Posts, Pages, Projects, Links, AuditEvents],
  cookiePrefix: `gdw-${config.appEnv}`,
  cors: [config.cmsPublicUrl, config.publicSiteUrl],
  csrf: [config.cmsPublicUrl],
  db: postgresAdapter({
    pool: {
      connectionString: config.databaseUrl
    }
  }),
  editor: lexicalEditor(),
  globals: [SiteSettings, NowPage],
  plugins: [createMediaStoragePlugin(config)],
  secret: config.payloadSecret,
  serverURL: config.cmsPublicUrl,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts")
  }
});
