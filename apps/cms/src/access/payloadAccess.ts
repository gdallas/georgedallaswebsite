import type { Access } from "payload";
import {
  canAccessAdmin,
  canManageUsers,
  canReadAuditLog,
  canReadContent,
  canMutateContent,
  isOwner,
  ownUserWhere
} from "./roles.mjs";

export const requireAdminAccess = ({ req }: Parameters<NonNullable<Access>>[0]): boolean => {
  return canAccessAdmin(req.user);
};

export const requireContentRead: Access = ({ req }) => {
  return canReadContent(req.user);
};

export const requireContentMutation: Access = ({ req }) => {
  return canMutateContent(req.user);
};

export const requireOwner: Access = ({ req }) => {
  return canManageUsers(req.user);
};

export const requireOwnerAdmin = ({ req }: Parameters<NonNullable<Access>>[0]): boolean => {
  return isOwner(req.user);
};

export const readUsers: Access = ({ req }) => {
  if (canManageUsers(req.user)) {
    return true;
  }

  return ownUserWhere(req.user);
};

export const readAuditLog: Access = ({ req }) => {
  return canReadAuditLog(req.user);
};

export const denyAccess: Access = () => false;
