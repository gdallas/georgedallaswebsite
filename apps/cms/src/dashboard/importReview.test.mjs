import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  approvedWhere,
  assertReviewTransition,
  awaitingReviewWhere,
  collectionListHref,
  isValidReviewTransition,
  issuesByKindHref,
  needsReviewHref,
  readyToPublishHref,
  reviewedWhere,
  reviewStatuses,
  unresolvedIssuesHref,
  unresolvedIssuesWhere
} from "./importReview.mjs";

describe("import review state machine", () => {
  it("exposes the three review states", () => {
    assert.deepEqual(reviewStatuses, ["pending", "in_review", "approved"]);
  });

  it("allows any valid initial status when creating a record", () => {
    for (const status of reviewStatuses) {
      assert.equal(isValidReviewTransition(null, status), true);
      assert.equal(isValidReviewTransition(undefined, status), true);
    }
  });

  it("requires an item to be reviewed before it can be approved", () => {
    assert.equal(isValidReviewTransition("pending", "in_review"), true);
    assert.equal(isValidReviewTransition("pending", "approved"), false);
  });

  it("can approve or reopen an item that is in review", () => {
    assert.equal(isValidReviewTransition("in_review", "approved"), true);
    assert.equal(isValidReviewTransition("in_review", "pending"), true);
  });

  it("can reopen an approved item back to review but not straight to pending", () => {
    assert.equal(isValidReviewTransition("approved", "in_review"), true);
    assert.equal(isValidReviewTransition("approved", "pending"), false);
  });

  it("always allows a same-status (no-op) write", () => {
    for (const status of reviewStatuses) {
      assert.equal(isValidReviewTransition(status, status), true);
    }
  });

  it("rejects unknown target statuses", () => {
    assert.equal(isValidReviewTransition("pending", "published"), false);
    assert.equal(isValidReviewTransition(null, "nonsense"), false);
  });

  it("assertReviewTransition throws a descriptive error on an invalid move", () => {
    assert.throws(() => assertReviewTransition("pending", "approved"), /pending → approved/);
    assert.doesNotThrow(() => assertReviewTransition("pending", "in_review"));
  });
});

describe("import review query filters", () => {
  it("treats anything not approved as still awaiting review", () => {
    assert.deepEqual(awaitingReviewWhere(), { reviewStatus: { not_equals: "approved" } });
  });

  it("counts in-review and approved items as reviewed", () => {
    assert.deepEqual(reviewedWhere(), { reviewStatus: { in: ["in_review", "approved"] } });
  });

  it("scopes ready-to-publish to approved items", () => {
    assert.deepEqual(approvedWhere(), { reviewStatus: { equals: "approved" } });
  });

  it("scopes unresolved issues to resolved=false", () => {
    assert.deepEqual(unresolvedIssuesWhere(), { resolved: { equals: false } });
  });
});

describe("import review admin links", () => {
  it("builds a filtered collection list URL", () => {
    assert.equal(
      collectionListHref("/admin", "import-issues", { kind: ["equals", "broken_embed"] }),
      "/admin/collections/import-issues?where[kind][equals]=broken_embed"
    );
  });

  it("returns the bare list URL when no filters are given", () => {
    assert.equal(collectionListHref("/admin", "imported-items"), "/admin/collections/imported-items");
  });

  it("links the needs-review and ready-to-publish queues", () => {
    assert.equal(
      needsReviewHref("/admin"),
      "/admin/collections/imported-items?where[reviewStatus][not_equals]=approved"
    );
    assert.equal(
      readyToPublishHref("/admin"),
      "/admin/collections/imported-items?where[reviewStatus][equals]=approved"
    );
  });

  it("links the unresolved-issue queue and per-kind filters", () => {
    assert.equal(unresolvedIssuesHref("/admin"), "/admin/collections/import-issues?where[resolved][equals]=false");
    assert.equal(
      issuesByKindHref("/admin", "duplicate_slug"),
      "/admin/collections/import-issues?where[kind][equals]=duplicate_slug"
    );
  });
});
