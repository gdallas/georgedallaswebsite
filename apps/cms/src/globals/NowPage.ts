import type { GlobalConfig } from "payload";
import { auditGlobalChanges } from "../audit/auditEvents";
import { requireContentMutation, requireContentRead } from "../access/payloadAccess";
import { listingStatusField } from "../fields/publishing";

export const NowPage: GlobalConfig = {
  slug: "now-page",
  label: "Now page",
  access: {
    read: requireContentRead,
    update: requireContentMutation
  },
  admin: {
    description: "Quick personal status updates for the public /now page.",
    group: "Content"
  },
  fields: [
    {
      name: "currentFocus",
      type: "textarea",
      admin: {
        description: "What you are focused on right now."
      }
    },
    {
      name: "work",
      type: "textarea"
    },
    {
      name: "reading",
      type: "textarea"
    },
    {
      name: "listening",
      type: "textarea"
    },
    {
      name: "watching",
      type: "textarea"
    },
    {
      name: "personal",
      type: "textarea"
    },
    listingStatusField
  ],
  hooks: {
    afterChange: [auditGlobalChanges("now-page")]
  }
};
