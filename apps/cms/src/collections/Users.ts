import type { CollectionConfig } from "payload";
import { collectionNavGroup } from "../admin/navigation.mjs";
import {
  auditAuthErrors,
  auditAuthRefresh,
  auditLogout,
  auditSuccessfulLogin,
  auditUserChanges,
  auditUserDeletes
} from "../audit/auditEvents";
import { readUsers, requireAdminAccess, requireOwner } from "../access/payloadAccess";
import { ensureFirstUserIsOwner } from "../hooks/users";

type UsersOptions = {
  secureCookies: boolean;
};

export function createUsersCollection({ secureCookies }: UsersOptions): CollectionConfig {
  return {
    slug: "users",
    auth: {
      cookies: {
        sameSite: "Lax",
        secure: secureCookies
      },
      lockTime: 15 * 60 * 1000,
      maxLoginAttempts: 5,
      removeTokenFromResponses: true,
      tokenExpiration: 2 * 60 * 60,
      useAPIKey: true,
      useSessions: true
    },
    admin: {
      group: collectionNavGroup("users"),
      description: "CMS accounts and their roles.",
      defaultColumns: ["email", "role", "updatedAt"],
      useAsTitle: "email"
    },
    access: {
      admin: requireAdminAccess,
      create: requireOwner,
      delete: requireOwner,
      read: readUsers,
      update: requireOwner
    },
    fields: [
      {
        name: "role",
        type: "select",
        required: true,
        defaultValue: "read-only",
        options: [
          { label: "Owner", value: "owner" },
          { label: "Editor", value: "editor" },
          { label: "Read-only", value: "read-only" },
          { label: "API", value: "api" }
        ]
      }
    ],
    hooks: {
      afterChange: [auditUserChanges],
      afterDelete: [auditUserDeletes],
      afterError: [auditAuthErrors],
      afterLogin: [auditSuccessfulLogin],
      afterLogout: [auditLogout],
      afterRefresh: [auditAuthRefresh],
      beforeChange: [ensureFirstUserIsOwner]
    }
  };
};
