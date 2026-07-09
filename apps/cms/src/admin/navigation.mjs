// Single source of truth for the admin sidebar's navigation groups.
// Collections and globals read their group from here so the sidebar map,
// the payload.config ordering, and the tests cannot drift apart.
// Payload renders groups in the order they are first encountered in the
// config, so payload.config.ts must list collections in NAV_GROUP_ORDER.

export const NAV_GROUP_ORDER = [
  "Write",
  "Library",
  "Inbox",
  "Site",
  "Site health",
  "WordPress import",
  "System"
];

export const COLLECTION_NAV_GROUPS = {
  posts: "Write",
  pages: "Write",
  media: "Write",
  "now-entries": "Write",
  projects: "Library",
  "github-repos": "Library",
  links: "Library",
  books: "Library",
  "timeline-entries": "Library",
  "contact-messages": "Inbox",
  tags: "Site",
  categories: "Site",
  redirects: "Site",
  "content-issues": "Site health",
  "content-checks": "Site health",
  "import-jobs": "WordPress import",
  "imported-items": "WordPress import",
  "import-issues": "WordPress import",
  "github-sync-runs": "System",
  users: "System",
  "audit-events": "System"
};

export const GLOBAL_NAV_GROUPS = {
  "now-page": "Write",
  "site-settings": "Site"
};

// Presentation tiers for the custom sidebar (GDW-059). "primary" renders as
// large immediate links (no collapse), "quiet" as collapsible groups, and
// "system" as a demoted collapsible group behind the divider at the foot.
export const NAV_GROUP_TIERS = {
  Write: "primary",
  Library: "quiet",
  Inbox: "quiet",
  Site: "quiet",
  "Site health": "quiet",
  "WordPress import": "quiet",
  System: "system"
};

export function navGroupTier(group) {
  const tier = NAV_GROUP_TIERS[group];

  if (!tier) {
    throw new Error(`Nav group "${group}" has no tier. Add it to src/admin/navigation.mjs.`);
  }

  return tier;
}

// Shapes Payload's groupNavItems() output for the custom Nav component:
// drops empty groups, orders by NAV_GROUP_ORDER, and attaches each group's
// presentation tier. Throws on a group this file doesn't know about, so the
// sidebar cannot silently render an unmapped group.
export function tieredNavGroups(groups) {
  return groups
    .filter((group) => group.entities.length > 0)
    .map((group) => ({ ...group, tier: navGroupTier(group.label) }))
    .sort((a, b) => NAV_GROUP_ORDER.indexOf(a.label) - NAV_GROUP_ORDER.indexOf(b.label));
}

export function collectionNavGroup(slug) {
  const group = COLLECTION_NAV_GROUPS[slug];

  if (!group) {
    throw new Error(`Collection "${slug}" has no admin nav group. Add it to src/admin/navigation.mjs.`);
  }

  return group;
}

export function globalNavGroup(slug) {
  const group = GLOBAL_NAV_GROUPS[slug];

  if (!group) {
    throw new Error(`Global "${slug}" has no admin nav group. Add it to src/admin/navigation.mjs.`);
  }

  return group;
}
