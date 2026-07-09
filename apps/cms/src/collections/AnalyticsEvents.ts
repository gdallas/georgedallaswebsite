import type { CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
import { denyAccess, requireContentRead } from "../access/payloadAccess";

// Minimal, privacy-friendly page-view events (GDW-048). Written only by the
// public beacon collector (overrideAccess), read only by admins via the
// Analytics view. No IP, no cookies, no identifiers — just path, referrer
// domain, coarse device type, an optional search query, and the timestamp.
// Hidden from the sidebar: George reads the aggregated Analytics view, not raw
// rows, and the collector never touches this through the normal API.
export const AnalyticsEvents: CollectionConfig = {
  slug: "analytics-events",
  defaultSort: "-createdAt",
  admin: {
    group: collectionNavGroup("analytics-events"),
    hidden: true,
    description: "Raw privacy-friendly page-view events. See the Analytics view for insights."
  },
  access: {
    create: denyAccess,
    delete: requireContentRead,
    read: requireContentRead,
    update: denyAccess
  },
  fields: [
    { name: "path", type: "text", required: true, index: true, admin: { readOnly: true } },
    { name: "referrerDomain", type: "text", admin: { readOnly: true } },
    { name: "deviceType", type: "text", admin: { readOnly: true } },
    { name: "query", type: "text", admin: { readOnly: true } }
  ]
};
