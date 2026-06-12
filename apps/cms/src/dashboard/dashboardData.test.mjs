import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildQuickActions,
  continueLatestDraftAction,
  documentEditHref,
  draftsWhere,
  mediaNeedingAltTextWhere,
  mergeRecentDocs,
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
      "/admin/globals/now-page",
      "/admin/collections/posts/create",
      "/admin/collections/links/create",
      "/admin/collections/projects/create",
      "/admin/collections/media/create"
    ]);
  });

  it("scopes dashboard queries to the right statuses", () => {
    assert.deepEqual(draftsWhere(), { status: { in: ["draft", "in_review"] } });
    assert.deepEqual(recentlyPublishedWhere(), { status: { equals: "published" } });
    assert.deepEqual(scheduledWhere(), { status: { equals: "scheduled" } });
    assert.deepEqual(mediaNeedingAltTextWhere(), { reviewStatus: { equals: "needs_alt_text" } });
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
