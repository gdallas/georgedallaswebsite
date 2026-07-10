import type { AdminViewServerProps, CollectionSlug } from "payload";
import { summarizeEvents } from "../analytics/analytics.mjs";
import styles from "./AnalyticsView.module.css";

// Admin analytics view (GDW-048), registered at {adminRoute}/analytics. A server
// view like AdminSearch: it queries the recent events through payload.find with
// overrideAccess:false + the current user (so RBAC applies — admin-only), then
// renders privacy-friendly, content-focused aggregates. No raw rows, nothing
// that identifies a visitor, no client JS.
const WINDOW_DAYS = 30;
const MAX_EVENTS = 20000;

type Count = { value: string; count: number };

function CountList({ title, items, empty }: { title: string; items: Count[]; empty: string }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{title}</h2>
      {items.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ol className={styles.list}>
          {items.map((item) => (
            <li key={item.value} className={styles.row}>
              <span className={styles.label} title={item.value}>
                {item.value}
              </span>
              <span className={styles.count}>{item.count}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export async function AnalyticsView({ initPageResult }: AdminViewServerProps) {
  const { payload, user } = initPageResult.req;
  const adminRoute = payload.config.routes.admin;
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const result = await payload.find({
    collection: "analytics-events" as CollectionSlug,
    where: { createdAt: { greater_than: since } },
    limit: MAX_EVENTS,
    depth: 0,
    sort: "-createdAt",
    overrideAccess: false,
    user
  });

  const summary = summarizeEvents(result.docs as Array<Record<string, unknown>>);

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <a className={styles.back} href={adminRoute}>
          ← Dashboard
        </a>
        <h1 className={styles.title}>Analytics</h1>
        <p className={styles.sub}>
          Privacy-friendly, content-focused — no cookies, no IP addresses, no tracking across sites.
          Last {WINDOW_DAYS} days.
        </p>
      </header>

      <p className={styles.total}>
        <strong>{summary.totalViews.toLocaleString()}</strong> page views
      </p>

      <div className={styles.grid}>
        <CountList title="Most read writing" items={summary.topPosts} empty="No writing views yet." />
        <CountList title="Top pages" items={summary.topPages} empty="No views yet." />
        <CountList title="Search queries" items={summary.topSearches} empty="No searches yet." />
        <CountList title="Where visitors came from" items={summary.topReferrers} empty="No external referrers yet." />
        <CountList title="Projects" items={summary.topProjects} empty="No project views yet." />
        <CountList title="Devices" items={summary.devices} empty="No data yet." />
      </div>
    </div>
  );
}
