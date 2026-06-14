// Pure, testable logic for the WordPress import review queue (GDW-032).
// Shared by the imported-items review hook and the admin dashboard so the
// state machine and the query filters behind the dashboard links stay in sync.

export const reviewStatuses = ["pending", "in_review", "approved"];

export const reviewStatusLabels = {
  pending: "Pending review",
  in_review: "In review",
  approved: "Approved to publish"
};

// Forward-only review workflow: a freshly imported item starts "pending"; it
// must be looked at ("in_review") before it can be "approved" for publication,
// and either later state can be sent back for another pass. Same-status writes
// (e.g. editing an unrelated field) are always allowed.
const allowedReviewTransitions = {
  pending: ["in_review"],
  in_review: ["approved", "pending"],
  approved: ["in_review"]
};

export function isValidReviewTransition(from, to) {
  if (!reviewStatuses.includes(to)) {
    return false;
  }

  // Creating a record (no previous value) may set any valid initial status.
  if (from == null || from === to) {
    return true;
  }

  return (allowedReviewTransitions[from] ?? []).includes(to);
}

export function assertReviewTransition(from, to) {
  if (isValidReviewTransition(from, to)) {
    return;
  }

  const allowed = allowedReviewTransitions[from] ?? [];
  const detail = allowed.length > 0 ? allowed.join(" or ") : "(none)";
  throw new Error(
    `Invalid import review transition: ${from ?? "(new)"} → ${to}. Allowed next states from ${from ?? "(new)"}: ${detail}.`
  );
}

// --- Query filters (payload.find `where`) ---

// Items still needing a human pass: anything not yet approved.
export function awaitingReviewWhere() {
  return { reviewStatus: { not_equals: "approved" } };
}

// Items a human has at least started reviewing.
export function reviewedWhere() {
  return { reviewStatus: { in: ["in_review", "approved"] } };
}

// Items cleaned up and approved — ready for George to publish the linked post.
export function approvedWhere() {
  return { reviewStatus: { equals: "approved" } };
}

export function unresolvedIssuesWhere() {
  return { resolved: { equals: false } };
}

// --- Admin list links ---

// Build an admin collection-list URL with `where[field][operator]=value`
// filters, matching the query syntax Payload's list view reads.
export function collectionListHref(adminRoute, collection, filters = {}) {
  const params = Object.entries(filters)
    .map(([field, [operator, value]]) => `where[${field}][${operator}]=${encodeURIComponent(value)}`)
    .join("&");

  const base = `${adminRoute}/collections/${collection}`;
  return params ? `${base}?${params}` : base;
}

export function needsReviewHref(adminRoute) {
  return collectionListHref(adminRoute, "imported-items", { reviewStatus: ["not_equals", "approved"] });
}

export function readyToPublishHref(adminRoute) {
  return collectionListHref(adminRoute, "imported-items", { reviewStatus: ["equals", "approved"] });
}

export function unresolvedIssuesHref(adminRoute) {
  return collectionListHref(adminRoute, "import-issues", { resolved: ["equals", "false"] });
}

export function issuesByKindHref(adminRoute, kind) {
  return collectionListHref(adminRoute, "import-issues", { kind: ["equals", kind] });
}

export function issuesBySeverityHref(adminRoute, severity) {
  return collectionListHref(adminRoute, "import-issues", { severity: ["equals", severity] });
}
