import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveFirstUserRole } from "./firstUser.mjs";

describe("first user role", () => {
  it("forces the first account to be the owner regardless of the default", () => {
    assert.equal(resolveFirstUserRole({ isFirstUser: true, requestedRole: "read-only" }), "owner");
    assert.equal(resolveFirstUserRole({ isFirstUser: true, requestedRole: undefined }), "owner");
  });

  it("keeps the chosen role for subsequent users", () => {
    assert.equal(resolveFirstUserRole({ isFirstUser: false, requestedRole: "editor" }), "editor");
    assert.equal(resolveFirstUserRole({ isFirstUser: false, requestedRole: undefined }), "read-only");
  });
});
