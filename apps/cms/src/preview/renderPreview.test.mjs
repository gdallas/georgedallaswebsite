import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderPreviewDocument } from "./renderPreview.mjs";

const body = {
  root: { children: [{ type: "paragraph", children: [{ type: "text", text: "Draft body text." }] }] }
};

describe("renderPreviewDocument", () => {
  it("marks the preview noindex", () => {
    const html = renderPreviewDocument({ collection: "posts", doc: { title: "Hi", body } });
    assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
  });

  it("renders the title and body with the shared serializer", () => {
    const html = renderPreviewDocument({ collection: "posts", doc: { title: "My draft", body } });
    assert.match(html, /<h1>My draft<\/h1>/);
    assert.match(html, /<p>Draft body text\.<\/p>/);
  });

  it("shows a draft banner with the document status", () => {
    const html = renderPreviewDocument({ collection: "pages", doc: { title: "P", status: "in_review", body } });
    assert.match(html, /Draft preview — Page/);
    assert.match(html, /status: in_review/);
  });

  it("escapes the title to prevent injection", () => {
    const html = renderPreviewDocument({ collection: "posts", doc: { title: "<script>x</script>", body } });
    assert.doesNotMatch(html, /<script>x<\/script>/);
    assert.match(html, /&lt;script&gt;/);
  });

  it("handles an empty body gracefully", () => {
    const html = renderPreviewDocument({ collection: "posts", doc: { title: "Empty" } });
    assert.match(html, /no body content yet/);
  });
});
