import type { CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { requireContentMutation, requirePublicOrContentReadListing } from "../access/payloadAccess";
import { listingStatusField, visibilityField } from "../fields/publishing";
import { publishSignalsAfterChange, publishSignalsAfterDelete } from "../hooks/publishSignals";
import { validateOptionalExternalUrl } from "../validation/content.mjs";

export const timelineEntryTypes = [
  { label: "Career", value: "career" },
  { label: "Project", value: "project" },
  { label: "Writing", value: "writing" },
  { label: "Education", value: "education" },
  { label: "Personal", value: "personal" },
  { label: "Site update", value: "site_update" }
];

export const TimelineEntries: CollectionConfig = {
  slug: "timeline-entries",
  labels: { singular: "Timeline entry", plural: "Timeline entries" },
  admin: {
    group: collectionNavGroup("timeline-entries"),
    description: "Milestones drawn as the cedar tree on /timeline.",
    defaultColumns: ["title", "type", "eventDate", "status", "visibility", "sortOrder"],
    listSearchableFields: ["title", "summary", "type"],
    useAsTitle: "title"
  },
  defaultSort: "-eventDate",
  access: {
    create: requireContentMutation,
    delete: requireContentMutation,
    read: requirePublicOrContentReadListing,
    update: requireContentMutation
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "eventDate",
      type: "date",
      required: true,
      admin: { description: "The date used to place this entry on the public timeline." }
    },
    {
      name: "type",
      type: "select",
      required: true,
      defaultValue: "personal",
      options: timelineEntryTypes
    },
    { name: "summary", type: "textarea" },
    { name: "body", type: "richText" },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      admin: { description: "Optional visual for public entries. Use public media with useful alt text." }
    },
    {
      name: "links",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "url", type: "text", required: true, validate: validateOptionalExternalUrl }
      ]
    },
    {
      name: "relatedPosts",
      type: "relationship",
      hasMany: true,
      relationTo: "posts"
    },
    {
      name: "relatedProjects",
      type: "relationship",
      hasMany: true,
      relationTo: "projects"
    },
    listingStatusField,
    {
      name: "sortOrder",
      type: "number",
      required: true,
      defaultValue: 0,
      admin: {
        description: "Optional tie-breaker for entries with the same date. Lower numbers appear first.",
        position: "sidebar"
      }
    },
    visibilityField
  ],
  hooks: {
    afterChange: [
      auditCollectionChanges("timeline-entries"),
      publishSignalsAfterChange("timeline-entries", "listing")
    ],
    afterDelete: [auditCollectionDeletes("timeline-entries"), publishSignalsAfterDelete("timeline-entries", "listing")]
  }
};
