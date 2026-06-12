import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateReadingTime,
  isPublicBuildVisible,
  publicBuildWhere,
  validateMediaAltText,
  validatePublishingState,
  validateRedirectDestination,
  validateRedirectSource,
  validateSlug
} from "./content.mjs";

describe("content validation", () => {
  it("accepts clean lowercase slugs", () => {
    assert.equal(validateSlug("ai-systems-notes"), true);
  });

  it("rejects invalid tag and category slugs", () => {
    assert.equal(validateSlug("AI Systems"), "Slug must use lowercase letters, numbers, and single hyphens only.");
    assert.equal(validateSlug("ai--systems"), "Slug must use lowercase letters, numbers, and single hyphens only.");
  });

  it("accepts safe redirect paths and destinations", () => {
    assert.equal(validateRedirectSource("/old-post"), true);
    assert.equal(validateRedirectDestination("/writing/new-post"), true);
    assert.equal(validateRedirectDestination("https://georgedallas.com/writing/new-post"), true);
  });

  it("rejects unsafe redirects", () => {
    assert.equal(validateRedirectSource("https://example.com/old"), "Redirect source must be an internal path that starts with one slash.");
    assert.equal(validateRedirectSource("//example.com/old"), "Redirect source must be an internal path that starts with one slash.");
    assert.equal(validateRedirectDestination("javascript:alert(1)"), "Redirect destination must use http or https.");
    assert.equal(validateRedirectDestination("http://localhost:3000/admin"), "Redirect destination cannot point to a local or private host.");
  });

  it("requires alt text before media is marked public", () => {
    assert.equal(validateMediaAltText("", { reviewStatus: "draft" }), true);
    assert.equal(validateMediaAltText("Portrait of George", { reviewStatus: "public" }), true);
    assert.equal(validateMediaAltText("", { decorative: true, reviewStatus: "public" }), true);
    assert.equal(validateMediaAltText("", { reviewStatus: "public" }), "Public media requires alt text unless it is marked decorative.");
  });

  it("rejects invalid publish states", () => {
    assert.equal(validatePublishingState({ status: "published", visibility: "public" }), "Published content requires a publishedAt date.");
    assert.equal(
      validatePublishingState({
        publishedAt: "2026-01-01T00:00:00.000Z",
        seoDescription: "Description",
        seoTitle: "Title",
        status: "published",
        visibility: "public"
      }, { now: "2026-06-12T00:00:00.000Z" }),
      true
    );
    assert.equal(
      validatePublishingState({
        publishedAt: "2026-01-01T00:00:00.000Z",
        seoDescription: "Description",
        seoTitle: "Title",
        status: "scheduled",
        visibility: "public"
      }, { now: "2026-06-12T00:00:00.000Z" }),
      "Scheduled content requires a future publishedAt date."
    );
  });

  it("filters public build visibility tightly", () => {
    const now = "2026-06-12T00:00:00.000Z";
    assert.equal(isPublicBuildVisible({ publishedAt: "2026-06-01T00:00:00.000Z", status: "published", visibility: "public" }, now), true);
    assert.equal(isPublicBuildVisible({ publishedAt: "2026-06-01T00:00:00.000Z", status: "draft", visibility: "public" }, now), false);
    assert.equal(isPublicBuildVisible({ publishedAt: "2026-06-01T00:00:00.000Z", status: "published", visibility: "private" }, now), false);
    assert.equal(isPublicBuildVisible({ publishedAt: "2026-07-01T00:00:00.000Z", status: "published", visibility: "public" }, now), false);
    assert.deepEqual(publicBuildWhere(now).and[2], {
      publishedAt: {
        less_than_equal: "2026-06-12T00:00:00.000Z"
      }
    });
  });

  it("estimates reading time from rich text content", () => {
    assert.equal(estimateReadingTime({
      body: {
        root: {
          children: [
            {
              children: [
                {
                  text: "One two three four five"
                }
              ]
            }
          ]
        }
      }
    }), 1);
  });
});
