import type { CollectionConfig } from "payload";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";
import { validateRedirectDestination, validateRedirectSource } from "../validation/content.mjs";

export const Redirects: CollectionConfig = {
  slug: "redirects",
  admin: {
    defaultColumns: ["sourcePath", "destination", "statusCode", "enabled", "updatedAt"],
    useAsTitle: "sourcePath"
  },
  access: {
    create: requireContentMutation,
    delete: requireContentMutation,
    read: requireContentRead,
    update: requireContentMutation
  },
  fields: [
    {
      name: "sourcePath",
      type: "text",
      required: true,
      unique: true,
      validate: validateRedirectSource
    },
    {
      name: "destination",
      type: "text",
      required: true,
      validate: validateRedirectDestination
    },
    {
      name: "statusCode",
      type: "select",
      required: true,
      defaultValue: "301",
      options: [
        { label: "301 permanent", value: "301" },
        { label: "302 temporary", value: "302" },
        { label: "307 temporary, preserve method", value: "307" },
        { label: "308 permanent, preserve method", value: "308" }
      ]
    },
    {
      name: "enabled",
      type: "checkbox",
      defaultValue: true
    },
    {
      name: "notes",
      type: "textarea"
    }
  ],
  hooks: {
    afterChange: [auditCollectionChanges("redirects")],
    afterDelete: [auditCollectionDeletes("redirects")]
  }
};
