import type { CollectionConfig } from "payload";
import { denyAccess, readAuditLog, requireOwnerAdmin } from "../access/payloadAccess";

export const AuditEvents: CollectionConfig = {
  slug: "audit-events",
  admin: {
    defaultColumns: ["action", "collection", "documentId", "actorEmail", "createdAt"],
    useAsTitle: "action"
  },
  access: {
    admin: requireOwnerAdmin,
    create: denyAccess,
    delete: denyAccess,
    read: readAuditLog,
    update: denyAccess
  },
  fields: [
    {
      name: "action",
      type: "select",
      required: true,
      options: [
        { label: "Login succeeded", value: "login_succeeded" },
        { label: "Login failed", value: "login_failed" },
        { label: "Logout", value: "logout" },
        { label: "Auth refresh", value: "auth_refresh" },
        { label: "User created", value: "user_created" },
        { label: "User updated", value: "user_updated" },
        { label: "User deleted", value: "user_deleted" },
        { label: "Content created", value: "content_created" },
        { label: "Content updated", value: "content_updated" },
        { label: "Content published", value: "content_published" },
        { label: "Content deleted", value: "content_deleted" },
        { label: "Security event", value: "security_event" }
      ]
    },
    {
      name: "collection",
      type: "text"
    },
    {
      name: "documentId",
      type: "text"
    },
    {
      name: "actor",
      type: "relationship",
      relationTo: "users"
    },
    {
      name: "actorEmail",
      type: "email"
    },
    {
      name: "severity",
      type: "select",
      required: true,
      defaultValue: "info",
      options: [
        { label: "Info", value: "info" },
        { label: "Warning", value: "warning" },
        { label: "Critical", value: "critical" }
      ]
    },
    {
      name: "metadata",
      type: "json"
    }
  ]
};
