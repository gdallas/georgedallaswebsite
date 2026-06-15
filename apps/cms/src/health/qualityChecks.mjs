// Content-quality checks (GDW-037). Pure and network-free so they are fully
// unit-testable; the runner script feeds in fetched docs and persists the
// findings to the content-issues collection. Each finding carries a stable
// `fingerprint` so re-runs upsert (and auto-resolve) rather than duplicate.

export const defaultStaleNowDays = 90;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Stable identity for a finding: same problem on the same doc => same fingerprint.
export function fingerprint(kind, collection, documentId, url = "") {
  return `${kind}:${collection}:${documentId ?? ""}:${url}`;
}

function finding(kind, severity, collection, documentId, detail, url = "") {
  return {
    kind,
    severity,
    collection,
    documentId: documentId == null ? "" : String(documentId),
    url: url || undefined,
    detail,
    fingerprint: fingerprint(kind, collection, documentId, url)
  };
}

// Only published content is nagged about — drafts are still in progress.
function isPublished(doc) {
  return doc?.status === "published";
}

export function checkPost(post) {
  const findings = [];
  if (!isPublished(post)) {
    return findings;
  }
  const id = post.id;
  if (!isNonEmptyString(post.excerpt)) {
    findings.push(finding("missing_excerpt", "warning", "posts", id, "Published post has no excerpt."));
  }
  if (!isNonEmptyString(post.seoTitle)) {
    findings.push(finding("missing_seo_title", "warning", "posts", id, "Published post has no SEO title."));
  }
  if (!isNonEmptyString(post.seoDescription)) {
    findings.push(finding("missing_seo_description", "warning", "posts", id, "Published post has no SEO description."));
  }
  // A social image is expected for sharing; the featured image is an acceptable fallback.
  if (!post.socialImage && !post.featuredImage) {
    findings.push(finding("missing_social_image", "info", "posts", id, "Published post has no social or featured image."));
  }
  return findings;
}

export function checkPage(page) {
  const findings = [];
  if (!isPublished(page)) {
    return findings;
  }
  const id = page.id;
  if (!isNonEmptyString(page.seoTitle)) {
    findings.push(finding("missing_seo_title", "warning", "pages", id, "Published page has no SEO title."));
  }
  if (!isNonEmptyString(page.seoDescription)) {
    findings.push(finding("missing_seo_description", "warning", "pages", id, "Published page has no SEO description."));
  }
  return findings;
}

export function checkMedia(media) {
  // Only public, non-decorative images are required to have alt text.
  if (media?.reviewStatus !== "public" || media?.decorative === true || isNonEmptyString(media?.alt)) {
    return [];
  }
  const name = media.filename || media.id;
  return [finding("media_missing_alt", "warning", "media", media.id, `Public media "${name}" is missing alt text.`)];
}

export function checkNowPage(nowPage, { now = new Date(), staleNowDays = defaultStaleNowDays } = {}) {
  const updatedAt = nowPage?.updatedAt;
  if (!updatedAt) {
    return [];
  }
  const ageDays = (new Date(now).getTime() - new Date(updatedAt).getTime()) / 86_400_000;
  if (ageDays <= staleNowDays) {
    return [];
  }
  return [
    finding(
      "stale_now",
      "info",
      "now-page",
      "now-page",
      `Now page hasn't been updated in ${Math.floor(ageDays)} days (over ${staleNowDays}).`
    )
  ];
}

export function runQualityChecks({ posts = [], pages = [], media = [], nowPage = null, now = new Date(), staleNowDays = defaultStaleNowDays } = {}) {
  const findings = [];
  for (const post of posts) {
    findings.push(...checkPost(post));
  }
  for (const page of pages) {
    findings.push(...checkPage(page));
  }
  for (const item of media) {
    findings.push(...checkMedia(item));
  }
  if (nowPage) {
    findings.push(...checkNowPage(nowPage, { now, staleNowDays }));
  }
  return findings;
}
