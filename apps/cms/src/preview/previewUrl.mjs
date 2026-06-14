import { createPreviewToken } from "./previewToken.mjs";

// Build the tokenised preview URL shown by Payload's admin "Preview" button.
// The collection + id live inside the signed token (not the query string), so
// they cannot be tampered with; the route reads them from the verified token.
export function buildPreviewUrl({ collection, id, cmsPublicUrl, secret, ttlSeconds } = {}) {
  if (id == null || !cmsPublicUrl || !secret) {
    return null;
  }
  const token = createPreviewToken({ collection, id, ttlSeconds }, secret);
  const base = String(cmsPublicUrl).replace(/\/+$/, "");
  return `${base}/preview?token=${encodeURIComponent(token)}`;
}
