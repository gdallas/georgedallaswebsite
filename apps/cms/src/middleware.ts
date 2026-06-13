import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { loadCmsConfig } from "./env";
import { isOriginRequestAllowed, originVerifyHeaderName } from "./access/originVerify.mjs";

const config = loadCmsConfig();

export function middleware(request: NextRequest) {
  const allowed = isOriginRequestAllowed({
    secret: config.originVerifySecret,
    headerValue: request.headers.get(originVerifyHeaderName) ?? undefined,
    pathname: request.nextUrl.pathname
  });

  if (!allowed) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}
