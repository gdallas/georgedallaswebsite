import type { GlobalAfterReadHook, GlobalConfig } from "payload";
import { isNowPagePublic } from "@georgedallas/shared/visibility";
import { auditGlobalChanges } from "../audit/auditEvents";
import { publishSignalsGlobalAfterChange } from "../hooks/publishSignals";
import { allowPublicRead, requireContentMutation } from "../access/payloadAccess";
import { canReadContent } from "../access/roles.mjs";
import { listingStatusField } from "../fields/publishing";

const nowContentFields = ["currentFocus", "work", "reading", "listening", "watching", "personal"] as const;

// The Now global is world-readable, so strip its content for anonymous callers
// until it is published. Authenticated CMS roles always see the live draft.
const hideUnpublishedNowFromPublic: GlobalAfterReadHook = ({ doc, req }) => {
  if (canReadContent(req.user) || isNowPagePublic(doc)) {
    return doc;
  }

  const redacted = { ...doc };
  for (const field of nowContentFields) {
    redacted[field] = null;
  }

  return redacted;
};

export const NowPage: GlobalConfig = {
  slug: "now-page",
  label: "Now page",
  access: {
    read: allowPublicRead,
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
    afterChange: [auditGlobalChanges("now-page"), publishSignalsGlobalAfterChange("now-page")],
    afterRead: [hideUnpublishedNowFromPublic]
  }
};
