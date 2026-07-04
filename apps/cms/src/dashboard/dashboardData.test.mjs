import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildHealthTiles,
  buildQuickActions,
  contactInboxHref,
  contentIssuesHref,
  continueLatestDraftAction,
  documentEditHref,
  draftsWhere,
  mediaNeedingAltTextWhere,
  mergeRecentDocs,
  newCleanContactMessagesWhere,
  openContentIssuesByKindsWhere,
  recentlyPublishedWhere,
  scheduledWhere
} from "./dashboardData.mjs";

describe("admin dashboard data", () => {
  it("links continue-latest-draft to the newest draft when one exists", () => {
    const action = continueLatestDraftAction("/admin", { id: 7, title: "Notes on cedar" });
    assert.equal(action.href, "/admin/collections/posts/7");
    assert.match(action.description, /Notes on cedar/);
  });

  it("links continue-latest-draft to post creation when no drafts exist", () => {
    const action = continueLatestDraftAction("/admin", undefined);
    assert.equal(action.href, "/admin/collections/posts/create");
  });

  it("builds the weekly quick actions with one-click admin destinations", () => {
    const actions = buildQuickActions("/admin", undefined);
    const hrefs = actions.map((action) => action.href);

    assert.deepEqual(hrefs, [
      "/admin/collections/posts/create",
      "/admin/collections/contact-messages?where[status][equals]=new&where[spamStatus][equals]=clean",
      "/admin/globals/now-page",
      "/admin/collections/posts/create",
      "/admin/collections/links/create",
      "/admin/collections/projects/create",
      "/admin/collections/books/create",
      "/admin/collections/timeline-entries/create",
      "/admin/collections/media/create"
    ]);
  });

  it("scopes dashboard queries to the right statuses", () => {
    assert.deepEqual(draftsWhere(), { status: { in: ["draft", "in_review"] } });
    assert.deepEqual(recentlyPublishedWhere(), { status: { equals: "published" } });
    assert.deepEqual(scheduledWhere(), { status: { equals: "scheduled" } });
    assert.deepEqual(mediaNeedingAltTextWhere(), { reviewStatus: { equals: "needs_alt_text" } });
    assert.deepEqual(newCleanContactMessagesWhere(), {
      and: [{ status: { equals: "new" } }, { spamStatus: { equals: "clean" } }]
    });
  });

  it("merges posts and pages into one recency-ordered list", () => {
    const merged = mergeRecentDocs(
      [
        {
          collection: "posts",
          docs: [
            { id: 1, title: "Older post", updatedAt: "2026-06-01T00:00:00.000Z" },
            { id: 2, title: "Newest post", updatedAt: "2026-06-10T00:00:00.000Z" }
          ]
        },
        {
          collection: "pages",
          docs: [
            { id: 3, title: "Middle page", updatedAt: "2026-06-05T00:00:00.000Z" },
            { id: 4, title: "No date page" }
          ]
        }
      ],
      "updatedAt",
      2
    );

    assert.deepEqual(
      merged.map((doc) => [doc.collection, doc.id]),
      [
        ["posts", 2],
        ["pages", 3]
      ]
    );
  });

  it("builds edit links for merged documents", () => {
    assert.equal(documentEditHref("/admin", "pages", 12), "/admin/collections/pages/12");
  });
});

describe("contact inbox helpers", () => {
  it("links to new clean messages", () => {
    assert.equal(
      contactInboxHref("/admin"),
      "/admin/collections/contact-messages?where[status][equals]=new&where[spamStatus][equals]=clean"
    );
  });
});

describe("site health helpers", () => {
  it("scopes the open-by-kinds where to open status and the given kinds", () => {
    assert.deepEqual(openContentIssuesByKindsWhere(["broken_link"]), {
      and: [{ status: { equals: "open" } }, { kind: { in: ["broken_link"] } }]
    });
  });

  it("builds filtered content-issues list links", () => {
    assert.equal(
      contentIssuesHref("/admin"),
      "/admin/collections/content-issues?where[status][equals]=open"
    );
    assert.equal(
      contentIssuesHref("/admin", "broken_link"),
      "/admin/collections/content-issues?where[status][equals]=open&where[kind][equals]=broken_link"
    );
  });

  it("builds health tiles with alert flags for broken links and stale Now", () => {
    const tiles = buildHealthTiles("/admin", { brokenLinks: 2, missingMetadata: 5, missingAlt: 0, staleNow: 1 });
    const broken = tiles.find((t) => t.label === "Broken links");
    assert.equal(broken.value, 2);
    assert.equal(broken.alert, true);
    assert.equal(tiles.find((t) => t.label === "Missing alt text").value, 0);
    assert.equal(tiles.find((t) => t.label === "Stale Now page").alert, true);
  });
});
