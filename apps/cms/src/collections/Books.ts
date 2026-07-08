import type { CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
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
    group: collectionNavGroup("books"),
    description: "The reading log behind /bookshelf.",
    defaultColumns: ["coverUrl", "title", "author", "readingStatus", "status", "visibility"],
    listSearchableFields: ["title", "author", "isbn", "notes"],
    useAsTitle: "title"
  },
  defaultSort: "-updatedAt",
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
      admin: { description: "Type or paste an ISBN to look up the title, author, and cover below." }
    },
    {
      // Live ISBN lookup helper (GDW-046). UI field: renders under the ISBN,
      // stores nothing, no migration. Runs in the browser (the Lambda has no
      // egress) and only offers suggestions — manual entry is untouched.
      name: "isbnLookup",
      type: "ui",
      admin: {
        components: {
          Field: "/components/IsbnLookupField#IsbnLookupField"
        }
      }
    },
    {
      name: "coverUrl",
      type: "text",
      label: "Cover",
      validate: validateOptionalExternalUrl,
      admin: {
        // Auto-filled by the ISBN lookup (GDW-046 → George feedback 2026-07-08).
        // The bookshelf and the list column show this directly, so a book gets a
        // cover with no upload step. A manually uploaded Cover image still wins.
        description: "Cover image URL, auto-filled by the ISBN lookup. Shown on the bookshelf and in the list.",
        components: {
          Cell: "/components/BookCoverCell#BookCoverCell"
        }
      }
    },
    {
      name: "coverImage",
      type: "upload",
      relationTo: "media",
      admin: { description: "Optional: upload a cover into the media library. Overrides the cover URL above." }
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
      // Retired (George, 2026-07-08): manual ordering is gone — the bookshelf
      // sorts automatically by most-recently-updated within each reading-status
      // group. Kept hidden (not removed) so no column-drop migration is needed;
      // the default 0 keeps every row valid.
      name: "sortOrder",
      type: "number",
      required: true,
      defaultValue: 0,
      admin: {
        hidden: true
      }
    },
    visibilityField
  ],
  hooks: {
    afterChange: [auditCollectionChanges("books"), publishSignalsAfterChange("books", "listing")],
    afterDelete: [auditCollectionDeletes("books"), publishSignalsAfterDelete("books", "listing")]
  }
};
