import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPreviewToken, verifyPreviewToken } from "./previewToken.mjs";

const secret = "test-session-secret-at-least-16-chars";

describe("preview token", () => {
  it("round-trips a valid token for one document", () => {
    const token = createPreviewToken({ collection: "posts", id: 42 }, secret);
    const result = verifyPreviewToken(token, secret);
    assert.equal(result.valid, true);
    assert.equal(result.collection, "posts");
    assert.equal(result.id, "42");
  });

  it("rejects a token signed with a different secret", () => {
    const token = createPreviewToken({ collection: "posts", id: 1 }, secret);
    const result = verifyPreviewToken(token, "another-secret-at-least-16-chars!");
    assert.equal(result.valid, false);
    assert.equal(result.reason, "bad_signature");
  });

  it("rejects a tampered payload (id swap)", () => {
    const token = createPreviewToken({ collection: "posts", id: 1 }, secret);
    const forged = createPreviewToken({ collection: "posts", id: 999 }, secret).split(".")[0];
    const tampered = `${forged}.${token.split(".")[1]}`;
    assert.equal(verifyPreviewToken(tampered, secret).valid, false);
  });

  it("rejects an expired token", () => {
    const past = Math.floor(Date.now() / 1000) - 10;
    const token = createPreviewToken({ collection: "pages", id: 7, exp: past }, secret);
    const result = verifyPreviewToken(token, secret);
    assert.equal(result.valid, false);
    assert.equal(result.reason, "expired");
  });

  it("honours the configured TTL window", () => {
    const now = 1_000_000_000_000;
    const token = createPreviewToken({ collection: "posts", id: 5, ttlSeconds: 30, now }, secret);
    assert.equal(verifyPreviewToken(token, secret, now + 10_000).valid, true);
    assert.equal(verifyPreviewToken(token, secret, now + 31_000).valid, false);
  });

  it("rejects malformed tokens and missing secrets", () => {
    assert.equal(verifyPreviewToken("not-a-token", secret).reason, "malformed");
    assert.equal(verifyPreviewToken("", secret).reason, "malformed");
    assert.equal(verifyPreviewToken("a.b.c", secret).reason, "bad_signature");
    assert.equal(verifyPreviewToken(createPreviewToken({ collection: "posts", id: 1 }, secret), "").reason, "missing_secret");
  });
});
