import type { CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { allowPublicRead, requireContentMutation } from "../access/payloadAccess";
import { slugField } from "../fields/slug";

export const Categories: CollectionConfig = {
  slug: "categories",
  admin: {
    group: collectionNavGroup("categories"),
    description: "Broad post groupings, mostly from the WordPress import.",
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
    afterChange: [auditCollectionChanges("categories")],
    afterDelete: [auditCollectionDeletes("categories")]
  }
};
