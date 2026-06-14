import type { CollectionConfig } from "payload";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";

// One record per source WordPress post. Keyed by the original WordPress id so a
// run is idempotent (skip already-imported) and resumable (retry failed items).
export const ImportedItems: CollectionConfig = {
  slug: "imported-items",
  labels: { singular: "Imported item", plural: "Imported items" },
  admin: {
    group: "WordPress import",
    defaultColumns: ["wordpressId", "title", "status", "post", "updatedAt"],
    useAsTitle: "title"
  },
  access: {
    create: requireContentMutation,
    read: requireContentRead,
    update: requireContentMutation,
    delete: requireContentMutation
  },
  fields: [
    {
      name: "wordpressId",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { description: "Original WordPress post id." }
    },
    { name: "wordpressUrl", type: "text" },
    { name: "title", type: "text" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "imported",
      options: [
        { label: "Imported", value: "imported" },
        { label: "Skipped", value: "skipped" },
        { label: "Failed", value: "failed" },
        { label: "Needs review", value: "needs_review" }
      ]
    },
    { name: "job", type: "relationship", relationTo: "import-jobs" },
    { name: "post", type: "relationship", relationTo: "posts" },
    {
      name: "mediaCount",
      type: "number",
      defaultValue: 0,
      admin: { description: "Images downloaded and relinked for this post." }
    },
    { name: "error", type: "textarea" }
  ]
};
