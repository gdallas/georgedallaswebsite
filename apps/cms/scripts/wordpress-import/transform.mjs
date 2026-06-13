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

// --- Minimal Lexical builders (default Payload lexical node shape) ---

function textNode(text) {
  return { type: "text", text, detail: 0, format: 0, mode: "normal", style: "", version: 1 };
}

function block(type, children, extra = {}) {
  return { type, children, direction: "ltr", format: "", indent: 0, version: 1, ...extra };
}

function listItemsFrom(innerHtml) {
  const items = [];
  const itemRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = itemRe.exec(innerHtml))) {
    const text = clean(match[1]);
    items.push(block("listitem", text ? [textNode(text)] : [], { value: items.length + 1 }));
  }
  return items;
}

function paragraphsFromPlain(segment) {
  const text = clean(segment);
  return text ? [block("paragraph", [textNode(text)])] : [];
}

export function htmlToLexical(html) {
  const source = String(html ?? "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const nodes = [];
  const blockRe = /<(h[1-6]|p|blockquote|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let match;

  while ((match = blockRe.exec(source))) {
    nodes.push(...paragraphsFromPlain(source.slice(lastIndex, match.index)));
    const tag = match[1].toLowerCase();
    const inner = match[2];

    if (/^h[1-6]$/.test(tag)) {
      nodes.push(block("heading", [textNode(clean(inner))], { tag }));
    } else if (tag === "blockquote") {
      nodes.push(block("quote", [textNode(clean(inner))]));
    } else if (tag === "ul" || tag === "ol") {
      const ordered = tag === "ol";
      nodes.push(
        block("list", listItemsFrom(inner), {
          listType: ordered ? "number" : "bullet",
          tag,
          start: 1
        })
      );
    } else {
      const text = clean(inner);
      if (text) {
        nodes.push(block("paragraph", [textNode(text)]));
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
