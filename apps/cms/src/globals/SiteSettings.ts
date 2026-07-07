import type { GlobalConfig } from "payload";
import { globalNavGroup } from "../admin/navigation.mjs";
import { allowPublicRead, requireContentMutation } from "../access/payloadAccess";
import { publishSignalsGlobalAfterChange } from "../hooks/publishSignals";

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Site settings",
  // All fields are public site configuration (title, nav, footer, default SEO),
  // so the global is readable by the public site build.
  access: {
    read: allowPublicRead,
    update: requireContentMutation
  },
  admin: {
    description: "Site-wide identity, default SEO, navigation, and footer.",
    group: globalNavGroup("site-settings")
  },
  hooks: {
    afterChange: [publishSignalsGlobalAfterChange("site-settings")]
  },
  fields: [
    {
      // Unnamed layout tabs: purely presentation, the data shape stays flat.
      type: "tabs",
      tabs: [
        {
          label: "Identity",
          fields: [
            {
              name: "siteTitle",
              type: "text",
              required: true,
              defaultValue: "George Dallas"
            },
            {
              name: "ownerName",
              type: "text",
              required: true,
              defaultValue: "George Dallas"
            }
          ]
        },
        {
          label: "SEO defaults",
          fields: [
            {
              name: "defaultSeoTitle",
              type: "text",
              required: true,
              defaultValue: "George Dallas",
              admin: {
                description: "Used when a page has no SEO title of its own."
              }
            },
            {
              name: "defaultDescription",
              type: "textarea",
              required: true,
              admin: {
                description: "Used when a page has no SEO description of its own."
              }
            },
            {
              name: "defaultSocialImage",
              type: "upload",
              relationTo: "media",
              admin: {
                description: "Fallback image for social link previews."
              }
            }
          ]
        },
        {
          label: "Navigation",
          fields: [
            {
              name: "primaryLinks",
              type: "array",
              fields: [
                {
                  name: "label",
                  type: "text",
                  required: true
                },
                {
                  name: "url",
                  type: "text",
                  required: true
                }
              ]
            },
            {
              name: "navigation",
              type: "array",
              fields: [
                {
                  name: "label",
                  type: "text",
                  required: true
                },
                {
                  name: "path",
                  type: "text",
                  required: true
                },
                {
                  name: "showInHeader",
                  type: "checkbox",
                  defaultValue: true
                },
                {
                  name: "showInFooter",
                  type: "checkbox",
                  defaultValue: true
                }
              ]
            }
          ]
        },
        {
          label: "Footer",
          fields: [
            {
              name: "footerText",
              type: "textarea"
            },
            {
              name: "footerLinks",
              type: "array",
              fields: [
                {
                  name: "label",
                  type: "text",
                  required: true
                },
                {
                  name: "url",
                  type: "text",
                  required: true
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
