import { APIError, type CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import { requireContentMutation, requirePublicOrContentReadBuild } from "../access/payloadAccess";
import { datedPublishingSidebarFields } from "../fields/publishing";
import { slugField } from "../fields/slug";
import { createPublishingBeforeChangeHook } from "../hooks/publishing.mjs";
import { publishSignalsAfterChange, publishSignalsAfterDelete } from "../hooks/publishSignals";
import { collectionPreview } from "../preview/collectionPreview";
import { createResolvePastedUploadsHook } from "../validation/richTextUploads.mjs";

export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    group: collectionNavGroup("pages"),
    description: "Standalone pages such as About, Contact, and Colophon.",
    defaultColumns: ["title", "template", "status", "visibility", "updatedAt"],
    listSearchableFields: ["title", "slug", "seoTitle", "seoDescription"],
    useAsTitle: "title",
    preview: collectionPreview("pages")
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
              name: "body",
              type: "richText"
            },
            {
              // Focus writing status line + toggle (GDW-060); see Posts.
              name: "writingFocus",
              type: "ui",
              admin: {
                components: {
                  Field: "/components/WritingFocus#WritingFocus"
                }
              }
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
              ],
              admin: {
                description: "Which layout the public site renders this page with."
              }
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
                  "Title for search results and link previews. Falls back to the page title. Required before publishing."
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
            }
          ]
        },
        {
          label: "Advanced",
          fields: [
            {
              name: "showInNav",
              type: "checkbox",
              defaultValue: false,
              admin: {
                description: "Marks the page for inclusion in navigation lists."
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
    afterChange: [auditCollectionChanges("pages"), publishSignalsAfterChange("pages", "dated")],
    afterDelete: [auditCollectionDeletes("pages"), publishSignalsAfterDelete("pages", "dated")],
    // See Posts: resolve pasted-image pending nodes before validation.
    beforeValidate: [createResolvePastedUploadsHook()],
    beforeChange: [createPublishingBeforeChangeHook({ APIError })]
  }
};
