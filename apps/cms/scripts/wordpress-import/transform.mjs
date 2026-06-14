// Pure transformation helpers for the WordPress import proof of concept. They
// map a WordPress REST API post into the shape the Payload `posts` collection
// expects, detect content that this proof of concept cannot faithfully convert,
// and are dependency-free so they can be unit-tested with node:test.
//
// Scope (PoC): block-level structure (paragraphs, headings, blockquotes, lists)
// is converted to Lexical; inline formatting/links and media are reduced to
// text and left for the full pipeline (GDW-031). Shortcodes and embeds are
// flagged rather than silently dropped.

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”"
};

export function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (_, code) => safeFromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => safeFromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => (name in NAMED_ENTITIES ? NAMED_ENTITIES[name] : match));
}

function safeFromCodePoint(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) {
    return "";
  }
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

export function stripTags(html) {
  return String(html ?? "").replace(/<[^>]*>/g, "");
}

function clean(html) {
  return decodeEntities(stripTags(html)).replace(/\s+/g, " ").trim();
}

export function slugify(value, fallback = "post") {
  const slug = String(value ?? "")
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug || fallback;
}

// --- Lexical builders (default Payload lexical node shape) ---

function textNode(text) {
  return { type: "text", text, detail: 0, format: 0, mode: "normal", style: "", version: 1 };
}

function block(type, children, extra = {}) {
  return { type, children, direction: "ltr", format: "", indent: 0, version: 1, ...extra };
}

function linkNode(url, text) {
  return {
    type: "link",
    fields: { linkType: "custom", url, newTab: false },
    children: [textNode(text)],
    direction: "ltr",
    format: "",
    indent: 0,
    version: 3
  };
}

// Intermediate marker for an image. The driver downloads the source, uploads it
// to the media library, and replaces this node with a Payload `upload` node
// (see media.mjs). Markers left unresolved are dropped and flagged.
function imageNode(src, alt, caption) {
  return { type: "wp-image", src, alt: alt ?? "", caption: caption ?? "", version: 1 };
}

function attr(tag, name) {
  const match = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag);
  return match ? decodeEntities(match[1]) : "";
}

function safeLinkUrl(url) {
  const trimmed = String(url ?? "").trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    return null;
  }
  return null;
}

// Parse the inline content of a block into text and link nodes. Images are
// handled at the block level, not inline.
function parseInline(html) {
  const nodes = [];
  const re = /<a\b[^>]*>([\s\S]*?)<\/a>|<br\s*\/?>/gi;
  let last = 0;
  let match;
  const pushText = (segment) => {
    const text = clean(segment);
    if (text) {
      nodes.push(textNode(text));
    }
  };

  while ((match = re.exec(html))) {
    pushText(html.slice(last, match.index));
    if (/^<a/i.test(match[0])) {
      const url = safeLinkUrl(attr(match[0], "href"));
      const text = clean(match[1]);
      if (text) {
        nodes.push(url ? linkNode(url, text) : textNode(text));
      }
    } else {
      nodes.push({ type: "linebreak", version: 1 });
    }
    last = re.lastIndex;
  }
  pushText(html.slice(last));
  return nodes;
}

function imagesFromHtml(inner) {
  const images = [];
  const captionMatch = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i.exec(inner);
  const caption = captionMatch ? clean(captionMatch[1]) : "";
  const imgRe = /<img\b[^>]*>/gi;
  let match;
  while ((match = imgRe.exec(inner))) {
    const src = attr(match[0], "src");
    if (src) {
      images.push(imageNode(src, attr(match[0], "alt"), caption));
    }
  }
  return images;
}

function listItemsFrom(innerHtml) {
  const items = [];
  const itemRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = itemRe.exec(innerHtml))) {
    const children = parseInline(match[1]);
    items.push(block("listitem", children, { value: items.length + 1 }));
  }
  return items;
}

// Split HTML at <img> tags, keeping the images, so an image inside a paragraph
// becomes a top-level node (Payload upload nodes are block-level, not inline).
function splitByImages(html) {
  const parts = [];
  const re = /<img\b[^>]*>/gi;
  let last = 0;
  let match;
  while ((match = re.exec(html))) {
    if (match.index > last) {
      parts.push({ kind: "text", html: html.slice(last, match.index) });
    }
    parts.push({ kind: "image", tag: match[0] });
    last = re.lastIndex;
  }
  if (last < html.length) {
    parts.push({ kind: "text", html: html.slice(last) });
  }
  return parts;
}

// Build paragraph and image nodes from a segment of inline-ish HTML.
function blocksFromSegment(segment) {
  const nodes = [];
  for (const part of splitByImages(segment)) {
    if (part.kind === "image") {
      const src = attr(part.tag, "src");
      if (src) {
        nodes.push(imageNode(src, attr(part.tag, "alt")));
      }
    } else {
      const children = parseInline(part.html);
      if (children.length > 0) {
        nodes.push(block("paragraph", children));
      }
    }
  }
  return nodes;
}

function paragraphsFromPlain(segment) {
  return blocksFromSegment(segment);
}

