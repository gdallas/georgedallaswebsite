export const draftStatuses = ["draft", "in_review"];

export function buildQuickActions(adminRoute, latestDraft) {
  return [
    continueLatestDraftAction(adminRoute, latestDraft),
    {
      label: "Update Now page",
      description: "Refresh what you are focused on, reading, and listening to.",
      href: `${adminRoute}/globals/now-page`
    },
    {
      label: "Write a new post",
      description: "Start a fresh draft.",
      href: `${adminRoute}/collections/posts/create`
    },
    {
      label: "Add quick link",
      description: "Add a link to the link hub.",
      href: `${adminRoute}/collections/links/create`
    },
    {
      label: "Add project",
      description: "Showcase something you built.",
      href: `${adminRoute}/collections/projects/create`
    },
    {
      label: "Upload media",
      description: "Add images with alt text.",
      href: `${adminRoute}/collections/media/create`
    }
  ];
}

export function continueLatestDraftAction(adminRoute, latestDraft) {
  if (latestDraft?.id != null) {
    return {
      label: "Continue latest draft",
      description: latestDraft.title ? `Pick up “${latestDraft.title}”.` : "Pick up where you left off.",
      href: `${adminRoute}/collections/posts/${latestDraft.id}`
    };
  }

  return {
    label: "Continue latest draft",
    description: "No drafts yet — start one.",
    href: `${adminRoute}/collections/posts/create`
  };
}

export function draftsWhere() {
  return {
    status: {
      in: draftStatuses
    }
  };
}

export function recentlyPublishedWhere() {
  return {
    status: {
      equals: "published"
    }
  };
}

export function scheduledWhere() {
  return {
    status: {
      equals: "scheduled"
    }
  };
}

export function mediaNeedingAltTextWhere() {
  return {
    reviewStatus: {
      equals: "needs_alt_text"
    }
  };
}

export function mergeRecentDocs(lists, dateField, limit) {
  return lists
    .flatMap(({ collection, docs }) => docs.map((doc) => ({ ...doc, collection })))
    .filter((doc) => doc[dateField])
    .sort((a, b) => new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime())
    .slice(0, limit);
}

export function documentEditHref(adminRoute, collection, id) {
  return `${adminRoute}/collections/${collection}/${id}`;
}

// --- Site health (content-issues) ----------------------------------------

export const metadataIssueKinds = [
  "missing_seo_title",
  "missing_seo_description",
  "missing_excerpt",
  "missing_social_image"
];

export function openContentIssuesWhere() {
  return { status: { equals: "open" } };
}

export function openContentIssuesByKindsWhere(kinds) {
  return { and: [{ status: { equals: "open" } }, { kind: { in: kinds } }] };
}

// Link to the content-issues list filtered to open issues, optionally of one kind.
export function contentIssuesHref(adminRoute, kind) {
  const base = `${adminRoute}/collections/content-issues?where[status][equals]=open`;
  return kind ? `${base}&where[kind][equals]=${kind}` : base;
}

// Build the dashboard "Site health" tiles from pre-counted totals.
export function buildHealthTiles(adminRoute, counts) {
  return [
    { label: "Broken links", value: counts.brokenLinks ?? 0, href: contentIssuesHref(adminRoute, "broken_link"), alert: (counts.brokenLinks ?? 0) > 0 },
    { label: "Missing metadata", value: counts.missingMetadata ?? 0, href: contentIssuesHref(adminRoute) },
    { label: "Missing alt text", value: counts.missingAlt ?? 0, href: contentIssuesHref(adminRoute, "media_missing_alt") },
    { label: "Stale Now page", value: counts.staleNow ?? 0, href: contentIssuesHref(adminRoute, "stale_now"), alert: (counts.staleNow ?? 0) > 0 }
  ];
}
