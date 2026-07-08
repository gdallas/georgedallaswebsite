import type { AdminViewServerProps, CollectionSlug, Where } from "payload";
import {
  buildAttentionItems,
  buildHealthTiles,
  buildQuickActions,
  contactInboxHref,
  contentIssuesHref,
  documentEditHref,
  draftsWhere,
  mediaNeedingAltTextWhere,
  mergeRecentDocs,
  metadataIssueKinds,
  newCleanContactMessagesWhere,
  openContentIssuesByKindsWhere
} from "../dashboard/dashboardData.mjs";
import {
  approvedWhere,
  awaitingReviewWhere,
  hasUnresolvedImportWork,
  needsReviewHref,
  readyToPublishHref,
  reviewedWhere,
  unresolvedIssuesHref,
  unresolvedIssuesWhere
} from "../dashboard/importReview.mjs";
import styles from "./Dashboard.module.css";
import { QuickCapture } from "./QuickCapture";

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

  // Recently published and Scheduled live behind secondary pills now
  // (GDW-064), so only drafts and the attention counts are queried.
  const [draftPosts, draftPages, mediaNeedingAltText] = await Promise.all([
    find("posts", draftsWhere(), "-updatedAt", 4),
    find("pages", draftsWhere(), "-updatedAt", 4),
    find("media", mediaNeedingAltTextWhere(), "-updatedAt", 1)
  ]);

  const [
    unresolvedIssueCount,
    awaitingReviewCount,
    brokenLinks,
    missingMetadata,
    missingAlt,
    staleNow,
    latestCheck,
    newContactMessages
  ] = await Promise.all([
    count("import-issues", unresolvedIssuesWhere()),
    count("imported-items", awaitingReviewWhere()),
    count("content-issues", openContentIssuesByKindsWhere(["broken_link"])),
    count("content-issues", openContentIssuesByKindsWhere(metadataIssueKinds)),
    count("content-issues", openContentIssuesByKindsWhere(["media_missing_alt"])),
    count("content-issues", openContentIssuesByKindsWhere(["stale_now"])),
    find("content-checks", {}, "-finishedAt", 1),
    count("contact-messages", newCleanContactMessagesWhere())
  ]);

  // The migration panel only exists while there is migration work left, so
  // its detail queries only run when it will render.
  const showImportPanel = hasUnresolvedImportWork({
    unresolvedIssues: unresolvedIssueCount.totalDocs,
    awaitingReview: awaitingReviewCount.totalDocs
  });
  const [latestImportJob, importedTotal, reviewedCount, readyToPublishCount, awaitingReview] = showImportPanel
    ? await Promise.all([
        find("import-jobs", {}, "-startedAt", 1),
        count("imported-items"),
        count("imported-items", reviewedWhere()),
        count("imported-items", approvedWhere()),
        find("imported-items", awaitingReviewWhere(), "-updatedAt", 6)
      ])
    : [];
  const healthTiles = buildHealthTiles(adminRoute, {
    brokenLinks: brokenLinks.totalDocs,
    missingMetadata: missingMetadata.totalDocs,
    missingAlt: missingAlt.totalDocs,
    staleNow: staleNow.totalDocs
  });
  const lastCheck = latestCheck.docs[0] as { finishedAt?: string } | undefined;
  const healthTotal = healthTiles.reduce((sum, tile) => sum + tile.value, 0);

  const job = latestImportJob?.docs[0] as ImportJobDoc | undefined;
  const importStats: ImportStat[] = showImportPanel
    ? [
        { label: "Imported", value: importedTotal?.totalDocs ?? 0, href: `${adminRoute}/collections/imported-items` },
        { label: "Reviewed", value: reviewedCount?.totalDocs ?? 0, href: needsReviewHref(adminRoute) },
        {
          label: "Ready to publish",
          value: readyToPublishCount?.totalDocs ?? 0,
          href: readyToPublishHref(adminRoute)
        },
        {
          label: "Unresolved issues",
          value: unresolvedIssueCount.totalDocs,
          href: unresolvedIssuesHref(adminRoute),
          alert: unresolvedIssueCount.totalDocs > 0
        }
      ]
    : [];
  const awaitingReviewDocs = (awaitingReview?.docs ?? []) as ImportedItemDoc[];

  // The Now capture card edits currentFocus in place, so it needs the
  // current value rather than an empty field.
  const nowPage = (await payload.findGlobal({
    slug: "now-page",
    depth: 0,
    overrideAccess: false,
    user
  })) as { currentFocus?: string | null };

  const latestDraftPost = draftPosts.docs[0] as DashboardDoc | undefined;
  const quickActions = buildQuickActions(adminRoute, latestDraftPost);
  const attentionItems = buildAttentionItems(adminRoute, {
    mediaNeedingAltText: mediaNeedingAltText.totalDocs,
    unresolvedImportIssues: unresolvedIssueCount.totalDocs,
    importsAwaitingReview: awaitingReviewCount.totalDocs,
    newContactMessages: newContactMessages.totalDocs
  });

  const recentDrafts = mergeRecentDocs(
    [
      { collection: "posts", docs: draftPosts.docs },
      { collection: "pages", docs: draftPages.docs }
    ],
    "updatedAt",
    4
  ) as MergedDoc[];

  return (
    <main className={`gutter--left gutter--right ${styles.dashboard}`}>
      <section className={styles.section} aria-labelledby="dashboard-capture">
        <h2 id="dashboard-capture" className={styles.sectionTitle}>
          Start something
        </h2>
        <QuickCapture
          adminRoute={adminRoute}
          apiRoute={payload.config.routes.api}
          nowCurrentFocus={typeof nowPage?.currentFocus === "string" ? nowPage.currentFocus : ""}
        />
      </section>

      <section className={styles.section} aria-labelledby="dashboard-quick-actions">
        <h2 id="dashboard-quick-actions" className={styles.sectionTitle}>
          This week
        </h2>
        <ul className={styles.actions}>
          {quickActions.primary.map((action) => (
            <li key={action.label}>
              <a className={styles.actionCard} href={action.href}>
                <span className={styles.actionLabel}>{action.label}</span>
                <span className={styles.actionDescription}>{action.description}</span>
              </a>
            </li>
          ))}
        </ul>
        <ul className={styles.secondaryActions} aria-label="More shortcuts">
          {quickActions.secondary.map((action) => (
            <li key={action.label}>
              <a className={styles.secondaryAction} href={action.href}>
                {action.label}
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

        <section className={styles.section} aria-labelledby="dashboard-attention">
          <h2 id="dashboard-attention" className={styles.sectionTitle}>
            Needs attention
          </h2>
          {attentionItems.length > 0 ? (
            <ul className={styles.docList}>
              {attentionItems.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>Nothing needs attention right now.</p>
          )}
        </section>
      </div>

      <section className={styles.section} aria-labelledby="dashboard-health">
        <h2 id="dashboard-health" className={styles.sectionTitle}>
          Site health
        </h2>
        <p className={styles.jobMeta}>
          {lastCheck?.finishedAt
            ? `Last checked ${formatDate(lastCheck.finishedAt)}.`
            : "No content check has run yet."}{" "}
          {healthTotal === 0 ? "No open issues." : null}
        </p>
        <ul className={styles.stats}>
          {healthTiles.map((tile) => (
            <li key={tile.label}>
              <a className={styles.statCard} href={tile.href} data-alert={tile.alert ? "true" : "false"}>
                <span className={styles.statValue}>{tile.value}</span>
                <span className={styles.statLabel}>{tile.label}</span>
              </a>
            </li>
          ))}
          <li>
            <a
              className={styles.statCard}
              href={contactInboxHref(adminRoute)}
              data-alert={newContactMessages.totalDocs > 0 ? "true" : "false"}
            >
              <span className={styles.statValue}>{newContactMessages.totalDocs}</span>
              <span className={styles.statLabel}>New messages</span>
            </a>
          </li>
        </ul>
        <p className={styles.empty}>
          <a href={contentIssuesHref(adminRoute)}>View all open content issues</a>
        </p>
      </section>

      {showImportPanel ? (
        <section className={styles.section} aria-labelledby="dashboard-import">
          <h2 id="dashboard-import" className={styles.sectionTitle}>
            WordPress import
          </h2>
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
        </section>
      ) : null}
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
