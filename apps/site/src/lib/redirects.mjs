import { selectServableRedirects } from "@georgedallas/shared/redirects";

// Static redirect output for the public site (GDW-033). The S3+CloudFront host
// has no redirect engine, so each active redirect is emitted as a tiny HTML
// page that issues an immediate client redirect, marked noindex, with a
// canonical link to the destination for permanent redirects so search engines
// consolidate ranking on the new URL.

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const permanentCodes = new Set(["301", "308"]);

export function buildRedirectDocument({ destination, statusCode = "301" } = {}) {
  const dest = String(destination ?? "");
  const attr = escapeHtml(dest);
  const canonical = permanentCodes.has(String(statusCode)) ? `\n    <link rel="canonical" href="${attr}" />` : "";
  // JSON-encode for the inline script and neutralise any "</script>" sequence.
  const jsTarget = JSON.stringify(dest).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <meta http-equiv="refresh" content="0; url=${attr}" />${canonical}
    <title>Redirecting…</title>
  </head>
  <body>
    <p>This page has moved to <a href="${attr}">${attr}</a>.</p>
    <script>location.replace(${jsTarget})</script>
  </body>
</html>
`;
}

// Map active redirects to Astro getStaticPaths entries. The catch-all route
// param is the source path without its leading slash, so "/a/b" emits
// dist/a/b/index.html (which the CloudFront index-rewrite then serves).
export function toRedirectRoutes(redirects, options = {}) {
  return selectServableRedirects(redirects, options).map(({ source, destination, statusCode }) => ({
    params: { redirect: source.replace(/^\//, "") },
    props: { source, destination, statusCode }
  }));
}
