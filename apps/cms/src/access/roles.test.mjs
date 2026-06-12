import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessAdmin,
  canManageUsers,
  canMutateContent,
  canReadContent,
  ownUserWhere
} from "./roles.mjs";

describe("CMS role access", () => {
  it("allows editors to manage content but not users", () => {
    const editor = { id: "editor-1", role: "editor" };

    assert.equal(canAccessAdmin(editor), true);
    assert.equal(canReadContent(editor), true);
    assert.equal(canMutateContent(editor), true);
    assert.equal(canManageUsers(editor), false);
  });

  it("denies content mutation for read-only users", () => {
    const readOnly = { id: "reader-1", role: "read-only" };

    assert.equal(canAccessAdmin(readOnly), true);
    assert.equal(canReadContent(readOnly), true);
    assert.equal(canMutateContent(readOnly), false);
    assert.equal(canManageUsers(readOnly), false);
  });

  it("limits self-service user reads to the current user id", () => {
    assert.deepEqual(ownUserWhere({ id: "user-1", role: "editor" }), {
      id: {
        equals: "user-1"
      }
    });
  });
});
