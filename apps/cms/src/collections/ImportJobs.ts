import type { CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";

// One record per WordPress import run. Tracks source, lifecycle, and tallies so
// a run is auditable and resumable. Admin-only (never part of public builds).
export const ImportJobs: CollectionConfig = {
  slug: "import-jobs",
  labels: { singular: "Import run", plural: "Import runs" },
  admin: {
    group: collectionNavGroup("import-jobs"),
    description: "History of WordPress import runs.",
    defaultColumns: ["source", "status", "imported", "needsReview", "failed", "startedAt"],
    useAsTitle: "source"
  },
  access: {
    create: requireContentMutation,
    read: requireContentRead,
    update: requireContentMutation,
    delete: requireContentMutation
  },
  fields: [
    {
      name: "source",
      type: "text",
      required: true,
      admin: { description: "WordPress REST API base the run pulled from." }
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "running",
      options: [
        { label: "Running", value: "running" },
        { label: "Completed", value: "completed" },
        { label: "Failed", value: "failed" }
      ]
    },
    { name: "startedAt", type: "date" },
    { name: "finishedAt", type: "date" },
    { name: "fetched", type: "number", defaultValue: 0 },
    { name: "imported", type: "number", defaultValue: 0 },
    { name: "skipped", type: "number", defaultValue: 0 },
    { name: "failed", type: "number", defaultValue: 0 },
    { name: "needsReview", type: "number", defaultValue: 0 },
    { name: "notes", type: "textarea" }
  ]
};
