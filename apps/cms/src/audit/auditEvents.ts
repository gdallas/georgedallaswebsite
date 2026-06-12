import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionAfterErrorHook,
  CollectionAfterLoginHook,
  CollectionAfterLogoutHook,
  CollectionAfterRefreshHook,
  GlobalAfterChangeHook,
  PayloadRequest
} from "payload";

type AuditAction =
  | "auth_refresh"
  | "content_created"
  | "content_deleted"
  | "content_published"
  | "content_updated"
  | "login_failed"
  | "login_succeeded"
  | "logout"
  | "security_event"
  | "user_created"
  | "user_deleted"
  | "user_updated";

type AuditEventInput = {
  action: AuditAction;
  actor?: {
    email?: string;
    id?: number | string;
  } | null;
  collection?: string;
  documentId?: number | string;
  metadata?: Record<string, unknown>;
  severity?: "critical" | "info" | "warning";
};

type RequestWithUser = PayloadRequest & {
  user?: {
    email?: string;
    id?: number | string;
  } | null;
};

const skipAuditContext = { skipAudit: true };

export async function recordAuditEvent(req: RequestWithUser, input: AuditEventInput): Promise<void> {
  if (req.context?.skipAudit) {
    return;
  }

  const actor = input.actor ?? req.user;
  const actorId = actor?.id;

  await req.payload.create({
    collection: "audit-events" as never,
    context: skipAuditContext,
    data: {
      action: input.action,
      actor: actorId,
      actorEmail: actor?.email,
      collection: input.collection,
      documentId: input.documentId != null ? String(input.documentId) : undefined,
      metadata: input.metadata,
      severity: input.severity ?? "info"
    },
    overrideAccess: true
  });
}

export function auditCollectionChanges(collectionSlug: string): CollectionAfterChangeHook {
  return async ({ doc, operation, previousDoc, req }) => {
    const wasPublished = previousDoc?.status === "published";
    const isPublished = doc?.status === "published";

    await recordAuditEvent(req, {
      action: operation === "create" ? "content_created" : isPublished && !wasPublished ? "content_published" : "content_updated",
      collection: collectionSlug,
      documentId: doc.id,
      metadata: {
        operation
      }
    });
  };
}

export function auditCollectionDeletes(collectionSlug: string): CollectionAfterDeleteHook {
  return async ({ id, req }) => {
    await recordAuditEvent(req, {
      action: "content_deleted",
      collection: collectionSlug,
      documentId: id
    });
  };
}

export function auditGlobalChanges(globalSlug: string): GlobalAfterChangeHook {
  return async ({ doc, previousDoc, req }) => {
    const wasPublished = previousDoc?.status === "published";
    const isPublished = doc?.status === "published";

    await recordAuditEvent(req, {
      action: isPublished && !wasPublished ? "content_published" : "content_updated",
      collection: globalSlug,
      documentId: doc?.id
    });
  };
}

export const auditUserChanges: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  await recordAuditEvent(req, {
    action: operation === "create" ? "user_created" : "user_updated",
    collection: "users",
    documentId: doc.id,
    metadata: {
      operation,
      role: typeof doc.role === "string" ? doc.role : undefined
    },
    severity: "warning"
  });
};

export const auditUserDeletes: CollectionAfterDeleteHook = async ({ id, req }) => {
  await recordAuditEvent(req, {
    action: "user_deleted",
    collection: "users",
    documentId: id,
    severity: "critical"
  });
};

export const auditSuccessfulLogin: CollectionAfterLoginHook = async ({ req, user }) => {
  await recordAuditEvent(req, {
    action: "login_succeeded",
    actor: user,
    collection: "users",
    documentId: user.id
  });
};

export const auditLogout: CollectionAfterLogoutHook = async ({ req }) => {
  await recordAuditEvent(req, {
    action: "logout",
    collection: "users"
  });
};

export const auditAuthRefresh: CollectionAfterRefreshHook = async ({ req }) => {
  await recordAuditEvent(req, {
    action: "auth_refresh",
    collection: "users"
  });
};

export const auditAuthErrors: CollectionAfterErrorHook = async ({ error, req }) => {
  if (!error.name.toLowerCase().includes("auth")) {
    return;
  }

  await recordAuditEvent(req, {
    action: "login_failed",
    collection: "users",
    metadata: {
      errorName: error.name
    },
    severity: "warning"
  });
};
