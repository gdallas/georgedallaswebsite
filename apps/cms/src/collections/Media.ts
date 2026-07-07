import { APIError, type CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { requireContentMutation, requirePublicOrContentReadMedia } from "../access/payloadAccess";
import { validateMediaAltText } from "../validation/content.mjs";
import { createMediaBeforeChangeHook } from "../validation/mediaHooks.mjs";

export const Media: CollectionConfig = {
  slug: "media",
  admin: {
    group: collectionNavGroup("media"),
    description:
      "Images and files, stored in S3 and served through CloudFront. Files up to 4 MB; drag images straight into a post body to upload them.",
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
        description: "What the image shows, for screen readers and search. Required before an image can be marked public."
      },
      validate: validateMediaAltText
    },
    {
      name: "decorative",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Use only for images that convey no content; skips the alt text requirement."
      }
    },
    {
      name: "caption",
      type: "textarea",
      admin: {
        description: "Optional text shown under the image on the public site."
      }
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
      name: "reviewStatus",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Needs alt text", value: "needs_alt_text" },
        { label: "Approved public", value: "public" },
        { label: "Private", value: "private" }
      ],
      admin: {
        position: "sidebar",
        description:
          "Approved public is required before the file can appear on the public site. The importer sets Needs alt text for images awaiting a description."
      }
    },
    {
      // System bookkeeping, kept out of the way of normal editing.
      type: "collapsible",
      label: "Storage and import details",
      admin: {
        initCollapsed: true
      },
      fields: [
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
          defaultValue: false,
          admin: {
            description: "Set by the WordPress importer."
          }
        }
      ]
    }
  ],
  hooks: {
    afterChange: [auditCollectionChanges("media")],
    afterDelete: [auditCollectionDeletes("media")],
    beforeChange: [createMediaBeforeChangeHook({ APIError })]
  },
  upload: {
    bulkUpload: true,
    displayPreview: true,
    filesRequiredOnCreate: true,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "application/pdf"],
    pasteURL: false
  }
};
