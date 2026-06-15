// The rich-text serializer now lives in @georgedallas/shared so the CMS
// draft-preview route can render bodies identically to the public site.
// Re-exported here to keep existing site imports stable.
export { escapeHtml, safeUrl, renderRichText } from "@georgedallas/shared/rich-text";
