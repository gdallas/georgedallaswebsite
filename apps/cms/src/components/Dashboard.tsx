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
import {
  approvedWhere,
  awaitingReviewWhere,
  needsReviewHref,
  readyToPublishHref,
  reviewedWhere,
  unresolvedIssuesHref,
  unresolvedIssuesWhere
} from "../dashboard/importReview.mjs";
import styles from "./Dashboard.module.css";

type DashboardDoc = {
  id: number | string;
  title?: string;
  publishedAt?: string;
  updatedAt?: string;
};

type MergedDoc = DashboardDoc & { collection: string };

type ImportJobDoc = {
  source?: string;
  status?: string;
  imported?: number;
  needsReview?: number;
  failed?: number;
  startedAt?: string;
};

type ImportedItemDoc = {
  id: number | string;
  title?: string;
  wordpressUrl?: string;
  reviewStatus?: string;
  post?: number | string | null;
};

type ImportStat = {
  label: string;
  value: number;
  href: string;
  alert?: boolean;
};

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

  const count = (collection: string, where?: Record<string, unknown>) =>
    payload.count({
      collection: collection as CollectionSlug,
      overrideAccess: false,
      user,
      ...(where ? { where: where as Where } : {})
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

  const [
    latestImportJob,
    importedTotal,
    reviewedCount,
    readyToPublishCount,
    unresolvedIssueCount,
    awaitingReview
  ] = await Promise.all([
    find("import-jobs", {}, "-startedAt", 1),
    count("imported-items"),
    count("imported-items", reviewedWhere()),
    count("imported-items", approvedWhere()),
    count("import-issues", unresolvedIssuesWhere()),
    find("imported-items", awaitingReviewWhere(), "-updatedAt", 6)
  ]);

  const job = latestImportJob.docs[0] as ImportJobDoc | undefined;
  const hasImportActivity = importedTotal.totalDocs > 0 || latestImportJob.totalDocs > 0;
  const importStats: ImportStat[] = [
    { label: "Imported", value: importedTotal.totalDocs, href: `${adminRoute}/collections/imported-items` },
    { label: "Reviewed", value: reviewedCount.totalDocs, href: needsReviewHref(adminRoute) },
    { label: "Ready to publish", value: readyToPublishCount.totalDocs, href: readyToPublishHref(adminRoute) },
    {
      label: "Unresolved issues",
      value: unresolvedIssueCount.totalDocs,
      href: unresolvedIssuesHref(adminRoute),
      alert: unresolvedIssueCount.totalDocs > 0
    }
  ];
  const awaitingReviewDocs = awaitingReview.docs as ImportedItemDoc[];

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
          {unresolvedIssueCount.totalDocs > 0 ? (
            <ul className={styles.docList}>
              <li>
                <a href={unresolvedIssuesHref(adminRoute)}>
                  <span>
                    {unresolvedIssueCount.totalDocs} unresolved WordPress import issue
                    {unresolvedIssueCount.totalDocs === 1 ? "" : "s"}
                  </span>
                </a>
              </li>
            </ul>
          ) : null}
        </section>
      </div>

      <section className={styles.section} aria-labelledby="dashboard-import">
        <h2 id="dashboard-import" className={styles.sectionTitle}>
          WordPress import
        </h2>
        {hasImportActivity ? (
          <>
            {job ? (
              <p className={styles.jobMeta}>
                Last run{job.source ? ` from ${job.source}` : ""}: <strong>{job.status ?? "unknown"}</strong>
                {job.startedAt ? ` · ${formatDate(job.startedAt)}` : ""} · {job.imported ?? 0} imported,{" "}
                {job.needsReview ?? 0} flagged for review, {job.failed ?? 0} failed.
              </p>
            ) : null}
            <ul className={styles.stats}>
              {importStats.map((stat) => (
                <li key={stat.label}>
                  <a className={styles.statCard} href={stat.href} data-alert={stat.alert ? "true" : "false"}>
                    <span className={styles.statValue}>{stat.value}</span>
                    <span className={styles.statLabel}>{stat.label}</span>
                  </a>
                </li>
              ))}
            </ul>
            <h3 className={styles.sectionTitle}>Needs review</h3>
            {awaitingReviewDocs.length > 0 ? (
              <ul className={styles.docList}>
                {awaitingReviewDocs.map((doc) => (
                  <li key={doc.id}>
                    <a
                      href={
                        doc.post != null
                          ? documentEditHref(adminRoute, "posts", doc.post)
                          : documentEditHref(adminRoute, "imported-items", doc.id)
                      }
                    >
                      <span>{doc.title || doc.wordpressUrl || "Untitled import"}</span>
                      <span className={styles.docMeta}>
                        {doc.reviewStatus === "in_review" ? "In review" : "Pending review"}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>Every imported post has been approved. Publish them from each post.</p>
            )}
          </>
        ) : (
          <p className={styles.empty}>
            No WordPress import has run yet. Run <code>pnpm --filter @georgedallas/cms import:wordpress</code> to bring
            posts in for review.
          </p>
        )}
      </section>
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
