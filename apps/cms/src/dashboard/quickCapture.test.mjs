import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maxMediaUploadBytes, validateSlug } from "../validation/content.mjs";
import {
  buildBookBody,
  buildDraftPostBody,
  buildNowUpdateBody,
  payloadErrorMessage,
  quickImageMimeTypes,
  slugifyTitle,
  uniqueSlugVariant,
  validateQuickImage
} from "./quickCapture.mjs";

describe("quick capture: draft post", () => {
  it("builds a body whose slug passes the CMS slug validation", () => {
    const body = buildDraftPostBody("  Héllo, Wörld! — Notes #2  ");
    assert.deepEqual(body, { title: "Héllo, Wörld! — Notes #2", slug: "hello-world-notes-2" });
    assert.equal(validateSlug(body.slug), true);
  });

  it("never sets status or visibility, so collection defaults keep it private", () => {
    const body = buildDraftPostBody("A quiet start");
    assert.deepEqual(Object.keys(body).sort(), ["slug", "title"]);
  });

  it("returns null for an empty title", () => {
    assert.equal(buildDraftPostBody("   "), null);
    assert.equal(buildDraftPostBody(undefined), null);
  });

  it("falls back to a usable slug when nothing survives slugification", () => {
    const body = buildDraftPostBody("???");
    assert.equal(body.slug, "untitled");
    assert.equal(validateSlug(body.slug), true);
  });

  it("produces a valid, distinct slug variant for collision retries", () => {
    const variant = uniqueSlugVariant("hello-world", 1751900000000);
    assert.notEqual(variant, "hello-world");
    assert.equal(validateSlug(variant), true);
  });
});

describe("quick capture: book and Now bodies", () => {
  it("requires both title and author for a book", () => {
    assert.deepEqual(buildBookBody(" Root Systems ", " R. Powers "), {
      title: "Root Systems",
      author: "R. Powers"
    });
    assert.equal(buildBookBody("Root Systems", ""), null);
    assert.equal(buildBookBody("", "R. Powers"), null);
  });

  it("attaches only a checksum-valid ISBN, ignoring junk and partial input", () => {
    assert.deepEqual(buildBookBody("Overstory", "R. Powers", "978-0-393-63552-2"), {
      title: "Overstory",
      author: "R. Powers",
      isbn: "9780393635522"
    });
    // Half-typed / invalid ISBN is dropped rather than stored.
    assert.deepEqual(buildBookBody("Overstory", "R. Powers", "97803936"), {
      title: "Overstory",
      author: "R. Powers"
    });
  });

  it("builds a partial Now update touching only currentFocus", () => {
    assert.deepEqual(buildNowUpdateBody("  Shipping the admin refresh  "), {
      currentFocus: "Shipping the admin refresh"
    });
    assert.equal(buildNowUpdateBody(""), null);
  });
});

describe("quick capture: image gate", () => {
  it("accepts library image types under the size cap", () => {
    assert.equal(validateQuickImage({ name: "cedar.jpg", type: "image/jpeg", size: 1024 }), true);
    assert.equal(validateQuickImage({ name: "mark.svg", type: "image/svg+xml", size: 2048 }), true);
  });

  it("rejects non-image and oversized files with named, friendly messages", () => {
    const pdf = validateQuickImage({ name: "notes.pdf", type: "application/pdf", size: 10 });
    assert.match(pdf, /notes\.pdf/);
    assert.match(pdf, /not an image/);

    const big = validateQuickImage({ name: "raw.png", type: "image/png", size: maxMediaUploadBytes + 1 });
    assert.match(big, /raw\.png/);
    assert.match(big, /4 MB/);
  });

  it("only offers image mime types to the file input", () => {
    assert.ok(quickImageMimeTypes.length > 0);
    assert.ok(quickImageMimeTypes.every((type) => type.startsWith("image/")));
    assert.ok(!quickImageMimeTypes.includes("application/pdf"));
  });
});

describe("quick capture: error surfacing", () => {
  it("prefers the first Payload error message and falls back cleanly", () => {
    assert.equal(
      payloadErrorMessage({ errors: [{ message: "Slug already in use" }] }, "fallback"),
      "Slug already in use"
    );
    assert.equal(payloadErrorMessage({}, "fallback"), "fallback");
    assert.equal(payloadErrorMessage(undefined, "fallback"), "fallback");
    assert.equal(payloadErrorMessage({ errors: [{ message: "" }] }, "fallback"), "fallback");
  });
});
