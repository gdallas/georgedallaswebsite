// Link discovery + result classification for the broken-link checker (GDW-037).
// Pure: extraction walks already-fetched docs and the actual HTTP fetching lives
// in scripts/content-checks/linkChecker.mjs (with an injected fetch).

import { fingerprint } from "./qualityChecks.mjs";

// Only absolute http(s) URLs are checkable. Internal paths, mailto:, tel:, and
// in-page anchors are skipped.
export function isCheckableUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}

// Recursively collect link-node URLs from a Lexical rich-text value.
export function extractRichTextLinks(value) {
  const urls = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") {
      return;
    }
    if (node.type === "link") {
      const url = node.fields?.url ?? node.url;
      if (typeof url === "string") {
        urls.push(url);
      }
    }
    const children = node.children ?? node.root?.children;
    if (Array.isArray(children)) {
      children.forEach(visit);
    } else if (node.root) {
      visit(node.root);
    }
  };
  visit(value);
  return urls;
}

// All checkable external links for one document, tagged with their source.
export function extractLinks(collection, doc) {
  const raw = [];
  switch (collection) {
    case "posts":
      raw.push(...extractRichTextLinks(doc.body), doc.canonicalUrl);
      break;
    case "pages":
      raw.push(...extractRichTextLinks(doc.body));
      break;
    case "projects":
      raw.push(...extractRichTextLinks(doc.description), doc.githubUrl, doc.liveUrl, doc.caseStudyUrl);
      break;
    case "links":
      raw.push(doc.url);
      break;
    default:
      break;
  }

  const seen = new Set();
  const result = [];
  for (const url of raw) {
    if (!isCheckableUrl(url)) {
      continue;
    }
    const trimmed = url.trim();
    if (seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push({ url: trimmed, collection, documentId: String(doc.id) });
  }
  return result;
}

// Map an HTTP result to a verdict. 2xx/3xx are healthy; auth/rate-limit/method
// responses are inconclusive (many hosts block bots) so they are skipped rather
// than reported as broken to avoid false positives.
export function classifyLink({ status, error } = {}) {
  if (error) {
    return "broken";
  }
  if (typeof status !== "number") {
    return "skipped";
  }
  if (status >= 200 && status < 400) {
    return "ok";
  }
  if (status === 401 || status === 403 || status === 405 || status === 429) {
    return "skipped";
  }
  return "broken";
}

export function brokenLinkFinding({ url, collection, documentId, status, error }) {
  const detail = error
    ? `Link could not be reached: ${url} (${error}).`
    : `Link returned HTTP ${status}: ${url}.`;
  return {
    kind: "broken_link",
    severity: "error",
    collection,
    documentId: String(documentId ?? ""),
    url,
    httpStatus: typeof status === "number" ? status : undefined,
    detail,
    fingerprint: fingerprint("broken_link", collection, documentId, url)
  };
}
