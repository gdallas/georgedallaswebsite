import type { CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";

// History of GitHub sync runs (GDW-045). One row per sync, written by the
// internal sync endpoint, so a failed or partial sync is visible in the admin
// instead of failing silently. Admin-only; auto-created (George only ever
// deletes old rows).
export const GithubSyncRuns: CollectionConfig = {
  slug: "github-sync-runs",
  defaultSort: "-startedAt",
  admin: {
    group: collectionNavGroup("github-sync-runs"),
    description: "Log of GitHub sync runs — when they ran, how many repositories were seen, and any errors.",
    defaultColumns: ["startedAt", "status", "reposSeen", "reposUpserted"],
    useAsTitle: "startedAt"
  },
  access: {
    create: requireContentMutation,
    delete: requireContentMutation,
    read: requireContentRead,
    update: requireContentMutation
  },
  fields: [
    { name: "startedAt", type: "date", required: true, admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } } },
    { name: "finishedAt", type: "date", admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } } },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "success",
      options: [
        { label: "Success", value: "success" },
        { label: "Partial", value: "partial" },
        { label: "Error", value: "error" }
      ],
      admin: { readOnly: true }
    },
    { name: "reposSeen", type: "number", admin: { readOnly: true } },
    { name: "reposUpserted", type: "number", admin: { readOnly: true } },
    { name: "error", type: "textarea", admin: { readOnly: true } }
  ]
};
