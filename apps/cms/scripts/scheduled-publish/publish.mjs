// Backstop scheduled-publish logic (GDW-035). The primary path is event-driven:
// the CMS writes a schedule marker, the worker creates a one-shot EventBridge
// schedule, and at the due time the worker calls the CMS to publish. This script
// is the safety net / manual recovery tool: it finds any scheduled content whose
// publish time has passed and publishes it. It is idempotent — running it when
// nothing is due is a no-op — so it is safe to run by hand or on a slow cron as a
// belt-and-braces backstop. Pure logic here; the REST client lives in run.mjs.

import { isPublishDue } from "@georgedallas/shared/scheduling";

export const schedulablePublishCollections = ["posts", "pages"];

// Defence in depth: even though the query filters server-side, re-check each
// returned doc against the shared due predicate before publishing it.
export function selectDueDocs(docs, now = new Date()) {
  return (Array.isArray(docs) ? docs : []).filter((doc) => isPublishDue(doc, now));
}

export async function runScheduledPublish({
  client,
  collections = schedulablePublishCollections,
  now = new Date(),
  logger = console
}) {
  const report = { published: [], failed: [], scanned: 0 };
  const nowIso = new Date(now).toISOString();

  for (const collection of collections) {
    const docs = await client.list(collection, {
      "where[status][equals]": "scheduled",
      "where[publishedAt][less_than_equal]": nowIso
    });
    report.scanned += docs.length;

    for (const doc of selectDueDocs(docs, now)) {
      try {
        await client.update(collection, doc.id, { status: "published" });
        report.published.push({ collection, id: doc.id });
        logger.log?.(`[scheduled-publish] published ${collection}/${doc.id}`);
      } catch (error) {
        report.failed.push({ collection, id: doc.id, error: error.message });
        logger.error?.(`[scheduled-publish] failed ${collection}/${doc.id}: ${error.message}`);
      }
    }
  }

  return report;
}
