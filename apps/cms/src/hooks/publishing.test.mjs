import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPublishingBeforeChangeHook } from "./publishing.mjs";

// Stub matching Payload's APIError constructor shape so the tests can assert
// the status and visibility the real class would carry.
class FakeAPIError extends Error {
  constructor(message, status, data, isPublic) {
    super(message);
    this.status = status;
    this.data = data;
    this.isPublic = isPublic;
  }
}

// SEO title/description are no longer required to publish (George, 2026-07-08):
// the public site falls back to the title/excerpt and the SEO preview shows the
// suggested value, so a post only needs an excerpt + publish date.
const postHook = createPublishingBeforeChangeHook({
  APIError: FakeAPIError,
  computeReadingTime: true,
  requiredMetadata: ["excerpt"]
});

describe("publishing beforeChange hook", () => {
  it("rejects an unpublishable draft with a public 400, never a raw 500", () => {
    // A draft flipped to Published + Public with no publish date: the exact
    // move that used to surface as an opaque "Something went wrong".
    let thrown;
    try {
      postHook({
        data: { status: "published", visibility: "public" },
        originalDoc: { status: "draft", visibility: "private", title: "A note" }
      });
    } catch (error) {
      thrown = error;
    }

    assert.ok(thrown instanceof FakeAPIError, "expected an APIError, got a plain throw");
    assert.equal(thrown.status, 400);
    assert.equal(thrown.isPublic, true, "the reason must reach the admin UI");
    // Every unfilled required field is named, not just the first.
    assert.match(thrown.message, /a publish date/);
    assert.match(thrown.message, /an excerpt/);
  });

  it("names the missing metadata a post needs before publishing", () => {
    assert.throws(
      () =>
        postHook({
          data: { status: "published", visibility: "public", publishedAt: "2026-01-01T00:00:00.000Z" },
          originalDoc: { status: "draft", visibility: "private" }
        }),
      /To publish, fill in an excerpt\./
    );
  });

  it("publishes without an SEO title or description (they fall back to title/excerpt)", () => {
    const result = postHook({
      data: { status: "published", visibility: "public" },
      originalDoc: {
        status: "draft",
        visibility: "private",
        publishedAt: "2026-01-01T00:00:00.000Z",
        excerpt: "A short summary.",
        title: "A note"
      }
    });

    assert.equal(result.status, "published");
  });

  it("merges originalDoc so a partial save is judged on the whole document", () => {
    // Only status/visibility change on save; the excerpt/SEO already live on
    // the saved draft, so the publish must succeed rather than falsely reject.
    const result = postHook({
      data: { status: "published", visibility: "public" },
      originalDoc: {
        status: "draft",
        visibility: "private",
        publishedAt: "2026-01-01T00:00:00.000Z",
        excerpt: "A short summary.",
        seoTitle: "Title",
        seoDescription: "Description",
        body: { root: { children: [{ type: "text", text: "one two three" }] } }
      }
    });

    assert.equal(result.status, "published");
    assert.ok(typeof result.readingTime === "number" && result.readingTime >= 1);
  });

  it("lets an ordinary draft save without publish requirements", () => {
    const result = postHook({
      data: { status: "draft", visibility: "private", title: "Half-formed" },
      originalDoc: undefined
    });

    assert.equal(result.status, "draft");
  });
});
