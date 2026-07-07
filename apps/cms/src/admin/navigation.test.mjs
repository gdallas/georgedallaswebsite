import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COLLECTION_NAV_GROUPS,
  GLOBAL_NAV_GROUPS,
  NAV_GROUP_ORDER,
  collectionNavGroup,
  globalNavGroup
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
