import type { CollectionConfig } from "payload";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";

// The cleanup queue: one record per problem found while importing a post
// (unsupported shortcode, broken embed, missing excerpt, duplicate slug, media
// that could not be downloaded or lacks alt text). Reviewed and resolved in the
// admin (GDW-032).
export const ImportIssues: CollectionConfig = {
  slug: "import-issues",
  labels: { singular: "Import issue", plural: "Import issues" },
  admin: {
    group: "WordPress import",
    defaultColumns: ["kind", "severity", "wordpressId", "resolved", "detail", "createdAt"],
    listSearchableFields: ["detail", "notes", "kind", "wordpressId"],
    useAsTitle: "detail"
  },
  access: {
    create: requireContentMutation,
    read: requireContentRead,
    update: requireContentMutation,
    delete: requireContentMutation
  },
  hooks: {
    // Stamp/clear the resolution time as George flips the checkbox, so the
    // review queue can show when each issue was cleared.
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data.resolved === undefined) {
          return data;
        }

        const wasResolved = Boolean(originalDoc?.resolved);

        if (data.resolved && !wasResolved) {
          data.resolvedAt = new Date().toISOString();
        } else if (!data.resolved) {
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
        { label: "Unsupported shortcode", value: "unsupported_shortcode" },
        { label: "Broken embed", value: "broken_embed" },
        { label: "Missing excerpt", value: "missing_excerpt" },
        { label: "Duplicate slug", value: "duplicate_slug" },
        { label: "Media missing alt text", value: "media_missing_alt" },
        { label: "Media download failed", value: "media_download_failed" },
        { label: "Image could not be relinked", value: "image_relink_failed" },
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
    { name: "wordpressId", type: "text", index: true },
    { name: "detail", type: "textarea" },
    { name: "job", type: "relationship", relationTo: "import-jobs" },
    {
      name: "importedItem",
      type: "relationship",
      relationTo: "imported-items",
      admin: { description: "The imported post this issue affects. Open it to reach the linked CMS post." }
    },
    { name: "resolved", type: "checkbox", defaultValue: false },
    {
      name: "notes",
      type: "textarea",
      admin: { description: "How this was triaged or resolved." }
    },
    {
      name: "resolvedAt",
      type: "date",
      admin: { readOnly: true, description: "Set automatically when the issue is marked resolved." }
    }
  ]
};
