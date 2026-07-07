import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMediaBeforeChangeHook } from "./mediaHooks.mjs";

// Stub matching Payload's APIError constructor shape so the tests can assert
// the status and visibility the real class would carry.
class FakeAPIError extends Error {
  constructor(message, status, data, isPublic) {
    super(message);
    this.status = status;
    this.data = data;
    this.isPublic = isPublic;
  }
}

const hook = createMediaBeforeChangeHook({ APIError: FakeAPIError });

describe("media beforeChange hook", () => {
  it("rejects invalid files with a public 400, never a raw 500", () => {
    const oversized = { filesize: 5 * 1024 * 1024, mimeType: "image/png" };
    const wrongType = { filesize: 1024, mimeType: "text/html" };

    for (const data of [oversized, wrongType]) {
      let thrown;
      try {
        hook({ data, operation: "create" });
      } catch (error) {
        thrown = error;
      }

      assert.ok(thrown instanceof FakeAPIError, "expected an APIError, got a plain throw");
      assert.equal(thrown.status, 400);
      assert.equal(thrown.isPublic, true, "message must be visible to the admin UI");
    }
  });

  it("names the actual problem in the rejection message", () => {
    assert.throws(
      () => hook({ data: { filesize: 5 * 1024 * 1024, mimeType: "image/png" }, operation: "create" }),
      /4 MB upload limit/
    );
    assert.throws(
      () => hook({ data: { filesize: 10, mimeType: "text/html" }, operation: "create" }),
      /file type is not allowed/
    );
  });

  it("derives the storage key and queues altless images on create", () => {
    const data = { filename: "cedar.png", filesize: 1024, mimeType: "image/png" };
    const result = hook({ data, operation: "create" });

    assert.equal(result.storageKey, "uploads/cedar.png");
    assert.equal(result.reviewStatus, "needs_alt_text");
  });

  it("does not rewrite the review status on update", () => {
    const data = { filename: "cedar.png", filesize: 1024, mimeType: "image/png", reviewStatus: "draft" };
    const result = hook({ data, operation: "update" });

    assert.equal(result.reviewStatus, "draft");
  });
});
