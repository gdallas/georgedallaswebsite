import type { CollectionConfig } from "payload";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";

// One row per content-checks run (GDW-037), mirroring import-jobs: a record of
// when the checker last ran and what it found, so the dashboard can show recency
// and totals.
export const ContentChecks: CollectionConfig = {
  slug: "content-checks",
  labels: { singular: "Content check run", plural: "Content check runs" },
  admin: {
    group: "Site health",
    defaultColumns: ["type", "status", "brokenLinks", "issuesOpen", "finishedAt"],
    useAsTitle: "type"
  },
  access: {
    create: requireContentMutation,
    read: requireContentRead,
    update: requireContentMutation,
    delete: requireContentMutation
  },
  fields: [
    {
      name: "type",
      type: "select",
      required: true,
      defaultValue: "all",
      options: [
        { label: "All", value: "all" },
        { label: "Links", value: "links" },
        { label: "Quality", value: "quality" }
      ]
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "completed",
      options: [
        { label: "Running", value: "running" },
        { label: "Completed", value: "completed" },
        { label: "Failed", value: "failed" }
      ]
    },
    { name: "startedAt", type: "date" },
    { name: "finishedAt", type: "date" },
    { name: "scanned", type: "number", defaultValue: 0 },
    { name: "linksChecked", type: "number", defaultValue: 0 },
    { name: "brokenLinks", type: "number", defaultValue: 0 },
    { name: "issuesOpen", type: "number", defaultValue: 0 },
    { name: "issuesResolved", type: "number", defaultValue: 0 },
    { name: "notes", type: "textarea" }
  ]
};
