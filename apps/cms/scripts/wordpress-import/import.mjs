// Import driver. The Payload client is injected (an object with
// `findByWordpressId` and `createDraft`) so the import flow — including
// idempotency and the summary report — can be unit-tested with an in-memory
// fake, and run for real against a CMS via payload-client.mjs.

import { transformPost as defaultTransform } from "./transform.mjs";

function hasWarnings(warnings) {
  return warnings.shortcodes.length > 0 || warnings.embeds.length > 0;
}

export async function importWordpressPosts(options = {}) {
  const { posts = [], client, transformPost = defaultTransform, now } = options;

  if (!client || typeof client.findByWordpressId !== "function" || typeof client.createDraft !== "function") {
    throw new Error("A Payload client with findByWordpressId and createDraft is required.");
  }

  const report = {
    startedAt: new Date(now ?? Date.now()).toISOString(),
    fetched: posts.length,
    created: 0,
    skipped: 0,
    failed: 0,
    withWarnings: 0,
    items: []
  };

  for (const wpPost of posts) {
    let transformed;
    try {
      transformed = transformPost(wpPost, { now });
    } catch (error) {
      report.failed += 1;
      report.items.push({ wordpressId: wpPost?.id ?? null, status: "failed", error: `transform: ${error.message}` });
      continue;
    }

    const { data, warnings, source } = transformed;
    if (hasWarnings(warnings)) {
      report.withWarnings += 1;
    }

    try {
      const existing = await client.findByWordpressId(data.wordpressOriginalId);
      if (existing) {
        report.skipped += 1;
        report.items.push({
          wordpressId: data.wordpressOriginalId,
          slug: data.slug,
          status: "skipped",
          reason: "already imported",
          payloadId: existing.id ?? null,
          warnings
        });
        continue;
      }

      const created = await client.createDraft(data);
      report.created += 1;
      report.items.push({
        wordpressId: data.wordpressOriginalId,
        slug: data.slug,
        status: "created",
        payloadId: created?.id ?? null,
        author: source.authorName,
        warnings
      });
    } catch (error) {
      report.failed += 1;
      report.items.push({
        wordpressId: data.wordpressOriginalId,
        slug: data.slug,
        status: "failed",
        error: error.message,
        warnings
      });
    }
  }

  report.finishedAt = new Date().toISOString();
  return report;
}
