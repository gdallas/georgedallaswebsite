import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { AnalyticsEvents } from "./collections/AnalyticsEvents";
import { AuditEvents } from "./collections/AuditEvents";
import { Books } from "./collections/Books";
import { Categories } from "./collections/Categories";
import { ContactMessages } from "./collections/ContactMessages";
import { ContentChecks } from "./collections/ContentChecks";
import { ContentIssues } from "./collections/ContentIssues";
import { ImportIssues } from "./collections/ImportIssues";
import { ImportJobs } from "./collections/ImportJobs";
import { ImportedItems } from "./collections/ImportedItems";
import { Links } from "./collections/Links";
import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";
import { Posts } from "./collections/Posts";
import { Projects } from "./collections/Projects";
import { Redirects } from "./collections/Redirects";
import { Tags } from "./collections/Tags";
import { TimelineEntries } from "./collections/TimelineEntries";
import { createUsersCollection } from "./collections/Users";
import { loadCmsConfig } from "./env";
import { NowPage } from "./globals/NowPage";
import { migrations } from "./migrations";
import { SiteSettings } from "./globals/SiteSettings";
import { createMediaStoragePlugin } from "./storage/s3";
import { pasteImageUploadFeature } from "./editor/pasteImageUploadFeature";
import { maxMediaUploadBytes } from "./validation/content.mjs";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const config = loadCmsConfig();
const secureCookies = config.appEnv === "production";
const Users = createUsersCollection({ secureCookies });

// Fails the build (and any local boot) if a collection ships without a nav
// group, so nothing can silently land back in an ungrouped sidebar list.
function assertNavGrouped<T extends { slug: string; admin?: { group?: unknown } }>(items: T[]): T[] {
  for (const item of items) {
    if (!item.admin?.group) {
      throw new Error(`Collection "${item.slug}" has no admin nav group. Add it to src/admin/navigation.mjs.`);
    }
  }

  return items;
}

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      graphics: {
        Icon: "/components/BrandIcon#BrandIcon",
        Logo: "/components/BrandLogo#BrandLogo"
      },
      views: {
        dashboard: {
          Component: "/components/Dashboard#Dashboard"
        },
        search: {
          Component: "/components/AdminSearch#AdminSearch",
          path: "/search"
        },
        // Privacy-friendly analytics dashboard (GDW-048), linked from the nav.
        analytics: {
          Component: "/components/AnalyticsView#AnalyticsView",
          path: "/analytics"
        }
      },
      // Writer-first sidebar (GDW-059): tiers driven by admin/navigation.mjs,
      // search built in (so no afterNavLinks entry; the custom Nav does not
      // render Payload's before/afterNavLinks slots).
      Nav: "/components/nav/Nav#Nav"
    },
    importMap: {
      baseDir: path.resolve(dirname)
    },
    meta: {
      // Admin pages are noindex'd at the edge; the generated-OG-image
      // endpoint would be dead weight in the Lambda, so keep it off.
      defaultOGImageType: "off",
      description: "Content studio for georgedallas.com.",
      icons: [{ rel: "icon", type: "image/svg+xml", url: "/brand/favicon.svg" }],
      titleSuffix: " · George Dallas CMS"
    },
    // "all" lets the account-menu preference and prefers-color-scheme pick
    // light or dark; the Cedar & Circuitry ramp in app/(payload)/custom.css
    // themes both.
    theme: "all"
  },
  auth: {
    jwtOrder: ["cookie", "Bearer", "JWT"]
  },
  bodyParser: {
    limits: {
      fileSize: maxMediaUploadBytes
    }
  },
  // Ordered to match the admin sidebar: Payload renders nav groups in the
  // order they first appear here (see src/admin/navigation.mjs), so writing
  // stays at the top and system tables at the bottom.
  collections: assertNavGrouped([
    Posts,
    Pages,
    Media,
    Projects,
    Links,
    Books,
    TimelineEntries,
    ContactMessages,
    Tags,
    Categories,
    Redirects,
    ContentIssues,
    ContentChecks,
    ImportJobs,
    ImportedItems,
    ImportIssues,
    AnalyticsEvents,
    Users,
    AuditEvents
  ]),
  cookiePrefix: `gdw-${config.appEnv}`,
  cors: [config.cmsPublicUrl, config.publicSiteUrl],
  csrf: [config.cmsPublicUrl],
  db: postgresAdapter({
    pool: {
      connectionString: config.databaseUrl
    },
    // Committed migrations run automatically on startup in deployed
    // environments (Lambda cold start); a no-op check when none are pending.
    prodMigrations: migrations
  }),
  editor: lexicalEditor({
    // Adds the paste-image handler (editor/pasteImageUploadFeature) alongside
    // every default feature — nothing is dropped, one behaviour is appended.
    features: ({ defaultFeatures }) => [...defaultFeatures, pasteImageUploadFeature()]
  }),
  globals: [SiteSettings, NowPage],
  plugins: [createMediaStoragePlugin(config)],
  secret: config.payloadSecret,
  serverURL: config.cmsPublicUrl,
  telemetry: false,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts")
  }
});
