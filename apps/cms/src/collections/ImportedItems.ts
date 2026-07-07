import type { CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";
import { assertReviewTransition } from "../dashboard/importReview.mjs";

// One record per source WordPress post. Keyed by the original WordPress id so a
// run is idempotent (skip already-imported) and resumable (retry failed items).
export const ImportedItems: CollectionConfig = {
  slug: "imported-items",
  labels: { singular: "Imported item", plural: "Imported items" },
  admin: {
    group: collectionNavGroup("imported-items"),
    description: "Tracking rows linking WordPress originals to CMS posts.",
    defaultColumns: ["wordpressId", "title", "status", "reviewStatus", "post", "updatedAt"],
    useAsTitle: "title"
  },
  hooks: {
    // Enforce the GDW-032 review workflow: a post must be reviewed before it
    // can be approved for publication. Only guard when the field is changing.
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data.reviewStatus !== undefined) {
          assertReviewTransition(originalDoc?.reviewStatus ?? null, data.reviewStatus);
        }

        return data;
      }
    ]
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
    {
      name: "reviewStatus",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending review", value: "pending" },
        { label: "In review", value: "in_review" },
        { label: "Approved to publish", value: "approved" }
      ],
      admin: {
        position: "sidebar",
        description: "Where this imported post sits in the cleanup workflow. Approve only after issues are resolved, then publish the linked post."
      }
    },
    { name: "reviewNotes", type: "textarea", admin: { description: "Notes for the human reviewing this import." } },
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
