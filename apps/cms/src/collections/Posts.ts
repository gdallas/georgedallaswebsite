import type { CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { requireContentMutation, requirePublicOrContentReadBuild } from "../access/payloadAccess";
import { datedPublishingSidebarFields } from "../fields/publishing";
import { slugField } from "../fields/slug";
import { createPublishingBeforeChangeHook } from "../hooks/publishing";
import { publishSignalsAfterChange, publishSignalsAfterDelete } from "../hooks/publishSignals";
import { collectionPreview } from "../preview/collectionPreview";
import { createResolvePastedUploadsHook } from "../validation/richTextUploads.mjs";

export const Posts: CollectionConfig = {
  slug: "posts",
  admin: {
    group: collectionNavGroup("posts"),
    description: "Long-form writing published at /writing.",
    defaultColumns: ["title", "status", "visibility", "publishedAt", "updatedAt"],
    listSearchableFields: ["title", "excerpt", "slug", "seoTitle", "seoDescription"],
    useAsTitle: "title",
    preview: collectionPreview("posts")
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
      required: true,
      admin: {
        // The focus surface strips the field chrome (GDW-060), so the empty
        // input needs the placeholder to stay discoverable.
        placeholder: "Title"
      }
    },
    slugField,
    {
      // Unnamed layout tabs: purely presentation, the data shape stays flat.
      type: "tabs",
      tabs: [
        {
          label: "Compose",
          fields: [
            {
              name: "excerpt",
              type: "textarea",
              admin: {
                description:
                  "Short summary shown in post lists and used as the fallback SEO description. Required before publishing."
              }
            },
            {
              name: "body",
              type: "richText"
            },
            {
              // Focus writing status line + toggle (GDW-060). UI field:
              // renders under the body, stores nothing, no migration.
              name: "writingFocus",
              type: "ui",
              admin: {
                components: {
                  Field: "/components/WritingFocus#WritingFocus"
                }
              }
            },
            {
              name: "featuredImage",
              type: "upload",
              relationTo: "media",
              admin: {
                description: "Lead image for the post and the fallback social preview image."
              }
            },
            {
              name: "tags",
              type: "relationship",
              hasMany: true,
              relationTo: "tags",
              admin: {
                description: "Shown as coloured topic chips on the public site."
              }
            },
            {
              name: "category",
              type: "relationship",
              relationTo: "categories"
            }
          ]
        },
        {
          label: "SEO",
          fields: [
            {
              name: "seoTitle",
              type: "text",
              admin: {
                description:
                  "Title for search results and link previews. The public page falls back to the post title when previews render. Required before publishing."
              }
            },
            {
              name: "seoDescription",
              type: "textarea",
              admin: {
                description: "Description for search results and link previews. Required before publishing."
              }
            },
            {
              name: "seoPreview",
              type: "ui",
              admin: {
                components: {
                  Field: "/components/SeoPreview#SeoPreview"
                }
              }
            },
            {
              name: "socialImage",
              type: "upload",
              relationTo: "media",
              admin: {
                description: "Image for social link previews. Falls back to the featured image."
              }
            }
          ]
        },
        {
          label: "Advanced",
          fields: [
            {
              name: "author",
              type: "relationship",
              relationTo: "users"
            },
            {
              name: "relatedPosts",
              type: "relationship",
              hasMany: true,
              relationTo: "posts"
            },
            {
              name: "canonicalUrl",
              type: "text",
              admin: {
                description: "Only needed when this post originally appeared somewhere else."
              }
            },
            {
              name: "redirectFrom",
              type: "relationship",
              hasMany: true,
              relationTo: "redirects",
              admin: {
                description: "Old URLs that should land on this post. Managed by the WordPress import."
              }
            },
            {
              name: "readingTime",
              type: "number",
              admin: {
                description: "Estimated minutes, recalculated when content changes.",
                readOnly: true
              }
            },
            {
              name: "wordpressOriginalId",
              type: "text",
              admin: {
                description: "Set by the WordPress importer.",
                readOnly: true
              }
            },
            {
              name: "wordpressOriginalUrl",
              type: "text",
              admin: {
                description: "Set by the WordPress importer.",
                readOnly: true
              }
            }
          ]
        }
      ]
    },
    ...datedPublishingSidebarFields
  ],
  versions: {
    maxPerDoc: 25
  },
  hooks: {
    afterChange: [auditCollectionChanges("posts"), publishSignalsAfterChange("posts", "dated")],
    afterDelete: [auditCollectionDeletes("posts"), publishSignalsAfterDelete("posts", "dated")],
    // Runs before field validation so a pasted-image pending node is
    // resolved (or stripped) before the upload field can reject it.
    beforeValidate: [createResolvePastedUploadsHook()],
    beforeChange: [
      createPublishingBeforeChangeHook({
        computeReadingTime: true,
        requiredMetadata: ["excerpt", "seoTitle", "seoDescription"]
      })
    ]
  }
};
