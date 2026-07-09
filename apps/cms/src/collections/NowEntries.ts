import type { CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
import { allowPublicRead, requireContentMutation } from "../access/payloadAccess";

const snapshot = (name: string): NonNullable<CollectionConfig["fields"]>[number] => ({
  name,
  type: "textarea",
  admin: { readOnly: true }
});

// Archived snapshots of the Now global (George, 2026-07-09). A new entry is
// written automatically each time a *changed* Now is published (see
// hooks/nowHistory.mjs), so /now can show past states. Entries are snapshots of
// already-published public content, so they are world-readable like the Now
// page itself.
export const NowEntries: CollectionConfig = {
  slug: "now-entries",
  defaultSort: "-capturedAt",
  admin: {
    group: collectionNavGroup("now-entries"),
    description:
      "Past versions of the Now page. A new entry is saved automatically each time you publish a changed Now; they appear in the public /now archive.",
    defaultColumns: ["capturedAt", "currentFocus"],
    useAsTitle: "capturedAt"
  },
  access: {
    create: requireContentMutation,
    delete: requireContentMutation,
    read: allowPublicRead,
    update: requireContentMutation
  },
  fields: [
    {
      name: "capturedAt",
      type: "date",
      required: true,
      admin: { date: { pickerAppearance: "dayAndTime" }, readOnly: true }
    },
    snapshot("currentFocus"),
    snapshot("work"),
    snapshot("reading"),
    snapshot("listening"),
    snapshot("watching"),
    snapshot("personal")
  ]
};
