import type { CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";
import { createPromoteRepoToProjectHook } from "../hooks/promoteRepoToProject.mjs";

// Synced GitHub repositories (GDW-045). Populated by the scheduled sync (a
// GitHub Action → the internal sync endpoint); never public — it's George's
// review surface. Tick "Promote to project" to spin up a draft Project seeded
// from the repo (which he then edits and publishes). Admin-only read.
const readOnlyText = (name: string): NonNullable<CollectionConfig["fields"]>[number] => ({
  name,
  type: "text",
  admin: { readOnly: true }
});

export const GithubRepos: CollectionConfig = {
  slug: "github-repos",
  defaultSort: "-pushedAt",
  admin: {
    group: collectionNavGroup("github-repos"),
    description: "Repositories synced from GitHub. Tick “Promote to project” to seed a draft project from one.",
    defaultColumns: ["name", "language", "stars", "pushedAt", "promoteToProject", "project"],
    listSearchableFields: ["name", "fullName", "description"],
    useAsTitle: "fullName"
  },
  access: {
    create: requireContentMutation,
    delete: requireContentMutation,
    read: requireContentRead,
    update: requireContentMutation
  },
  fields: [
    { name: "githubId", type: "number", required: true, unique: true, index: true, admin: { readOnly: true } },
    readOnlyText("name"),
    readOnlyText("fullName"),
    { name: "description", type: "textarea", admin: { readOnly: true } },
    readOnlyText("url"),
    readOnlyText("homepage"),
    { name: "stars", type: "number", admin: { readOnly: true } },
    { name: "forks", type: "number", admin: { readOnly: true } },
    readOnlyText("language"),
    { name: "topics", type: "json", admin: { readOnly: true } },
    { name: "pushedAt", type: "date", admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } } },
    { name: "isArchived", type: "checkbox", admin: { readOnly: true } },
    { name: "isFork", type: "checkbox", admin: { readOnly: true } },
    { name: "lastSyncedAt", type: "date", admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } } },
    {
      name: "promoteToProject",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Tick to create a draft project from this repo. The project stays private until you publish it."
      }
    },
    {
      name: "project",
      type: "relationship",
      relationTo: "projects",
      admin: { readOnly: true, description: "The project seeded from this repo, once promoted." }
    }
  ],
  hooks: {
    afterChange: [createPromoteRepoToProjectHook()]
  }
};
