// Unified admin search (GDW-036). Pure, dependency-free logic so it is fully
// unit-testable without Payload; the admin view (AdminSearch.tsx) supplies a
// `find` function backed by payload.find with overrideAccess:false so RBAC is
// enforced — a user only ever sees results they are allowed to read.
//
// "PostgreSQL full-text search initially" is satisfied via Payload's Postgres
// `like` (ILIKE) operator across each collection's text fields. The upgrade
// path to Postgres tsvector FTS / a dedicated engine is documented in
// docs/runbooks/search.md.

// Per-collection search config. `fields` are matched with `like`; `title`/
// `subtitle` map a found doc to display text.
export const adminSearchCollections = [
  {
    slug: "posts",
    label: "Posts",
    fields: ["title", "excerpt", "slug", "seoTitle", "seoDescription"],
    title: (doc) => doc.title,
    subtitle: (doc) => doc.status
  },
  {
    slug: "pages",
    label: "Pages",
    fields: ["title", "slug", "seoTitle", "seoDescription"],
    title: (doc) => doc.title,
    subtitle: (doc) => doc.template
  },
  {
    slug: "projects",
    label: "Projects",
    fields: ["title", "summary", "slug"],
    title: (doc) => doc.title,
    subtitle: (doc) => doc.status
  },
  {
    slug: "links",
    label: "Links",
    fields: ["title", "url", "description"],
    title: (doc) => doc.title,
    subtitle: (doc) => doc.category
  },
  {
    slug: "books",
    label: "Books",
    fields: ["title", "author", "isbn"],
    title: (doc) => doc.title,
    subtitle: (doc) => doc.author || doc.readingStatus
  },
  {
    slug: "timeline-entries",
    label: "Timeline entries",
    fields: ["title", "summary", "type"],
    title: (doc) => doc.title,
    subtitle: (doc) => doc.type || doc.eventDate
  },
  {
    slug: "media",
    label: "Media",
    fields: ["alt", "filename", "caption"],
    title: (doc) => doc.alt || doc.filename,
    subtitle: (doc) => doc.reviewStatus
  },
  {
    slug: "import-issues",
    label: "Import issues",
    fields: ["detail", "notes", "kind", "wordpressId"],
    title: (doc) => doc.kind || doc.detail,
    subtitle: (doc) => doc.severity
  },
  {
    slug: "contact-messages",
    label: "Contact messages",
    fields: ["name", "email", "subject", "message", "notes"],
    title: (doc) => doc.subject || doc.name || doc.email,
    subtitle: (doc) => doc.status
  }
];

export function normalizeQuery(query) {
  return typeof query === "string" ? query.trim() : "";
}

// Payload where-clause that matches the query (case-insensitive contains) in
// any of the given fields.
export function buildSearchWhere(fields, query) {
  return { or: fields.map((field) => ({ [field]: { like: query } })) };
}

export function adminEditUrl(adminRoute, slug, id) {
  const base = String(adminRoute || "/admin").replace(/\/+$/, "");
  return `${base}/collections/${slug}/${id}`;
}

export function toResultItem(collection, doc, adminRoute) {
  const title = collection.title(doc);
  const subtitle = collection.subtitle ? collection.subtitle(doc) : undefined;
  return {
    id: doc.id,
    title: title && String(title).trim().length > 0 ? String(title) : `Untitled (#${doc.id})`,
    subtitle: subtitle ? String(subtitle) : undefined,
    href: adminEditUrl(adminRoute, collection.slug, doc.id)
  };
}

// Run the query across every configured collection. `find(slug, where, limit)`
// must resolve to a Payload-style `{ docs, totalDocs }` result; the view wires
// it to payload.find with the current user so access control applies. A failing
// collection (e.g. one the user cannot read) degrades to an empty group rather
// than failing the whole search.
export async function searchAllCollections({
  find,
  query,
  limitPerCollection = 5,
  adminRoute = "/admin",
  collections = adminSearchCollections
}) {
  const q = normalizeQuery(query);
  if (q.length === 0) {
    return { query: "", groups: [], total: 0 };
  }

  const groups = [];
  let total = 0;
  for (const collection of collections) {
    const where = buildSearchWhere(collection.fields, q);
    let result;
    try {
      result = await find(collection.slug, where, limitPerCollection);
    } catch {
      result = null;
    }
    const docs = Array.isArray(result?.docs) ? result.docs : [];
    const groupTotal = typeof result?.totalDocs === "number" ? result.totalDocs : docs.length;
    total += groupTotal;
    groups.push({
      slug: collection.slug,
      label: collection.label,
      total: groupTotal,
      items: docs.map((doc) => toResultItem(collection, doc, adminRoute))
    });
  }

  return { query: q, groups, total };
}
