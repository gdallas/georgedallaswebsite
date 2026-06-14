import { escapeHtml, renderRichText } from "@georgedallas/shared/rich-text";

// Render a draft document as a standalone, noindex HTML preview page. Uses the
// same rich-text serializer as the public site so the body matches what will
// ship once published. A banner makes it unmistakable that this is an
// unpublished preview, never the live page.

const styles = `
  :root { color-scheme: light dark; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; line-height: 1.6; }
  .preview-banner { background: #8a5a00; color: #fff; padding: 0.6rem 1rem; font-size: 0.9rem; }
  main { max-width: 42rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
  h1 { line-height: 1.2; }
  figure.cc-figure { margin: 1.5rem 0; }
  figure.cc-figure img { max-width: 100%; height: auto; }
`;

export function renderPreviewDocument({ collection, doc } = {}) {
  const title = escapeHtml(doc?.title ?? "Untitled");
  const status = escapeHtml(doc?.status ?? "draft");
  const visibility = doc?.visibility ? ` · ${escapeHtml(doc.visibility)}` : "";
  const label = collection === "pages" ? "Page" : "Post";
  const body = renderRichText(doc?.body);
  const article = body || "<p><em>This document has no body content yet.</em></p>";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview · ${title}</title>
    <style>${styles}</style>
  </head>
  <body>
    <div class="preview-banner" role="status">
      Draft preview — ${label} · status: ${status}${visibility}. Not publicly visible.
    </div>
    <main>
      <article>
        <h1>${title}</h1>
        ${article}
      </article>
    </main>
  </body>
</html>
`;
}
