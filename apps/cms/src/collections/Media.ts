import type { CollectionConfig } from "payload";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { requireContentMutation, requirePublicOrContentReadMedia } from "../access/payloadAccess";
import { buildMediaStorageKey, validateMediaAltText, validateMediaFileMetadata } from "../validation/content.mjs";

export const Media: CollectionConfig = {
  slug: "media",
  admin: {
    defaultColumns: ["filename", "alt", "reviewStatus", "updatedAt"],
    listSearchableFields: ["alt", "filename", "caption"],
    useAsTitle: "filename"
  },
  access: {
    create: requireContentMutation,
    delete: requireContentMutation,
    read: requirePublicOrContentReadMedia,
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
        description: "S3 object key generated from the configured media prefix and filename.",
        readOnly: true
      }
    },
    {
      name: "importedFromWordPress",
      type: "checkbox",
      defaultValue: false
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
    afterDelete: [auditCollectionDeletes("media")],
    beforeChange: [
      ({ data }) => {
        const validation = validateMediaFileMetadata(data);

        if (validation !== true) {
          throw new Error(validation);
        }

        if (data.filename) {
          data.storageKey = buildMediaStorageKey("uploads", data.prefix, data.filename);
        }

        return data;
      }
    ]
  },
  upload: {
    bulkUpload: true,
    displayPreview: true,
    filesRequiredOnCreate: true,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "application/pdf"],
    pasteURL: false
  }
};
