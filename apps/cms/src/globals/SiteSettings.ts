import type { GlobalConfig } from "payload";
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
    group: "Content"
  },
  hooks: {
    afterChange: [publishSignalsGlobalAfterChange("site-settings")]
  },
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
    },
    {
      name: "defaultSeoTitle",
      type: "text",
      required: true,
      defaultValue: "George Dallas"
    },
    {
      name: "defaultDescription",
      type: "textarea",
      required: true
    },
    {
      name: "defaultSocialImage",
      type: "upload",
      relationTo: "media"
    },
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
    },
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
};
