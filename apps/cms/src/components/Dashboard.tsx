import type { AdminViewServerProps, CollectionSlug, Where } from "payload";
import {
  buildQuickActions,
  documentEditHref,
  draftsWhere,
  mediaNeedingAltTextWhere,
  mergeRecentDocs,
  recentlyPublishedWhere,
  scheduledWhere
} from "../dashboard/dashboardData.mjs";
import styles from "./Dashboard.module.css";

type DashboardDoc = {
  id: number | string;
  title?: string;
  publishedAt?: string;
  updatedAt?: string;
};

type MergedDoc = DashboardDoc & { collection: string };

export async function Dashboard({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult;
  const { payload, user } = req;
  const adminRoute = payload.config.routes.admin;

  const find = (collection: string, where: Record<string, unknown>, sort: string, limit: number) =>
    payload.find({
      collection: collection as CollectionSlug,
      depth: 0,
      limit,
      overrideAccess: false,
      sort,
      user,
      where: where as Where
    });

  const [draftPosts, draftPages, publishedPosts, publishedPages, scheduledPosts, mediaNeedingAltText] =
    await Promise.all([
      find("posts", draftsWhere(), "-updatedAt", 5),
      find("pages", draftsWhere(), "-updatedAt", 5),
      find("posts", recentlyPublishedWhere(), "-publishedAt", 5),
      find("pages", recentlyPublishedWhere(), "-publishedAt", 5),
      find("posts", scheduledWhere(), "publishedAt", 5),
      find("media", mediaNeedingAltTextWhere(), "-updatedAt", 1)
    ]);

  const latestDraftPost = draftPosts.docs[0] as DashboardDoc | undefined;
  const quickActions = buildQuickActions(adminRoute, latestDraftPost);

  const recentDrafts = mergeRecentDocs(
    [
      { collection: "posts", docs: draftPosts.docs },
      { collection: "pages", docs: draftPages.docs }
    ],
    "updatedAt",
    6
  ) as MergedDoc[];

  const recentlyPublished = mergeRecentDocs(
    [
      { collection: "posts", docs: publishedPosts.docs },
      { collection: "pages", docs: publishedPages.docs }
    ],
    "publishedAt",
    6
  ) as MergedDoc[];

  return (
    <main className={`gutter--left gutter--right ${styles.dashboard}`}>
      <section className={styles.section} aria-labelledby="dashboard-quick-actions">
        <h2 id="dashboard-quick-actions" className={styles.sectionTitle}>
          This week
        </h2>
        <ul className={styles.actions}>
          {quickActions.map((action) => (
            <li key={action.label}>
              <a className={styles.actionCard} href={action.href}>
                <span className={styles.actionLabel}>{action.label}</span>
                <span className={styles.actionDescription}>{action.description}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.columns}>
        <section className={styles.section} aria-labelledby="dashboard-drafts">
          <h2 id="dashboard-drafts" className={styles.sectionTitle}>
            Recent drafts
          </h2>
          <DocList adminRoute={adminRoute} dateField="updatedAt" docs={recentDrafts} emptyText="No drafts in progress." />
        </section>

        <section className={styles.section} aria-labelledby="dashboard-published">
          <h2 id="dashboard-published" className={styles.sectionTitle}>
            Recently published
          </h2>
          <DocList
            adminRoute={adminRoute}
            dateField="publishedAt"
            docs={recentlyPublished}
            emptyText="Nothing published yet."
          />
        </section>

        <section className={styles.section} aria-labelledby="dashboard-scheduled">
          <h2 id="dashboard-scheduled" className={styles.sectionTitle}>
            Scheduled
          </h2>
          <DocList
            adminRoute={adminRoute}
            dateField="publishedAt"
            docs={(scheduledPosts.docs as DashboardDoc[]).map((doc) => ({ ...doc, collection: "posts" }))}
            emptyText="No scheduled posts. Scheduled publishing arrives with GDW-035."
          />
        </section>

        <section className={styles.section} aria-labelledby="dashboard-attention">
          <h2 id="dashboard-attention" className={styles.sectionTitle}>
            Needs attention
          </h2>
          {mediaNeedingAltText.totalDocs > 0 ? (
            <ul className={styles.docList}>
              <li>
                <a href={`${adminRoute}/collections/media?where[reviewStatus][equals]=needs_alt_text`}>
                  <span>
                    {mediaNeedingAltText.totalDocs} media item{mediaNeedingAltText.totalDocs === 1 ? "" : "s"} missing
                    alt text
                  </span>
                </a>
              </li>
            </ul>
          ) : (
            <p className={styles.empty}>No media is waiting on alt text.</p>
          )}
          <p className={styles.empty}>WordPress import review tasks will appear here once the import pipeline lands (GDW-030+).</p>
        </section>
      </div>
    </main>
  );
}

type DocListProps = {
  adminRoute: string;
  dateField: "publishedAt" | "updatedAt";
  docs: MergedDoc[];
  emptyText: string;
};

function DocList({ adminRoute, dateField, docs, emptyText }: DocListProps) {
  if (docs.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }

  return (
    <ul className={styles.docList}>
      {docs.map((doc) => (
        <li key={`${doc.collection}-${doc.id}`}>
          <a href={documentEditHref(adminRoute, doc.collection, doc.id)}>
            <span>{doc.title || "Untitled"}</span>
            <span className={styles.docMeta}>
              {doc.collection === "pages" ? "Page" : "Post"}
              {doc[dateField] ? ` · ${formatDate(doc[dateField])}` : ""}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString("en-CA", { dateStyle: "medium" });
}
