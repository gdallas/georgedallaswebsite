import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "../../../payload.config";
import { loadCmsConfig } from "../../../env";
import {
  classifyContactSubmission,
  contactRedirect,
  hashContactIp,
  isAllowedContactOrigin,
  normalizeContactSubmission,
  validateContactSubmission
} from "../../../contact/submission.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const cmsConfig = loadCmsConfig();
  const acceptsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const redirect = (status: string) => NextResponse.redirect(contactRedirect(cmsConfig.publicSiteUrl, status), 303);

  if (!isAllowedContactOrigin(request.url, request.headers, cmsConfig.publicSiteUrl, cmsConfig.cmsPublicUrl)) {
    return acceptsJson
      ? NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 })
      : redirect("error");
  }

  const body = await readSubmissionBody(request);
  const submission = normalizeContactSubmission(body);
  const errors = validateContactSubmission(submission);
  if (errors.length > 0) {
    return acceptsJson
      ? NextResponse.json({ ok: false, errors }, { status: 400 })
      : redirect("invalid");
  }

  const classification = classifyContactSubmission(submission);
  if (!classification.accept) {
    return acceptsJson ? NextResponse.json({ ok: true, status: "received" }) : redirect("sent");
  }

  const payload = await getPayload({ config });
  const ip = firstHeaderValue(request.headers.get("x-forwarded-for")) ?? request.headers.get("x-real-ip") ?? undefined;

  await payload.create({
    collection: "contact-messages" as never,
    data: {
      name: submission.name,
      email: submission.email,
      subject: submission.subject,
      message: submission.message,
      status: "new",
      spamStatus: classification.spamStatus,
      source: "public_form",
      submittedAt: new Date().toISOString(),
      ipHash: hashContactIp(ip, cmsConfig.sessionSecret),
      userAgent: request.headers.get("user-agent") ?? undefined,
      referrer: request.headers.get("referer") ?? undefined
    },
    overrideAccess: true
  });

  return acceptsJson ? NextResponse.json({ ok: true, status: "received" }) : redirect("sent");
}

async function readSubmissionBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await request.json()) as Record<string, unknown>;
  }

  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || undefined;
}
