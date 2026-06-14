import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPayload } from "payload";
import config from "../../payload.config";
import { loadCmsConfig } from "../../env";
import { verifyPreviewToken } from "../../preview/previewToken.mjs";
import { renderPreviewDocument } from "../../preview/renderPreview.mjs";

// Authenticated draft preview (GDW-034). Served by the CMS (the only SSR
// compute) and gated by a signed, expiring token scoped to one document — the
// public static build never renders drafts. Always noindex; never cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PREVIEWABLE = new Set(["posts", "pages"]);

const noindexHeaders = {
  "X-Robots-Tag": "noindex, nofollow",
  "Cache-Control": "no-store"
};

function deny(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: { ...noindexHeaders, "Content-Type": "text/plain; charset=utf-8" }
  });
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const cms = loadCmsConfig();

  const verified = verifyPreviewToken(token, cms.sessionSecret);
  if (!verified.valid) {
    return deny("This preview link is invalid or has expired.", 403);
  }
  if (!PREVIEWABLE.has(verified.collection)) {
    return deny("Unknown preview collection.", 400);
  }

  const payload = await getPayload({ config });
  const doc = await payload
    .findByID({
      collection: verified.collection as "posts" | "pages",
      id: verified.id,
      depth: 1,
      // The token is the authorization boundary; bypass collection access so a
      // draft/private document can be rendered for its authorised previewer.
      overrideAccess: true
    })
    .catch(() => null);

  if (!doc) {
    return deny("Preview content was not found.", 404);
  }

  const html = renderPreviewDocument({ collection: verified.collection, doc });
  return new NextResponse(html, {
    status: 200,
    headers: { ...noindexHeaders, "Content-Type": "text/html; charset=utf-8" }
  });
}
