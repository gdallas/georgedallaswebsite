// Full import pipeline driver. Orchestrates job -> per-post item -> media ->
// issues -> redirect, tracked in the CMS. The Payload client and the image
// downloader are injected, so the whole flow (idempotency, media relinking,
// issue generation, reporting) is unit-testable with in-memory fakes and runs
// for real against the CMS via payload-client.mjs.

import { buildIssues, needsReview } from "./issues.mjs";
import { collectImageNodes, collectImageSources, filenameFromUrl, relinkImages } from "./media.mjs";
import { deriveRedirect, transformPost as defaultTransform } from "./transform.mjs";

function isoNow(now) {
  return new Date(now ?? Date.now()).toISOString();
}

// imported-items is keyed by wordpressId (unique), so a retry updates the
// existing record rather than inserting a duplicate.
function upsertImportedItem(client, existing, data) {
  return existing ? client.update("imported-items", existing.id, data) : client.create("imported-items", data);
}

export async function runWordpressImport(options = {}) {
  const { posts = [], client, downloadImage, transformPost = defaultTransform, source = "", now } = options;

  if (!client) {
    throw new Error("A Payload client is required.");
  }

  const job = await client.create("import-jobs", {
    source,
    status: "running",
    startedAt: isoNow(now),
    fetched: posts.length,
    imported: 0,
    skipped: 0,
    failed: 0,
    needsReview: 0
  });

  const report = {
    jobId: job.id,
    fetched: posts.length,
    imported: 0,
    skipped: 0,
    failed: 0,
    needsReview: 0,
    mediaImported: 0,
    items: []
  };

  for (const wpPost of posts) {
    const wordpressId = String(wpPost?.id ?? "");
    // Declared in the loop scope so the catch block can reuse it when upserting
    // a failed item.
    let existingItem = null;
    try {
      // Idempotency + resumability. A post already carrying this WordPress id is
      // the durable signal it was imported (covers posts created before the
      // import collections existed); otherwise an imported-items row that is not
      // failed means it is done. Only failed items are retried.
      existingItem = wordpressId
        ? await client.findOne("imported-items", "wordpressId", wordpressId)
        : null;
      const existingPost = wordpressId
        ? await client.findOne("posts", "wordpressOriginalId", wordpressId)
        : null;
      if (existingPost || (existingItem && existingItem.status !== "failed")) {
        report.skipped += 1;
        report.items.push({ wordpressId, status: "skipped", reason: "already imported" });
        continue;
      }

      const result = await importOnePost({ wpPost, wordpressId, existingItem, job, client, downloadImage, transformPost, now });
      report.imported += 1;
      report.mediaImported += result.mediaCount;
      if (result.review) {
        report.needsReview += 1;
      }
      report.items.push({
        wordpressId,
        status: result.review ? "needs_review" : "imported",
        post: result.postId,
        media: result.mediaCount,
        issues: result.issueCount
      });
    } catch (error) {
      report.failed += 1;
      report.items.push({ wordpressId, status: "failed", error: error.message });
      try {
        await upsertImportedItem(client, existingItem, {
          wordpressId,
          status: "failed",
          job: job.id,
          error: error.message
        });
      } catch {
        // best effort — the job-level report still records the failure
      }
    }
  }

  await client.update("import-jobs", job.id, {
    status: "completed",
    finishedAt: isoNow(),
    imported: report.imported,
    skipped: report.skipped,
    failed: report.failed,
    needsReview: report.needsReview
  });
  report.status = "completed";
  return report;
}

async function importOnePost({ wpPost, wordpressId, existingItem, job, client, downloadImage, transformPost, now }) {
  const transformed = transformPost(wpPost, { now });
  const { data } = transformed;
  const context = {};

  // Resolve slug collisions against a different source post.
  const slugOwner = await client.findOne("posts", "slug", data.slug);
  if (slugOwner && String(slugOwner.wordpressOriginalId ?? "") !== wordpressId) {
    context.duplicateSlug = `post ${slugOwner.id}`;
    data.slug = `${data.slug}-wp${wordpressId}`;
  }

  // Download images, upload to media, and relink the body.
  const altBySrc = Object.fromEntries(collectImageNodes(data.body).map((node) => [node.src, node.alt]));
  const sources = collectImageSources(data.body);
  const mediaBySrc = {};
  const mediaDownloadFailed = [];
  const mediaMissingAlt = [];
  let mediaCount = 0;

  for (const src of sources) {
    try {
      const { buffer, mimeType } = await downloadImage(src);
      const alt = altBySrc[src] || "";
      const media = await client.uploadMedia(buffer, {
        filename: filenameFromUrl(src),
        mimeType,
        alt,
        source: src
      });
      mediaBySrc[src] = media.id;
      mediaCount += 1;
      if (!alt) {
        mediaMissingAlt.push(src);
      }
    } catch {
      mediaDownloadFailed.push(src);
    }
  }

  const { unresolved } = relinkImages(data.body, mediaBySrc);
  context.mediaDownloadFailed = mediaDownloadFailed;
  context.imageRelinkFailed = unresolved;
  context.mediaMissingAlt = mediaMissingAlt;

  const post = await client.create("posts", data);

  const issues = buildIssues(transformed, context);
  const review = needsReview(issues);

  const item = await upsertImportedItem(client, existingItem, {
    wordpressId,
    wordpressUrl: data.wordpressOriginalUrl,
    title: data.title,
    status: review ? "needs_review" : "imported",
    job: job.id,
    post: post.id,
    mediaCount,
    error: null
  });

  for (const entry of issues) {
    await client.create("import-issues", { ...entry, job: job.id, importedItem: item.id });
  }

  // Propose a redirect from the old WordPress permalink (idempotent by source).
  const redirect = deriveRedirect(data.wordpressOriginalUrl, data.slug);
  if (redirect) {
    const existing = await client.findOne("redirects", "sourcePath", redirect.sourcePath);
    if (!existing) {
      await client.create("redirects", redirect);
    }
  }

  return { postId: post.id, mediaCount, issueCount: issues.length, review };
}
