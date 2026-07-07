import type { CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { allowPublicRead, requireContentMutation } from "../access/payloadAccess";
import { slugField } from "../fields/slug";

export const Tags: CollectionConfig = {
  slug: "tags",
  admin: {
    group: collectionNavGroup("tags"),
    description: "Topic labels for posts — they also colour the tag chips on the public site.",
    defaultColumns: ["name", "slug", "updatedAt"],
    useAsTitle: "name"
  },
  access: {
    create: requireContentMutation,
    delete: requireContentMutation,
    read: allowPublicRead,
    update: requireContentMutation
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      unique: true
    },
    slugField
  ],
  hooks: {
    afterChange: [auditCollectionChanges("tags")],
    afterDelete: [auditCollectionDeletes("tags")]
  }
};
