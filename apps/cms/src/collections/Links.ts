import type { CollectionConfig } from "payload";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { requireContentMutation, requirePublicOrContentReadListing } from "../access/payloadAccess";
import { listingStatusField, visibilityField } from "../fields/publishing";
import { publishSignalsAfterChange, publishSignalsAfterDelete } from "../hooks/publishSignals";
import { validateLinkUrl } from "../validation/content.mjs";

export const Links: CollectionConfig = {
  slug: "links",
  admin: {
    defaultColumns: ["title", "category", "status", "visibility", "featured", "sortOrder"],
    useAsTitle: "title"
  },
  defaultSort: "sortOrder",
  access: {
    create: requireContentMutation,
    delete: requireContentMutation,
    read: requirePublicOrContentReadListing,
    update: requireContentMutation
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true
    },
    {
      name: "url",
      type: "text",
      required: true,
      validate: validateLinkUrl
    },
    {
      name: "description",
      type: "textarea"
    },
    {
      name: "category",
      type: "select",
      required: true,
      defaultValue: "other",
      options: [
        { label: "Social profile", value: "social" },
        { label: "Professional", value: "professional" },
        { label: "Website", value: "website" },
        { label: "Project", value: "project" },
        { label: "Resource", value: "resource" },
        { label: "Other", value: "other" }
      ]
    },
    {
      name: "icon",
      type: "text",
      admin: {
        description: "Optional icon identifier used by the public site."
      }
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false
    },
    listingStatusField,
    {
      name: "sortOrder",
      type: "number",
      required: true,
      defaultValue: 0,
      admin: {
        description: "Lower numbers appear first.",
        position: "sidebar"
      }
    },
    visibilityField
  ],
  versions: {
    maxPerDoc: 25
  },
  hooks: {
    afterChange: [auditCollectionChanges("links"), publishSignalsAfterChange("links", "listing")],
    afterDelete: [auditCollectionDeletes("links"), publishSignalsAfterDelete("links", "listing")]
  }
};
