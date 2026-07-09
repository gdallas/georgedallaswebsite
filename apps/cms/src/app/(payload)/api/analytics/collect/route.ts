import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "../../../../../payload.config";
import { loadCmsConfig } from "../../../../../env";
import { parseBeacon } from "../../../../../analytics/analytics.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public page-view collector for the first-party beacon (GDW-048). Reached
// through the CMS CloudFront (which injects x-origin-verify, so the middleware
// passes it). Deliberately forgiving: it never trusts the client, stores no IP
// or cookie, and always answers 204 so a bad or throttled beacon is invisible
// to the visitor. A per-instance token bucket caps DB writes from a flood; the
// real edge protection is WAF/CloudFront rate limiting in production.
const MAX_BODY_BYTES = 2048;
const RATE_WINDOW_MS = 1000;
const RATE_MAX = 30;
let windowStart = 0;
let windowCount = 0;

function allowedByRateLimit(now: number): boolean {
  if (now - windowStart > RATE_WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  windowCount += 1;
  return windowCount <= RATE_MAX;
}

function ownHostsFrom(cms: ReturnType<typeof loadCmsConfig>): string[] {
  const hosts: string[] = [];
  for (const url of [cms.publicSiteUrl, cms.cmsPublicUrl]) {
    try {
      hosts.push(new URL(url).hostname.toLowerCase());
    } catch {
      // ignore malformed config URL
    }
  }
  return hosts;
}

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(request: Request): Promise<Response> {
  try {
    if (!allowedByRateLimit(Date.now())) {
      return noContent();
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return noContent();
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return noContent();
    }

    const cms = loadCmsConfig();
    const event = parseBeacon(body as Record<string, unknown>, {
      userAgent: request.headers.get("user-agent") ?? "",
      ownHosts: ownHostsFrom(cms)
    });
    if (!event) {
      return noContent();
    }

    const payload = await getPayload({ config });
    await payload.create({
      collection: "analytics-events" as never,
      data: {
        path: event.path,
        referrerDomain: event.referrerDomain,
        deviceType: event.deviceType,
        query: event.query
      },
      overrideAccess: true
    });
  } catch {
    // Analytics must never affect the visitor or surface an error.
  }
  return noContent();
}
