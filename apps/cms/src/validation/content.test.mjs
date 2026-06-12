import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validateMediaAltText,
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
});
