import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildScheduleName,
  defaultMaxRequestSkewMs,
  isPublishDue,
  parseSignedPublishRequest,
  serializePublishRequest,
  signPayload,
  toScheduleExpression,
  verifyPayloadSignature
} from "./scheduling.mjs";

const secret = "test-webhook-secret-0123456789";

describe("publish request signing", () => {
  it("round-trips a signed body", () => {
    const body = serializePublishRequest({ collection: "posts", id: 42, requestedAt: 1700000000000 });
    const signature = signPayload(body, secret);
    assert.equal(verifyPayloadSignature(body, signature, secret), true);
  });

  it("rejects a tampered body", () => {
    const body = serializePublishRequest({ collection: "posts", id: 42, requestedAt: 1700000000000 });
    const signature = signPayload(body, secret);
    const tampered = serializePublishRequest({ collection: "posts", id: 99, requestedAt: 1700000000000 });
    assert.equal(verifyPayloadSignature(tampered, signature, secret), false);
  });

  it("rejects a wrong secret, missing signature, and length mismatch", () => {
    const body = serializePublishRequest({ collection: "pages", id: 1, requestedAt: 1700000000000 });
    const signature = signPayload(body, secret);
    assert.equal(verifyPayloadSignature(body, signature, "other-secret"), false);
    assert.equal(verifyPayloadSignature(body, undefined, secret), false);
    assert.equal(verifyPayloadSignature(body, "abc", secret), false);
  });
});

describe("parseSignedPublishRequest", () => {
  const now = 1700000000000;
  const build = (overrides = {}) => {
    const request = { collection: "posts", id: "42", requestedAt: now, ...overrides };
    const body = serializePublishRequest(request);
    return { body, signature: signPayload(body, secret) };
  };

  it("accepts a fresh, well-formed, signed request", () => {
    const { body, signature } = build();
    const result = parseSignedPublishRequest(body, signature, secret, { now });
    assert.deepEqual(result, { ok: true, request: { collection: "posts", id: "42", requestedAt: now } });
  });

  it("rejects an invalid signature", () => {
    const { body } = build();
    const result = parseSignedPublishRequest(body, "deadbeef", secret, { now });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid_signature");
  });

  it("rejects a stale request beyond the skew window", () => {
    const { body, signature } = build();
    const result = parseSignedPublishRequest(body, signature, secret, {
      now: now + defaultMaxRequestSkewMs + 1000
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "stale_request");
  });

  it("rejects a non-JSON body even when signed", () => {
    const body = "not json";
    const signature = signPayload(body, secret);
    const result = parseSignedPublishRequest(body, signature, secret, { now });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid_body");
  });
});

describe("isPublishDue", () => {
  const now = new Date("2026-06-14T12:00:00.000Z");

  it("is due when scheduled and the publish time has passed", () => {
    assert.equal(isPublishDue({ status: "scheduled", publishedAt: "2026-06-14T11:59:00.000Z" }, now), true);
    assert.equal(isPublishDue({ status: "scheduled", publishedAt: "2026-06-14T12:00:00.000Z" }, now), true);
  });

  it("is not due before the publish time", () => {
    assert.equal(isPublishDue({ status: "scheduled", publishedAt: "2026-06-14T12:01:00.000Z" }, now), false);
  });

  it("is not due for non-scheduled statuses or missing dates", () => {
    assert.equal(isPublishDue({ status: "published", publishedAt: "2026-06-14T11:00:00.000Z" }, now), false);
    assert.equal(isPublishDue({ status: "scheduled", publishedAt: null }, now), false);
    assert.equal(isPublishDue({}, now), false);
  });
});

describe("EventBridge schedule helpers", () => {
  it("formats a one-shot at() expression in UTC without millis", () => {
    assert.equal(toScheduleExpression("2026-06-14T12:30:45.123Z"), "at(2026-06-14T12:30:45)");
    assert.equal(toScheduleExpression("not-a-date"), null);
  });

  it("builds a deterministic, sanitised, length-capped schedule name", () => {
    assert.equal(buildScheduleName("gdw-dev-pub-", "posts", 42), "gdw-dev-pub-posts-42");
    assert.equal(buildScheduleName("p-", "po sts", "a/b"), "p-po_sts-a_b");
    assert.ok(buildScheduleName("prefix-", "posts", "x".repeat(200)).length <= 64);
  });
});
