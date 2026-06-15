import type { CollectionConfig } from "payload";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";

// One row per content-health finding (broken link, missing metadata/alt text,
// stale Now page) produced by the content-checks runner (GDW-037). Idempotent by
// `fingerprint`; George triages via `status` (open/resolved/dismissed).
export const ContentIssues: CollectionConfig = {
  slug: "content-issues",
  labels: { singular: "Content issue", plural: "Content issues" },
  admin: {
    group: "Site health",
    defaultColumns: ["kind", "severity", "status", "collection", "url", "checkedAt"],
    listSearchableFields: ["detail", "url", "collection", "kind"],
    useAsTitle: "detail"
  },
  access: {
    create: requireContentMutation,
    read: requireContentRead,
    update: requireContentMutation,
    delete: requireContentMutation
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data.status === undefined) {
          return data;
        }
        const wasResolved = originalDoc?.status === "resolved" || originalDoc?.status === "dismissed";
        const isResolved = data.status === "resolved" || data.status === "dismissed";
        if (isResolved && !wasResolved) {
          data.resolvedAt = new Date().toISOString();
        } else if (!isResolved) {
          data.resolvedAt = null;
        }
        return data;
      }
    ]
  },
  fields: [
    {
      name: "kind",
      type: "select",
      required: true,
      options: [
        { label: "Broken link", value: "broken_link" },
        { label: "Missing SEO title", value: "missing_seo_title" },
        { label: "Missing SEO description", value: "missing_seo_description" },
        { label: "Missing excerpt", value: "missing_excerpt" },
        { label: "Missing social image", value: "missing_social_image" },
        { label: "Media missing alt text", value: "media_missing_alt" },
        { label: "Stale Now page", value: "stale_now" },
        { label: "Other", value: "other" }
      ]
    },
    {
      name: "severity",
      type: "select",
      required: true,
      defaultValue: "warning",
      options: [
        { label: "Info", value: "info" },
        { label: "Warning", value: "warning" },
        { label: "Error", value: "error" }
      ]
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "open",
      options: [
        { label: "Open", value: "open" },
        { label: "Resolved", value: "resolved" },
        { label: "Dismissed", value: "dismissed" }
      ]
    },
    { name: "collection", type: "text" },
    { name: "documentId", type: "text", index: true },
    {
      name: "fingerprint",
      type: "text",
      index: true,
      admin: { readOnly: true, description: "Stable identity used to de-duplicate findings across runs." }
    },
    { name: "url", type: "text" },
    { name: "httpStatus", type: "number" },
    { name: "detail", type: "textarea" },
    { name: "checkedAt", type: "date", admin: { readOnly: true } },
    { name: "notes", type: "textarea", admin: { description: "How this was triaged or resolved." } },
    {
      name: "resolvedAt",
      type: "date",
      admin: { readOnly: true, description: "Set automatically when the issue is resolved or dismissed." }
    }
  ]
};
