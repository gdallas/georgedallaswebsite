import type { Access, Where } from "payload";
import { publicBuildWhere, publicListingWhere } from "@georgedallas/shared/visibility";
import { redirectActiveWhere } from "@georgedallas/shared/redirects";
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

// Public-facing reads: authenticated CMS roles see everything; anonymous
// callers (the public site build) are constrained to published, public
// content via a query filter. This is the data-level half of the public
// visibility guarantee; the origin-verify header is the network-level half.
export const requirePublicOrContentReadBuild: Access = ({ req }) => {
  if (canReadContent(req.user)) {
    return true;
  }

  return publicBuildWhere() as unknown as Where;
};

export const requirePublicOrContentReadListing: Access = ({ req }) => {
  if (canReadContent(req.user)) {
    return true;
  }

  return publicListingWhere() as unknown as Where;
};

export const requirePublicOrContentReadMedia: Access = ({ req }) => {
  if (canReadContent(req.user)) {
    return true;
  }

  return { reviewStatus: { equals: "public" } } as unknown as Where;
};

// Open read for non-sensitive public data with no draft/visibility concept:
// site settings, public taxonomy (tags, categories), and the Now global. The
// Now global additionally strips its content for anonymous callers until it is
// published via an afterRead hook (see globals/NowPage.ts).
export const allowPublicRead: Access = () => true;

// Redirects are admin-managed, but the anonymous public-site build needs to
// read the *active* ones to emit them as static redirect pages. Authenticated
// roles see all; anonymous callers are filtered to active + enabled redirects
// (proposed/disabled ones stay private). Active redirects only carry a source
// path and destination — no draft/private content is exposed.
export const requirePublicOrContentReadActiveRedirects: Access = ({ req }) => {
  if (canReadContent(req.user)) {
    return true;
  }

  return redirectActiveWhere() as unknown as Where;
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
