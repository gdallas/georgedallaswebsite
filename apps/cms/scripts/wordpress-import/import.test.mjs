import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { importWordpressPosts } from "./import.mjs";

// In-memory stand-in for the Payload REST client, keyed by the stored
// WordPress id so re-running an import is a no-op (idempotent).
function fakeClient() {
  const byWordpressId = new Map();
  let nextId = 1;
  return {
    store: byWordpressId,
    async findByWordpressId(id) {
      return byWordpressId.get(String(id)) ?? null;
    },
    async createDraft(data) {
      const doc = { id: nextId++, ...data };
      byWordpressId.set(String(data.wordpressOriginalId), doc);
      return doc;
    }
  };
}

const posts = [
  { id: 1, slug: "one", title: { rendered: "One" }, content: { rendered: "<p>First.</p>" }, link: "https://b/1" },
  { id: 2, slug: "two", title: { rendered: "Two" }, content: { rendered: "<p>Second.</p>[gallery]" }, link: "https://b/2" }
];

describe("importWordpressPosts", () => {
  it("creates a draft for each post and reports a summary", async () => {
    const client = fakeClient();
    const report = await importWordpressPosts({ posts, client });
    assert.equal(report.fetched, 2);
    assert.equal(report.created, 2);
    assert.equal(report.skipped, 0);
    assert.equal(report.failed, 0);
    assert.equal(report.withWarnings, 1); // post 2 has a [gallery] shortcode
    assert.equal(client.store.size, 2);
    assert.equal(client.store.get("1").status, "draft");
  });

  it("is idempotent: a second run skips already-imported posts", async () => {
    const client = fakeClient();
    await importWordpressPosts({ posts, client });
    const second = await importWordpressPosts({ posts, client });
    assert.equal(second.created, 0);
    assert.equal(second.skipped, 2);
    assert.equal(client.store.size, 2);
  });

  it("records create failures without aborting the run", async () => {
    const client = fakeClient();
    client.createDraft = async (data) => {
      if (data.wordpressOriginalId === "1") {
        throw new Error("CMS create failed: HTTP 422.");
      }
      return { id: 99, ...data };
    };
    const report = await importWordpressPosts({ posts, client });
    assert.equal(report.created, 1);
    assert.equal(report.failed, 1);
    const failure = report.items.find((item) => item.status === "failed");
    assert.match(failure.error, /HTTP 422/);
  });

  it("records transform failures (missing id) and continues", async () => {
    const client = fakeClient();
    const report = await importWordpressPosts({ posts: [{ title: { rendered: "no id" } }, posts[0]], client });
    assert.equal(report.failed, 1);
    assert.equal(report.created, 1);
  });

  it("requires a usable client", async () => {
    await assert.rejects(importWordpressPosts({ posts, client: {} }), /Payload client/);
  });
});
