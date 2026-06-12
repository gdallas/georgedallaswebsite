import type { CollectionConfig } from "payload";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";
import { listingStatusField, visibilityField } from "../fields/publishing";
import { slugField } from "../fields/slug";
import { validateOptionalExternalUrl } from "../validation/content.mjs";

export const Projects: CollectionConfig = {
  slug: "projects",
  admin: {
    defaultColumns: ["title", "status", "visibility", "featured", "sortOrder", "updatedAt"],
    useAsTitle: "title"
  },
  defaultSort: "sortOrder",
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
      name: "summary",
      type: "textarea"
    },
    {
      name: "description",
      type: "richText"
    },
    listingStatusField,
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false
    },
    {
      name: "technologies",
      type: "text",
      hasMany: true
    },
    {
      name: "githubUrl",
      type: "text",
      validate: validateOptionalExternalUrl
    },
    {
      name: "liveUrl",
      type: "text",
      validate: validateOptionalExternalUrl
    },
    {
      name: "caseStudyUrl",
      type: "text",
      validate: validateOptionalExternalUrl
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media"
    },
    {
      name: "startDate",
      type: "date"
    },
    {
      name: "endDate",
      type: "date"
    },
    {
      name: "relatedPosts",
      type: "relationship",
      hasMany: true,
      relationTo: "posts"
    },
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
  hooks: {
    afterChange: [auditCollectionChanges("projects")],
    afterDelete: [auditCollectionDeletes("projects")]
  }
};
