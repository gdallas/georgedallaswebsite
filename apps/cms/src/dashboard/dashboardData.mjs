import { needsReviewHref, unresolvedIssuesHref } from "./importReview.mjs";

export const draftStatuses = ["draft", "in_review"];

// The weekly loop gets the four primary cards; everything else is reachable
// from a compact secondary row so the first screen answers "what do I do
// next" instead of offering nine equal choices (GDW-056).
export function buildQuickActions(adminRoute, latestDraft) {
  return {
    primary: [
      continueLatestDraftAction(adminRoute, latestDraft),
      {
        label: "Write a new post",
        description: "Start a fresh draft.",
        href: `${adminRoute}/collections/posts/create`
      },
      {
        label: "Update Now page",
        description: "Refresh what you are focused on, reading, and listening to.",
        href: `${adminRoute}/globals/now-page`
      },
      {
        label: "Review inbox",
        description: "Read new contact messages.",
        href: contactInboxHref(adminRoute)
      }
    ],
    secondary: [
      { label: "Add quick link", href: `${adminRoute}/collections/links/create` },
      { label: "Add project", href: `${adminRoute}/collections/projects/create` },
      { label: "Add book note", href: `${adminRoute}/collections/books/create` },
      { label: "Add timeline entry", href: `${adminRoute}/collections/timeline-entries/create` },
      { label: "Upload media", href: `${adminRoute}/collections/media/create` }
    ]
  };
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

export function newCleanContactMessagesWhere() {
  return {
    and: [{ status: { equals: "new" } }, { spamStatus: { equals: "clean" } }]
  };
}

export function contactInboxHref(adminRoute) {
  return `${adminRoute}/collections/contact-messages?where[status][equals]=new&where[spamStatus][equals]=clean`;
}

// One consolidated "Needs attention" list: alt text, import cleanup, and the
// inbox in a single place, each entry linking to the filtered list that
// resolves it. Zero-count entries are dropped; an empty array means calm.
export function buildAttentionItems(adminRoute, counts) {
  const plural = (n, singular, pluralForm) => (n === 1 ? singular : pluralForm);
  const items = [];

  if ((counts.mediaNeedingAltText ?? 0) > 0) {
    const n = counts.mediaNeedingAltText;
    items.push({
      label: `${n} media ${plural(n, "item is", "items are")} missing alt text`,
      href: `${adminRoute}/collections/media?where[reviewStatus][equals]=needs_alt_text`
    });
  }

  if ((counts.unresolvedImportIssues ?? 0) > 0) {
    const n = counts.unresolvedImportIssues;
    items.push({
      label: `${n} unresolved WordPress import ${plural(n, "issue", "issues")}`,
      href: unresolvedIssuesHref(adminRoute)
    });
  }

  if ((counts.importsAwaitingReview ?? 0) > 0) {
    const n = counts.importsAwaitingReview;
    items.push({
      label: `${n} imported ${plural(n, "post awaits", "posts await")} review`,
      href: needsReviewHref(adminRoute)
    });
  }

  if ((counts.newContactMessages ?? 0) > 0) {
    const n = counts.newContactMessages;
    items.push({
      label: `${n} new contact ${plural(n, "message", "messages")}`,
      href: contactInboxHref(adminRoute)
    });
  }

  return items;
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
