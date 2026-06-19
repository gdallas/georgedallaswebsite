import type { CollectionConfig } from "payload";
import { requireContentMutation, requireContentRead, denyAccess } from "../access/payloadAccess";

export const ContactMessages: CollectionConfig = {
  slug: "contact-messages",
  labels: { singular: "Contact message", plural: "Contact messages" },
  admin: {
    group: "Inbox",
    defaultColumns: ["name", "email", "subject", "status", "spamStatus", "createdAt"],
    listSearchableFields: ["name", "email", "subject", "message", "notes"],
    useAsTitle: "subject"
  },
  access: {
    create: denyAccess,
    read: requireContentRead,
    update: requireContentMutation,
    delete: requireContentMutation
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (!data.submittedAt) {
          data.submittedAt = originalDoc?.submittedAt ?? new Date().toISOString();
        }

        if (data.status === "replied" && originalDoc?.status !== "replied" && !data.repliedAt) {
          data.repliedAt = new Date().toISOString();
        } else if (data.status !== "replied") {
          data.repliedAt = null;
        }

        return data;
      }
    ]
  },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "email", type: "email", required: true, index: true },
    { name: "subject", type: "text", required: true },
    { name: "message", type: "textarea", required: true },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "new",
      options: [
        { label: "New", value: "new" },
        { label: "Read", value: "read" },
        { label: "Replied", value: "replied" },
        { label: "Archived", value: "archived" }
      ]
    },
    {
      name: "spamStatus",
      type: "select",
      required: true,
      defaultValue: "clean",
      admin: { description: "Set by the public submit endpoint using basic abuse checks." },
      options: [
        { label: "Clean", value: "clean" },
        { label: "Suspected", value: "suspected" },
        { label: "Spam", value: "spam" }
      ]
    },
    { name: "submittedAt", type: "date", admin: { readOnly: true } },
    { name: "repliedAt", type: "date", admin: { readOnly: true } },
    {
      name: "source",
      type: "select",
      required: true,
      defaultValue: "public_form",
      options: [{ label: "Public form", value: "public_form" }]
    },
    { name: "ipHash", type: "text", admin: { readOnly: true, description: "One-way hash for abuse triage; raw IPs are not stored." } },
    { name: "userAgent", type: "textarea", admin: { readOnly: true } },
    { name: "referrer", type: "text", admin: { readOnly: true } },
    { name: "notes", type: "textarea", admin: { description: "Private triage notes." } }
  ]
};
