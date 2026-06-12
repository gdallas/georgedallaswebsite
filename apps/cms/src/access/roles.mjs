export const CMS_ROLES = ["owner", "editor", "read-only", "api"];

export function getUserRole(user) {
  return typeof user?.role === "string" && CMS_ROLES.includes(user.role) ? user.role : undefined;
}

export function isAuthenticated(user) {
  return Boolean(user);
}

export function hasRole(user, role) {
  return getUserRole(user) === role;
}

export function hasAnyRole(user, roles) {
  const role = getUserRole(user);
  return Boolean(role && roles.includes(role));
}

export function isOwner(user) {
  return hasRole(user, "owner");
}

export function canAccessAdmin(user) {
  return hasAnyRole(user, ["owner", "editor", "read-only"]);
}

export function canReadContent(user) {
  return hasAnyRole(user, ["owner", "editor", "read-only", "api"]);
}

export function canMutateContent(user) {
  return hasAnyRole(user, ["owner", "editor"]);
}

export function canManageUsers(user) {
  return isOwner(user);
}

export function canReadAuditLog(user) {
  return isOwner(user);
}

export function ownUserWhere(user) {
  if (!user?.id) {
    return false;
  }

  return {
    id: {
      equals: user.id
    }
  };
}
