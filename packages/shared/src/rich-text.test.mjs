import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml, renderRichText, safeUrl } from "./rich-text.mjs";

function doc(children) {
  return { root: { children } };
}

describe("rich text rendering", () => {
  it("escapes text content", () => {
    assert.equal(escapeHtml('<script>"x"&'), "&lt;script&gt;&quot;x&quot;&amp;");
  });

  it("renders an expanded upload node as a figure with image", () => {
    const html = renderRichText(
      doc([{ type: "upload", relationTo: "media", value: { url: "https://cdn/x.png", alt: "A chart", caption: "Fig 1" } }])
    );
    assert.match(html, /<figure class="cc-figure">/);
    assert.match(html, /<img src="https:\/\/cdn\/x\.png" alt="A chart" loading="lazy" \/>/);
    assert.match(html, /<figcaption>Fig 1<\/figcaption>/);
  });

  it("skips an upload node with no resolved media url", () => {
    assert.equal(renderRichText(doc([{ type: "upload", relationTo: "media", value: 7 }])), "");
  });

  it("renders paragraphs with inline formatting", () => {
    const html = renderRichText(
      doc([
        {
          type: "paragraph",
          children: [
            { type: "text", text: "Plain " },
            { type: "text", text: "bold", format: 1 },
            { type: "text", text: " and " },
            { type: "text", text: "italic", format: 2 }
          ]
        }
      ])
    );
    assert.equal(html, "<p>Plain <strong>bold</strong> and <em>italic</em></p>");
  });

  it("renders headings, lists, and quotes", () => {
    assert.equal(renderRichText(doc([{ type: "heading", tag: "h2", children: [{ type: "text", text: "Title" }] }])), "<h2>Title</h2>");
    assert.equal(
      renderRichText(doc([{ type: "list", listType: "bullet", children: [{ type: "listitem", children: [{ type: "text", text: "One" }] }] }])),
      "<ul><li>One</li></ul>"
    );
    assert.equal(renderRichText(doc([{ type: "quote", children: [{ type: "text", text: "Quoted" }] }])), "<blockquote>Quoted</blockquote>");
  });

  it("renders safe links and blocks javascript urls", () => {
    assert.equal(safeUrl("https://example.com"), "https://example.com");
    assert.equal(safeUrl("/writing"), "/writing");
    assert.equal(safeUrl("mailto:hi@example.com"), "mailto:hi@example.com");
    assert.equal(safeUrl("javascript:alert(1)"), "#");

    const html = renderRichText(
      doc([{ type: "paragraph", children: [{ type: "link", fields: { url: "javascript:alert(1)" }, children: [{ type: "text", text: "x" }] }] }])
    );
    assert.equal(html, '<p><a href="#">x</a></p>');
  });

  it("returns an empty string for missing or malformed content", () => {
    assert.equal(renderRichText(undefined), "");
    assert.equal(renderRichText({}), "");
    assert.equal(renderRichText({ root: {} }), "");
  });
});
