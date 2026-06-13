import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOriginRequestAllowed } from "./originVerify.mjs";

describe("origin verification", () => {
  it("allows everything when no secret is configured (local dev)", () => {
    assert.equal(isOriginRequestAllowed({ secret: undefined, headerValue: undefined, pathname: "/admin" }), true);
  });

  it("allows requests carrying the matching header", () => {
    assert.equal(isOriginRequestAllowed({ secret: "cdn-secret", headerValue: "cdn-secret", pathname: "/admin" }), true);
  });

  it("rejects requests without or with a wrong header", () => {
    assert.equal(isOriginRequestAllowed({ secret: "cdn-secret", headerValue: undefined, pathname: "/admin" }), false);
    assert.equal(isOriginRequestAllowed({ secret: "cdn-secret", headerValue: "wrong", pathname: "/admin" }), false);
    assert.equal(isOriginRequestAllowed({ secret: "cdn-secret", headerValue: "cdn-secreT", pathname: "/admin" }), false);
  });

  it("keeps the health endpoint open for container readiness probes", () => {
    assert.equal(isOriginRequestAllowed({ secret: "cdn-secret", headerValue: undefined, pathname: "/api/health" }), true);
  });
});
