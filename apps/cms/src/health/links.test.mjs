import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { brokenLinkFinding, classifyLink, extractLinks, extractRichTextLinks, isCheckableUrl } from "./links.mjs";

const richText = {
  root: {
    children: [
      {
        type: "paragraph",
        children: [
          { type: "text", text: "See " },
          { type: "link", fields: { url: "https://example.com/a" }, children: [{ type: "text", text: "a" }] },
          { type: "link", fields: { url: "/internal" }, children: [{ type: "text", text: "internal" }] },
          { type: "link", url: "mailto:x@y.com", children: [] }
        ]
      }
    ]
  }
};

describe("isCheckableUrl", () => {
  it("accepts only absolute http(s) URLs", () => {
    assert.equal(isCheckableUrl("https://x.com"), true);
    assert.equal(isCheckableUrl("http://x.com"), true);
    assert.equal(isCheckableUrl("/writing/x"), false);
    assert.equal(isCheckableUrl("mailto:a@b.com"), false);
    assert.equal(isCheckableUrl(null), false);
  });
});

describe("extractRichTextLinks", () => {
  it("collects link-node URLs from nested children", () => {
    assert.deepEqual(extractRichTextLinks(richText), ["https://example.com/a", "/internal", "mailto:x@y.com"]);
  });
});

describe("extractLinks", () => {
  it("dedupes and keeps only checkable links from a post body + canonical", () => {
    const links = extractLinks("posts", { id: 1, body: richText, canonicalUrl: "https://example.com/a" });
    // /internal and mailto excluded; the canonical duplicate of /a deduped
    assert.deepEqual(links, [{ url: "https://example.com/a", collection: "posts", documentId: "1" }]);
  });

  it("pulls external URLs from project and link fields", () => {
    const projectLinks = extractLinks("projects", {
      id: 2,
      githubUrl: "https://github.com/x",
      liveUrl: "https://x.dev",
      caseStudyUrl: ""
    }).map((l) => l.url);
    assert.deepEqual(projectLinks, ["https://github.com/x", "https://x.dev"]);
    assert.deepEqual(extractLinks("links", { id: 3, url: "https://link.example" })[0].url, "https://link.example");
  });
});

describe("classifyLink", () => {
  it("treats 2xx/3xx as ok, hard 4xx/5xx as broken, auth/rate-limit as skipped", () => {
    assert.equal(classifyLink({ status: 200 }), "ok");
    assert.equal(classifyLink({ status: 301 }), "ok");
    assert.equal(classifyLink({ status: 404 }), "broken");
    assert.equal(classifyLink({ status: 500 }), "broken");
    assert.equal(classifyLink({ status: 403 }), "skipped");
    assert.equal(classifyLink({ status: 429 }), "skipped");
    assert.equal(classifyLink({ error: "timeout" }), "broken");
    assert.equal(classifyLink({}), "skipped");
  });
});

describe("brokenLinkFinding", () => {
  it("builds a finding with a stable fingerprint and status", () => {
    const f = brokenLinkFinding({ url: "https://x.com/404", collection: "posts", documentId: 1, status: 404 });
    assert.equal(f.kind, "broken_link");
    assert.equal(f.httpStatus, 404);
    assert.equal(f.fingerprint, "broken_link:posts:1:https://x.com/404");
  });
});
