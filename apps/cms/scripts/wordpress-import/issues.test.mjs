import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildIssues, needsReview } from "./issues.mjs";

function transformed(overrides = {}) {
  return {
    data: { wordpressOriginalId: "42", slug: "a-post", excerpt: "x", ...overrides.data },
    warnings: { shortcodes: [], embeds: [], ...overrides.warnings }
  };
}

describe("buildIssues", () => {
  it("flags shortcodes, embeds, and missing excerpts", () => {
    const issues = buildIssues(
      transformed({ data: { excerpt: undefined }, warnings: { shortcodes: ["gallery"], embeds: ["iframe"] } })
    );
    const kinds = issues.map((i) => i.kind);
    assert.ok(kinds.includes("unsupported_shortcode"));
    assert.ok(kinds.includes("broken_embed"));
    assert.ok(kinds.includes("missing_excerpt"));
    assert.ok(issues.every((i) => i.wordpressId === "42"));
  });

  it("flags duplicate slugs, failed downloads, relink failures, and missing alt", () => {
    const issues = buildIssues(transformed(), {
      duplicateSlug: "wp#7",
      mediaDownloadFailed: ["https://b/x.png"],
      imageRelinkFailed: ["https://b/y.png"],
      mediaMissingAlt: ["https://b/z.png"]
    });
    const kinds = issues.map((i) => i.kind);
    assert.ok(kinds.includes("duplicate_slug"));
    assert.ok(kinds.includes("media_download_failed"));
    assert.ok(kinds.includes("image_relink_failed"));
    assert.ok(kinds.includes("media_missing_alt"));
    assert.equal(issues.find((i) => i.kind === "duplicate_slug").severity, "error");
  });

  it("produces no issues for a clean post", () => {
    assert.deepEqual(buildIssues(transformed()), []);
  });
});

describe("needsReview", () => {
  it("is true when any issue is warning or error, false for info-only", () => {
    assert.equal(needsReview([{ severity: "info" }]), false);
    assert.equal(needsReview([{ severity: "info" }, { severity: "warning" }]), true);
    assert.equal(needsReview([]), false);
  });
});
