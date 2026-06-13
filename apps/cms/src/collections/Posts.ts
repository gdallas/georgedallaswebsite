import type { CollectionConfig } from "payload";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { requireContentMutation, requirePublicOrContentReadBuild } from "../access/payloadAccess";
import { publishedAtField, publishingStatusField, visibilityField } from "../fields/publishing";
import { slugField } from "../fields/slug";
import { createPublishingBeforeChangeHook } from "../hooks/publishing";

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    defaultColumns: ["title", "status", "visibility", "publishedAt", "updatedAt"],
    useAsTitle: "title"
  },
  access: {
    create: requireContentMutation,
    delete: requireContentMutation,
    read: requirePublicOrContentReadBuild,
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
      name: "excerpt",
      type: "textarea"
    },
    {
      name: "body",
      type: "richText"
    },
    publishingStatusField,
    publishedAtField,
    {
      name: "author",
      type: "relationship",
      relationTo: "users"
    },
    {
      name: "tags",
      type: "relationship",
      hasMany: true,
      relationTo: "tags"
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "categories"
    },
    {
      name: "featuredImage",
      type: "upload",
      relationTo: "media"
    },
    {
      name: "seoTitle",
      type: "text"
    },
    {
      name: "seoDescription",
      type: "textarea"
    },
    {
      name: "socialImage",
      type: "upload",
      relationTo: "media"
    },
    {
      name: "canonicalUrl",
      type: "text"
    },
    {
      name: "wordpressOriginalId",
      type: "text",
      admin: {
        position: "sidebar"
      }
    },
    {
      name: "wordpressOriginalUrl",
      type: "text",
      admin: {
        position: "sidebar"
      }
    },
    {
      name: "redirectFrom",
      type: "relationship",
      hasMany: true,
      relationTo: "redirects"
    },
    {
      name: "readingTime",
      type: "number",
      admin: {
        description: "Estimated minutes, recalculated when content changes.",
        readOnly: true
      }
    },
    visibilityField,
    {
      name: "relatedPosts",
      type: "relationship",
      hasMany: true,
      relationTo: "posts"
    }
  ],
  hooks: {
    afterChange: [auditCollectionChanges("posts")],
    afterDelete: [auditCollectionDeletes("posts")],
    beforeChange: [
      createPublishingBeforeChangeHook({
        computeReadingTime: true,
        requiredMetadata: ["excerpt", "seoTitle", "seoDescription"]
      })
    ]
  }
};