export function htmlToLexical(html) {
  const source = String(html ?? "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const nodes = [];
  // figure | block element | standalone image. Images become top-level nodes so
  // they can be relinked to Payload upload nodes (which are block-level).
  const blockRe = /<figure\b[^>]*>([\s\S]*?)<\/figure>|<(h[1-6]|p|blockquote|ul|ol)\b[^>]*>([\s\S]*?)<\/\2>|<img\b[^>]*>/gi;
  let lastIndex = 0;
  let match;

  while ((match = blockRe.exec(source))) {
    nodes.push(...paragraphsFromPlain(source.slice(lastIndex, match.index)));
    const whole = match[0];

    if (/^<figure/i.test(whole)) {
      nodes.push(...imagesFromHtml(match[1]));
    } else if (/^<img/i.test(whole)) {
      const src = attr(whole, "src");
      if (src) {
        nodes.push(imageNode(src, attr(whole, "alt")));
      }
    } else {
      const tag = match[2].toLowerCase();
      const inner = match[3];
      if (/^h[1-6]$/.test(tag)) {
        nodes.push(block("heading", parseInline(inner), { tag }));
      } else if (tag === "blockquote") {
        nodes.push(block("quote", parseInline(inner)));
      } else if (tag === "ul" || tag === "ol") {
        const ordered = tag === "ol";
        nodes.push(block("list", listItemsFrom(inner), { listType: ordered ? "number" : "bullet", tag, start: 1 }));
      } else {
        nodes.push(...blocksFromSegment(inner));
      }
    }

    lastIndex = blockRe.lastIndex;
  }

  nodes.push(...paragraphsFromPlain(source.slice(lastIndex)));

  return {
    root: block("root", nodes.length > 0 ? nodes : [block("paragraph", [])])
  };
}

// --- Unsupported-content detection ---

export function detectUnsupported(html) {
  const source = String(html ?? "");
  const shortcodes = new Set();
  const embeds = new Set();

  const shortcodeRe = /\[\/?([a-zA-Z][\w-]*)(?:[^\]]*)\]/g;
  let match;
  while ((match = shortcodeRe.exec(source))) {
    shortcodes.add(match[1].toLowerCase());
  }

  if (/<iframe\b/i.test(source)) {
    embeds.add("iframe");
  }
  if (/<script\b/i.test(source)) {
    embeds.add("script");
  }
  const wpBlockRe = /<!--\s*wp:([a-z0-9-]+\/?[a-z0-9-]*)/gi;
  while ((match = wpBlockRe.exec(source))) {
    const name = match[1].toLowerCase();
    if (/embed|video|audio|gallery|html|file/.test(name)) {
      embeds.add(`wp:${name}`);
    }
  }

  return { shortcodes: [...shortcodes].sort(), embeds: [...embeds].sort() };
}

// --- Top-level post transform ---

export function transformPost(wpPost, options = {}) {
  if (!wpPost || (wpPost.id === undefined && wpPost.id !== 0)) {
    throw new Error("WordPress post is missing an id.");
  }

  const id = wpPost.id;
  const contentHtml = wpPost.content?.rendered ?? "";
  const title = clean(wpPost.title?.rendered) || `Untitled WordPress post ${id}`;
  const slug = slugify(wpPost.slug || title, `post-${id}`);
  const excerpt = clean(wpPost.excerpt?.rendered);
  const publishedAt = normalizeDate(wpPost.date_gmt ?? wpPost.date) ?? new Date(options.now ?? Date.now()).toISOString();
  const authorName = wpPost._embedded?.author?.[0]?.name ?? null;

  const data = {
    title,
    slug,
    publishedAt,
    // Imported content is never auto-published and is kept private until
    // reviewed (GDW-032). Flipping it live is a deliberate editorial action.
    status: "draft",
    visibility: "private",
    body: htmlToLexical(contentHtml),
    wordpressOriginalId: String(id),
    wordpressOriginalUrl: wpPost.link ?? null,
    seoTitle: title
  };

  if (excerpt) {
    data.excerpt = excerpt;
    data.seoDescription = excerpt;
  }

  return {
    data,
    warnings: detectUnsupported(contentHtml),
    source: { id, link: wpPost.link ?? null, authorName }
  };
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }
  // WordPress `date_gmt` is UTC but omits the timezone marker.
  const candidate = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Propose a redirect from the post's old WordPress path to its new location so
// old permalinks are preserved. Returns null when there is nothing to redirect.
export function deriveRedirect(wpUrl, slug) {
  if (!wpUrl || !slug) {
    return null;
  }
  let sourcePath;
  try {
    sourcePath = new URL(wpUrl).pathname;
  } catch {
    return null;
  }
  sourcePath = sourcePath.replace(/\/+$/, "");
  const destination = `/writing/${slug}`;
  if (!sourcePath || sourcePath === "/" || sourcePath === destination) {
    return null;
  }
  if (/[\s?#]/.test(sourcePath) || sourcePath.startsWith("//")) {
    return null;
  }
  return { sourcePath, destination, statusCode: "301" };
}
