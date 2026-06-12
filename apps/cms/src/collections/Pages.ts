import type { CollectionConfig } from "payload";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";
import { publishedAtField, publishingStatusField, visibilityField } from "../fields/publishing";
import { slugField } from "../fields/slug";
import { createPublishingBeforeChangeHook } from "../hooks/publishing";

export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    defaultColumns: ["title", "template", "status", "visibility", "updatedAt"],
    useAsTitle: "title"
  },
  access: {
    create: requireContentMutation,
    delete: requireContentMutation,
    read: requireContentRead,
    update: requireContentMutation
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true
    },
    slugField,
    {
      name: "body",
      type: "richText"
    },
    {
      name: "template",
      type: "select",
      required: true,
      defaultValue: "standard",
      options: [
        { label: "Standard", value: "standard" },
        { label: "About", value: "about" },
        { label: "Contact", value: "contact" },
        { label: "Colophon", value: "colophon" },
        { label: "Start here", value: "start_here" },
        { label: "Resources", value: "resources" },
        { label: "Uses", value: "uses" }
      ]
    },
    publishingStatusField,
    publishedAtField,
    {
      name: "seoTitle",
      type: "text"
    },
    {
      name: "seoDescription",
      type: "textarea"
    },
    {
      name: "showInNav",
      type: "checkbox",
      defaultValue: false
    },
    visibilityField
  ],
  hooks: {
    afterChange: [auditCollectionChanges("pages")],
    afterDelete: [auditCollectionDeletes("pages")],
    beforeChange: [createPublishingBeforeChangeHook()]
  }
};
