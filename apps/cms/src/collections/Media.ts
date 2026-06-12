import type { CollectionConfig } from "payload";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";
import { validateMediaAltText } from "../validation/content.mjs";

export const Media: CollectionConfig = {
  slug: "media",
  admin: {
    defaultColumns: ["filename", "alt", "reviewStatus", "updatedAt"],
    useAsTitle: "filename"
  },
  access: {
    create: requireContentMutation,
    delete: requireContentMutation,
    read: requireContentRead,
    update: requireContentMutation
  },
  fields: [
    {
      name: "alt",
      type: "text",
      admin: {
        description: "Required before an image can be marked public."
      },
      validate: validateMediaAltText
    },
    {
      name: "caption",
      type: "textarea"
    },
    {
      name: "credit",
      type: "text"
    },
    {
      name: "source",
      type: "text"
    },
    {
      name: "storageKey",
      type: "text",
      admin: {
        description: "Future S3 object key. GDW-021 wires this to S3-backed storage."
      }
    },
    {
      name: "reviewStatus",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Needs alt text", value: "needs_alt_text" },
        { label: "Approved public", value: "public" },
        { label: "Private", value: "private" }
      ]
    },
    {
      name: "decorative",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Use only for images that convey no content."
      }
    }
  ],
  hooks: {
    afterChange: [auditCollectionChanges("media")],
    afterDelete: [auditCollectionDeletes("media")]
  },
  upload: {
    bulkUpload: true,
    displayPreview: true,
    filesRequiredOnCreate: true,
    mimeTypes: ["image/*", "application/pdf"],
    pasteURL: false,
    staticDir: "media"
  }
};
