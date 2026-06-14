import { createHmac, timingSafeEqual } from "node:crypto";

// Signed, expiring tokens that authorise rendering a single draft document via
// the CMS preview route (GDW-034). A token is `<payload>.<sig>` where payload
// is base64url(JSON{ collection, id, exp }) and sig is an HMAC-SHA256 of the
// payload keyed by the server session secret. Tokens cannot be forged without
// the secret, are scoped to one document, and expire — so a leaked preview
// link stops working and can never reach arbitrary content.

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

function base64url(buffer) {
  return Buffer.from(buffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(payloadB64, secret) {
  return base64url(createHmac("sha256", secret).update(payloadB64).digest());
}

export function createPreviewToken({ collection, id, exp, ttlSeconds, now }, secret) {
  if (!secret) {
    throw new Error("A secret is required to sign preview tokens.");
  }
  if (!collection || id == null) {
    throw new Error("collection and id are required to sign a preview token.");
  }
  const nowSeconds = Math.floor((now ?? Date.now()) / 1000);
  const expiry = exp ?? nowSeconds + (ttlSeconds ?? DEFAULT_TTL_SECONDS);
  const payloadB64 = base64url(JSON.stringify({ collection: String(collection), id: String(id), exp: expiry }));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

// Returns { valid: true, collection, id, exp } or { valid: false, reason }.
export function verifyPreviewToken(token, secret, now) {
  if (!secret) {
    return { valid: false, reason: "missing_secret" };
  }
  if (typeof token !== "string" || !token.includes(".")) {
    return { valid: false, reason: "malformed" };
  }

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) {
    return { valid: false, reason: "malformed" };
  }

  const expectedSig = sign(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "bad_signature" };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return { valid: false, reason: "malformed" };
  }

  if (!payload || typeof payload.collection !== "string" || typeof payload.id !== "string") {
    return { valid: false, reason: "malformed" };
  }

  const nowSeconds = Math.floor((now ?? Date.now()) / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, collection: payload.collection, id: payload.id, exp: payload.exp };
}
