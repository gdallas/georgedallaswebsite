import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { isPublishDue, parseSignedPublishRequest, publishSignatureHeader } from "@georgedallas/shared/scheduling";
import config from "../../../../../payload.config";
import { loadCmsConfig } from "../../../../../env";
import { recordAuditEvent } from "../../../../../audit/auditEvents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Internal endpoint the publishing worker calls when a one-shot EventBridge
// schedule fires. It authenticates with an HMAC over the request body (keyed by
// the shared webhook secret) — defence in depth on top of the CloudFront
// x-origin-verify check the middleware already enforces. It then flips a due
// scheduled doc to published; the collection afterChange hook handles auditing
// ("content_published") and the rebuild signal. Idempotent: anything not still
// due returns 200 with a skip reason so retries and double-fires are safe.
const publishableCollections = new Set(["posts", "pages"]);

export async function POST(request: Request): Promise<Response> {
  const cmsConfig = loadCmsConfig();
  const secret = cmsConfig.webhookSecret;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "publishing is not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get(publishSignatureHeader) ?? undefined;
  const parsed = parseSignedPublishRequest(rawBody, signature, secret);
  if (!parsed.ok) {
    const status = parsed.reason === "invalid_signature" ? 401 : 400;
    return NextResponse.json({ ok: false, error: parsed.reason }, { status });
  }

  const { collection, id } = parsed.request;
  if (!publishableCollections.has(collection)) {
    return NextResponse.json({ ok: false, error: "unsupported collection" }, { status: 400 });
  }

  const payload = await getPayload({ config });

  let doc;
  try {
    doc = await payload.findByID({ collection: collection as never, id, depth: 0, overrideAccess: true });
  } catch {
    doc = null;
  }

  if (!doc) {
    return NextResponse.json({ ok: true, status: "skipped", reason: "not_found" });
  }

  if (!isPublishDue(doc as { status?: string | null; publishedAt?: string | null })) {
    // Rescheduled, already published, or reverted to draft since the schedule
    // was created — nothing to do.
    return NextResponse.json({ ok: true, status: "skipped", reason: "not_due" });
  }

  try {
    await payload.update({
      collection: collection as never,
      id,
      data: { status: "published" },
      overrideAccess: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    payload.logger.error({ err: error, collection, id }, "Scheduled publish failed");
    await recordAuditEvent({ payload } as never, {
      action: "security_event",
      severity: "warning",
      collection,
      documentId: id,
      metadata: { event: "scheduled_publish_failed", error: message }
    });
    return NextResponse.json({ ok: false, error: "publish_failed", detail: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "published", collection, id });
}
