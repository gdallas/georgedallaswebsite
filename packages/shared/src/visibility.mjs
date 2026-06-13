// Single source of truth for public visibility rules, shared by the CMS
// (access control) and the public site (data layer). Public content is only
// ever visible when it is published, public, and — for dated content — not
// scheduled into the future.

// Posts and pages: status + visibility + publishedAt window.
export function isPublicBuildVisible(doc, now = new Date()) {
  if (doc?.status !== "published" || doc?.visibility !== "public" || !doc?.publishedAt) {
    return false;
  }

  return new Date(doc.publishedAt) <= new Date(now);
}

export function publicBuildWhere(now = new Date()) {
  return {
    and: [
      { status: { equals: "published" } },
      { visibility: { equals: "public" } },
      { publishedAt: { less_than_equal: new Date(now).toISOString() } }
    ]
  };
}

// Projects and links: status + visibility only (no publish date / scheduling).
export function isPublicListingVisible(doc) {
  return doc?.status === "published" && doc?.visibility === "public";
}

export function publicListingWhere() {
  return {
    and: [
      { status: { equals: "published" } },
      { visibility: { equals: "public" } }
    ]
  };
}

// The Now page is a singleton global with no visibility field; published is
// the only public state.
export function isNowPagePublic(doc) {
  return doc?.status === "published";
}
