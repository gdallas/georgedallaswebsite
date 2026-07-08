import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMediaPublicUrl,
  buildMediaStorageKey,
  estimateReadingTime,
  initialMediaReviewStatus,
  isNowPagePublic,
  isPublicBuildVisible,
  isPublicListingVisible,
  publicBuildWhere,
  publicListingWhere,
  validateLinkUrl,
  validateMediaAltText,
  validateMediaFileMetadata,
  validateOptionalExternalUrl,
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

  it("validates media file metadata and public URLs", () => {
    assert.equal(validateMediaFileMetadata({ filesize: 1024, mimeType: "image/webp" }), true);
    assert.equal(validateMediaFileMetadata({ filesize: 1024, mimeType: "text/html" }), "Media file type is not allowed.");
    // Client uploads (presigned S3) bypass the Lambda event cap, so the app
    // limit is the 10 MB media cap enforced here.
    assert.equal(validateMediaFileMetadata({ filesize: 10 * 1024 * 1024, mimeType: "image/png" }), true);
    assert.equal(
      validateMediaFileMetadata({ filesize: 10 * 1024 * 1024 + 1, mimeType: "image/png" }),
      "Media file exceeds the 10 MB upload limit. Resize or compress it, then upload again."
    );
    assert.equal(buildMediaStorageKey("uploads", undefined, "hello world.png"), "uploads/hello world.png");
    assert.equal(
      buildMediaPublicUrl("https://media.example.com/", "uploads", undefined, "hello world.png"),
      "https://media.example.com/uploads/hello%20world.png"
    );
  });

  it("queues new images without alt text for alt-text review", () => {
    assert.equal(initialMediaReviewStatus({ mimeType: "image/png" }), "needs_alt_text");
    assert.equal(initialMediaReviewStatus({ mimeType: "image/png", reviewStatus: "draft" }), "needs_alt_text");
    assert.equal(initialMediaReviewStatus({ mimeType: "image/png", alt: "  " }), "needs_alt_text");
  });

  it("leaves alt-complete, decorative, and non-image uploads alone", () => {
    assert.equal(initialMediaReviewStatus({ mimeType: "image/png", alt: "A cedar" }), "draft");
    assert.equal(initialMediaReviewStatus({ mimeType: "image/png", decorative: true }), "draft");
    assert.equal(initialMediaReviewStatus({ mimeType: "application/pdf" }), "draft");
    assert.equal(initialMediaReviewStatus({}), "draft");
  });

  it("respects an explicitly chosen non-draft review status", () => {
    assert.equal(initialMediaReviewStatus({ mimeType: "image/png", reviewStatus: "private" }), "private");
    assert.equal(
      initialMediaReviewStatus({ mimeType: "image/png", alt: "Set by importer", reviewStatus: "needs_alt_text" }),
      "needs_alt_text"
    );
  });

  it("rejects invalid publish states, listing every unfilled field", () => {
    assert.equal(
      validatePublishingState({ status: "published", visibility: "public" }),
      "To publish, fill in a publish date, an SEO title, and an SEO description."
    );
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
      "To schedule this, fill in a future publish date so it can publish automatically."
    );
  });

  it("requires publish metadata on scheduled content so it can auto-publish", () => {
    const base = {
      publishedAt: "2026-07-01T00:00:00.000Z",
      status: "scheduled",
      visibility: "public"
    };
    assert.equal(
      validatePublishingState({ ...base, seoTitle: "Title" }, { now: "2026-06-12T00:00:00.000Z" }),
      "To schedule this, fill in an SEO description so it can publish automatically."
    );
    assert.equal(
      validatePublishingState(
        { ...base, seoTitle: "Title", seoDescription: "Description" },
        { now: "2026-06-12T00:00:00.000Z" }
      ),
      true
    );
  });

  it("keeps scheduled content hidden from the public build before and at its due time", () => {
    const publishedAt = "2026-07-01T09:00:00.000Z";
    const scheduled = { publishedAt, status: "scheduled", visibility: "public" };
    // Before the publish time.
    assert.equal(isPublicBuildVisible(scheduled, "2026-06-30T09:00:00.000Z"), false);
    // After the publish time but status is still "scheduled" (worker hasn't run).
    assert.equal(isPublicBuildVisible(scheduled, "2026-07-01T10:00:00.000Z"), false);
    // Once the worker flips it to published it becomes visible.
    assert.equal(
      isPublicBuildVisible({ ...scheduled, status: "published" }, "2026-07-01T10:00:00.000Z"),
      true
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

  it("accepts valid project URLs and allows empty optional URLs", () => {
    assert.equal(validateOptionalExternalUrl(undefined), true);
    assert.equal(validateOptionalExternalUrl(""), true);
    assert.equal(validateOptionalExternalUrl("https://github.com/gdallas/georgedallaswebsite"), true);
  });

  it("rejects invalid project URLs", () => {
    assert.equal(validateOptionalExternalUrl("not-a-url"), "URL must be a valid http(s) URL.");
    assert.equal(validateOptionalExternalUrl("javascript:alert(1)"), "URL must use http or https.");
    assert.equal(validateOptionalExternalUrl("http://localhost:3000/admin"), "URL cannot point to a local or private host.");
  });

  it("accepts valid link URLs including internal paths", () => {
    assert.equal(validateLinkUrl("https://www.linkedin.com/in/georgedallas"), true);
    assert.equal(validateLinkUrl("/writing"), true);
  });

  it("rejects invalid link URLs", () => {
    assert.equal(validateLinkUrl(""), "Link URL is required.");
    assert.equal(validateLinkUrl("//example.com"), "Protocol-relative link URLs are not allowed.");
    assert.equal(validateLinkUrl("ftp://example.com/file"), "URL must use http or https.");
    assert.equal(validateLinkUrl("http://127.0.0.1/admin"), "URL cannot point to a local or private host.");
  });

  it("filters public listing visibility for projects and links", () => {
    assert.equal(isPublicListingVisible({ status: "published", visibility: "public" }), true);
    assert.equal(isPublicListingVisible({ status: "draft", visibility: "public" }), false);
    assert.equal(isPublicListingVisible({ status: "archived", visibility: "public" }), false);
    assert.equal(isPublicListingVisible({ status: "published", visibility: "private" }), false);
    assert.equal(isPublicListingVisible({ status: "published", visibility: "unlisted" }), false);
    assert.deepEqual(publicListingWhere(), {
      and: [
        { status: { equals: "published" } },
        { visibility: { equals: "public" } }
      ]
    });
  });

  it("only exposes the Now page when it is published", () => {
    assert.equal(isNowPagePublic({ status: "published" }), true);
    assert.equal(isNowPagePublic({ status: "draft" }), false);
    assert.equal(isNowPagePublic(undefined), false);
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
