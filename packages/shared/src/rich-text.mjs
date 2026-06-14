// Minimal serializer for Payload's Lexical rich text, kept dependency-free so
// both the static site and the CMS draft-preview route render bodies
// identically without pulling in heavy deps. Handles the node types the editor
// produces for MVP writing; unknown nodes fall back to rendering their
// children. All text and URLs are escaped/validated.

const FORMAT = { bold: 1, italic: 2, strikethrough: 4, underline: 8, code: 16 };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function safeUrl(url) {
  if (typeof url !== "string") {
    return "#";
  }

  const trimmed = url.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    return "#";
  }

  return "#";
}

function renderText(node) {
  let html = escapeHtml(node.text ?? "");
  const format = node.format ?? 0;

  if (format & FORMAT.code) {
    html = `<code>${html}</code>`;
  }
  if (format & FORMAT.bold) {
    html = `<strong>${html}</strong>`;
  }
  if (format & FORMAT.italic) {
    html = `<em>${html}</em>`;
  }
  if (format & FORMAT.underline) {
    html = `<u>${html}</u>`;
  }
  if (format & FORMAT.strikethrough) {
    html = `<s>${html}</s>`;
  }

  return html;
}

function renderChildren(children) {
  if (!Array.isArray(children)) {
    return "";
  }
  return children.map(renderNode).join("");
}

function renderNode(node) {
  if (!node || typeof node !== "object") {
    return "";
  }

  switch (node.type) {
    case "text":
      return renderText(node);
    case "linebreak":
      return "<br />";
    case "paragraph": {
      const inner = renderChildren(node.children);
      return inner ? `<p>${inner}</p>` : "";
    }
    case "heading": {
      const tag = typeof node.tag === "string" && /^h[1-6]$/.test(node.tag) ? node.tag : "h2";
      return `<${tag}>${renderChildren(node.children)}</${tag}>`;
    }
    case "quote":
      return `<blockquote>${renderChildren(node.children)}</blockquote>`;
    case "list": {
      const tag = node.listType === "number" ? "ol" : "ul";
      return `<${tag}>${renderChildren(node.children)}</${tag}>`;
    }
    case "listitem":
      return `<li>${renderChildren(node.children)}</li>`;
    case "link": {
      const url = safeUrl(node.fields?.url ?? node.url);
      const newTab = node.fields?.newTab ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${escapeHtml(url)}"${newTab}>${renderChildren(node.children)}</a>`;
    }
    case "horizontalrule":
      return "<hr />";
    case "upload": {
      // Imported/embedded media. With depth>=1 the relationship is expanded to
      // the media doc; render it as a figure when a public URL is available.
      const media = node.value && typeof node.value === "object" ? node.value : null;
      const url = media?.url ? safeUrl(media.url) : "#";
      if (url === "#") {
        return "";
      }
      const alt = escapeHtml(media?.alt ?? "");
      const caption = media?.caption ? `<figcaption>${escapeHtml(media.caption)}</figcaption>` : "";
      return `<figure class="cc-figure"><img src="${escapeHtml(url)}" alt="${alt}" loading="lazy" />${caption}</figure>`;
    }
    default:
      return renderChildren(node.children);
  }
}

export function renderRichText(body) {
  const root = body?.root;
  if (!root || !Array.isArray(root.children)) {
    return "";
  }
  return renderChildren(root.children);
}
