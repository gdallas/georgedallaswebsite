import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COLLECTION_NAV_GROUPS,
  GLOBAL_NAV_GROUPS,
  NAV_GROUP_ORDER,
  NAV_GROUP_TIERS,
  collectionNavGroup,
  globalNavGroup,
  navGroupTier,
  tieredNavGroups
} from "./navigation.mjs";

// The registered slugs the CMS ships with. If a collection or global is added
// without a nav group, payload.config.ts throws at boot and this list keeps
// the map honest in unit tests.
const REGISTERED_COLLECTIONS = [
  "posts",
  "pages",
  "media",
  "projects",
  "links",
  "books",
  "timeline-entries",
  "contact-messages",
  "tags",
  "categories",
  "redirects",
  "content-issues",
  "content-checks",
  "import-jobs",
  "imported-items",
  "import-issues",
  "analytics-events",
  "users",
  "audit-events"
];

const REGISTERED_GLOBALS = ["now-page", "site-settings"];

describe("admin navigation groups", () => {
  it("maps every registered collection to a group", () => {
    assert.deepEqual(Object.keys(COLLECTION_NAV_GROUPS).sort(), [...REGISTERED_COLLECTIONS].sort());
  });

  it("maps every registered global to a group", () => {
    assert.deepEqual(Object.keys(GLOBAL_NAV_GROUPS).sort(), [...REGISTERED_GLOBALS].sort());
  });

  it("only uses groups from the canonical order", () => {
    for (const group of [...Object.values(COLLECTION_NAV_GROUPS), ...Object.values(GLOBAL_NAV_GROUPS)]) {
      assert.ok(NAV_GROUP_ORDER.includes(group), `"${group}" is not in NAV_GROUP_ORDER`);
    }
  });

  it("puts writing first", () => {
    assert.equal(NAV_GROUP_ORDER[0], "Write");
    assert.equal(collectionNavGroup("posts"), "Write");
    assert.equal(globalNavGroup("now-page"), "Write");
  });

  it("keeps system tables out of the content groups", () => {
    assert.equal(collectionNavGroup("users"), "System");
    assert.equal(collectionNavGroup("audit-events"), "System");
  });

  it("throws for unmapped slugs so new collections cannot ship ungrouped", () => {
    assert.throws(() => collectionNavGroup("mystery"), /no admin nav group/);
    assert.throws(() => globalNavGroup("mystery"), /no admin nav group/);
  });
});

describe("admin navigation tiers (GDW-059)", () => {
  it("assigns a tier to every group in the canonical order, and nothing else", () => {
    assert.deepEqual(Object.keys(NAV_GROUP_TIERS).sort(), [...NAV_GROUP_ORDER].sort());
  });

  it("makes Write the only primary tier and System the only system tier", () => {
    const byTier = (wanted) =>
      Object.entries(NAV_GROUP_TIERS)
        .filter(([, tier]) => tier === wanted)
        .map(([group]) => group);
    assert.deepEqual(byTier("primary"), ["Write"]);
    assert.deepEqual(byTier("system"), ["System"]);
  });

  it("orders, tiers, and prunes groups for the sidebar", () => {
    const shaped = tieredNavGroups([
      { label: "System", entities: [{ slug: "users" }] },
      { label: "Library", entities: [] },
      { label: "Site", entities: [{ slug: "tags" }] },
      { label: "Write", entities: [{ slug: "posts" }, { slug: "pages" }] }
    ]);
    assert.deepEqual(
      shaped.map(({ label, tier }) => ({ label, tier })),
      [
        { label: "Write", tier: "primary" },
        { label: "Site", tier: "quiet" },
        { label: "System", tier: "system" }
      ]
    );
  });

  it("throws for a group without a tier so the sidebar cannot drift from this file", () => {
    assert.throws(() => navGroupTier("Mystery"), /no tier/);
    assert.throws(
      () => tieredNavGroups([{ label: "Mystery", entities: [{ slug: "x" }] }]),
      /no tier/
    );
  });
});
