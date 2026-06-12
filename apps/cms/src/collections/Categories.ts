import type { CollectionConfig } from "payload";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";
import { slugField } from "../fields/slug";

export const Categories: CollectionConfig = {
  slug: "categories",
  admin: {
    defaultColumns: ["name", "slug", "updatedAt"],
    useAsTitle: "name"
  },
  access: {
    create: requireContentMutation,
    delete: requireContentMutation,
    read: requireContentRead,
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
