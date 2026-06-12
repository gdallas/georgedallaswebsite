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
