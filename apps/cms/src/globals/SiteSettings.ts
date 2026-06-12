import type { GlobalConfig } from "payload";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Site settings",
  access: {
    read: requireContentRead,
    update: requireContentMutation
  },
  admin: {
    group: "Content"
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
