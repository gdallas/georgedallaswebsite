export const publishSignatureHeader: string;
export const defaultMaxRequestSkewMs: number;

export type PublishRequest = {
  collection: string;
  id: string;
  requestedAt: number;
};

export type SignedPublishParse =
  | { ok: true; request: PublishRequest }
  | { ok: false; reason: "invalid_signature" | "invalid_body" | "stale_request" };

export type SchedulingDoc = {
  status?: string | null;
  publishedAt?: string | null;
};

export function serializePublishRequest(request: {
  collection: string;
  id: string | number;
  requestedAt: number;
}): string;
export function signPayload(rawBody: string, secret: string): string;
export function verifyPayloadSignature(rawBody: string, signature: string | undefined, secret: string | undefined): boolean;
export function parseSignedPublishRequest(
  rawBody: string,
  signature: string | undefined,
  secret: string | undefined,
  options?: { now?: Date | string | number; maxSkewMs?: number }
): SignedPublishParse;
export function isPublishDue(doc: SchedulingDoc, now?: Date | string): boolean;
export function toScheduleExpression(publishedAt: string | Date): string | null;
export function buildScheduleName(prefix: string, collection: string, id: string | number): string;
