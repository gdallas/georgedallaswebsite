// CloudFront injects x-origin-verify on every origin request; the CMS rejects
// traffic that bypasses the CDN. The health endpoint stays open because the
// Lambda Web Adapter probes it from inside the container, without the header.
export const originVerifyHeaderName = "x-origin-verify";

export function isOriginRequestAllowed({ secret, headerValue, pathname }) {
  if (!secret) {
    return true;
  }

  if (pathname === "/api/health") {
    return true;
  }

  return typeof headerValue === "string" && timingSafeEqual(headerValue, secret);
}

// Constant-time comparison without node:crypto so the check also runs in
// edge-like runtimes.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}
