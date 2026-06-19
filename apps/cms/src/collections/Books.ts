import type { CollectionConfig } from "payload";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { requireContentMutation, requirePublicOrContentReadListing } from "../access/payloadAccess";
import { listingStatusField, visibilityField } from "../fields/publishing";
import { publishSignalsAfterChange, publishSignalsAfterDelete } from "../hooks/publishSignals";
import { validateOptionalExternalUrl } from "../validation/content.mjs";

export const bookReadingStatuses = [
  { label: "Reading", value: "reading" },
  { label: "Finished", value: "finished" },
  { label: "Paused", value: "paused" },
  { label: "Want to read", value: "want_to_read" },
  { label: "Reference", value: "reference" }
];

export const Books: CollectionConfig = {
  slug: "books",
  admin: {
    defaultColumns: ["title", "author", "readingStatus", "status", "visibility", "sortOrder"],
    listSearchableFields: ["title", "author", "isbn", "notes"],
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
    { name: "title", type: "text", required: true },
    { name: "author", type: "text", required: true },
    {
      name: "isbn",
      type: "text",
      index: true,
      admin: { description: "Optional ISBN; lookup automation arrives in GDW-046." }
    },
    {
      name: "coverImage",
      type: "upload",
      relationTo: "media",
      admin: { description: "Use a public media item with alt text for public books." }
    },
    {
      name: "readingStatus",
      type: "select",
      required: true,
      defaultValue: "want_to_read",
      options: bookReadingStatuses
    },
    {
      name: "rating",
      type: "number",
      min: 0,
      max: 5,
      admin: { description: "Optional personal rating from 0 to 5." }
    },
    { name: "dateStarted", type: "date" },
    { name: "dateFinished", type: "date" },
    {
      name: "notes",
      type: "richText",
      admin: { description: "Public-safe book notes. Keep private notes out of public books." }
    },
    {
      name: "relatedPosts",
      type: "relationship",
      hasMany: true,
      relationTo: "posts"
    },
    {
      name: "externalUrl",
      type: "text",
      validate: validateOptionalExternalUrl,
      admin: { description: "Optional publisher, library, or bookshop link." }
    },
    listingStatusField,
    {
      name: "sortOrder",
      type: "number",
      required: true,
      defaultValue: 0,
      admin: {
        description: "Lower numbers appear first within a reading-status group.",
        position: "sidebar"
      }
    },
    visibilityField
  ],
  hooks: {
    afterChange: [auditCollectionChanges("books"), publishSignalsAfterChange("books", "listing")],
    afterDelete: [auditCollectionDeletes("books"), publishSignalsAfterDelete("books", "listing")]
  }
};
