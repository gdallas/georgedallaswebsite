// Scheduled-publishing helpers shared by the CMS (the internal publish endpoint
// the worker calls) and the publishing worker Lambda that calls it. Pure and
// dependency-free apart from node:crypto so both sides sign/verify identically
// and agree on what "due" means (GDW-035).

import { createHmac, timingSafeEqual as cryptoTimingSafeEqual } from "node:crypto";

// The worker authenticates its publish request with an HMAC over the exact
// request body bytes, keyed by the shared webhook secret. Signing the raw bytes
// (rather than a re-serialised object) avoids any canonicalisation mismatch
// between the two runtimes.
export const publishSignatureHeader = "x-gdw-signature";

// Reject signed requests whose timestamp is too far from now, to limit replay
// of a captured request. Five minutes covers Aurora/CMS cold-start latency.
export const defaultMaxRequestSkewMs = 5 * 60 * 1000;

// Canonical body the worker sends and signs. Stable key order so a given
// request always serialises to identical bytes.
export function serializePublishRequest({ collection, id, requestedAt }) {
  return JSON.stringify({
    collection: String(collection),
    id: String(id),
    requestedAt: Number(requestedAt)
  });
}

export function signPayload(rawBody, secret) {
  if (!secret) {
    throw new Error("A signing secret is required.");
  }
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

// Constant-time comparison of two hex signatures of equal length.
export function verifyPayloadSignature(rawBody, signature, secret) {
  if (!secret || typeof signature !== "string" || signature.length === 0) {
    return false;
  }
  const expected = signPayload(rawBody, secret);
  if (expected.length !== signature.length) {
    return false;
  }
  return cryptoTimingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
}

// Parse + authenticate a publish request body. Returns { ok, request } on
// success or { ok: false, reason } so the route can answer 4xx without leaking
// which check failed.
export function parseSignedPublishRequest(rawBody, signature, secret, options = {}) {
  if (!verifyPayloadSignature(rawBody, signature, secret)) {
    return { ok: false, reason: "invalid_signature" };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, reason: "invalid_body" };
  }

  const collection = typeof parsed.collection === "string" ? parsed.collection : "";
  const id = parsed.id == null ? "" : String(parsed.id);
  const requestedAt = Number(parsed.requestedAt);

  if (!collection || !id || !Number.isFinite(requestedAt)) {
    return { ok: false, reason: "invalid_body" };
  }

  const now = options.now ? new Date(options.now).getTime() : Date.now();
  const maxSkewMs = options.maxSkewMs ?? defaultMaxRequestSkewMs;
  if (Math.abs(now - requestedAt) > maxSkewMs) {
    return { ok: false, reason: "stale_request" };
  }

  return { ok: true, request: { collection, id, requestedAt } };
}

// A scheduled doc is due once its publish time has arrived. This is the single
// definition the worker, the internal endpoint, and the backstop script share.
export function isPublishDue(doc, now = new Date()) {
  if (doc?.status !== "scheduled" || !doc?.publishedAt) {
    return false;
  }
  return new Date(doc.publishedAt).getTime() <= new Date(now).getTime();
}

// EventBridge Scheduler one-shot expression. It expects "at(yyyy-mm-ddThh:mm:ss)"
// in UTC with no timezone suffix and second precision.
export function toScheduleExpression(publishedAt) {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `at(${date.toISOString().replace(/\.\d{3}Z$/, "")})`;
}

// Deterministic schedule name so re-saving a doc updates (not duplicates) its
// one-shot schedule, and deleting the doc can target it. EventBridge schedule
// names allow [a-zA-Z0-9-_.] up to 64 chars.
export function buildScheduleName(prefix, collection, id) {
  const safe = `${collection}-${id}`.replace(/[^a-zA-Z0-9-_.]/g, "_");
  return `${prefix}${safe}`.slice(0, 64);
}
