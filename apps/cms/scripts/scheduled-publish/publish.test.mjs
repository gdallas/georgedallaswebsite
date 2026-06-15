import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runScheduledPublish, selectDueDocs } from "./publish.mjs";

const now = new Date("2026-06-14T12:00:00.000Z");

describe("selectDueDocs", () => {
  it("keeps only scheduled docs whose publish time has passed", () => {
    const docs = [
      { id: 1, status: "scheduled", publishedAt: "2026-06-14T11:00:00.000Z" },
      { id: 2, status: "scheduled", publishedAt: "2026-06-14T13:00:00.000Z" },
      { id: 3, status: "published", publishedAt: "2026-06-01T00:00:00.000Z" },
      { id: 4, status: "scheduled", publishedAt: null }
    ];
    assert.deepEqual(
      selectDueDocs(docs, now).map((d) => d.id),
      [1]
    );
  });
});

function fakeClient(byCollection) {
  const updated = [];
  return {
    updated,
    async list(collection) {
      return byCollection[collection] ?? [];
    },
    async update(collection, id, data) {
      updated.push({ collection, id, data });
      return { id, ...data };
    }
  };
}

describe("runScheduledPublish", () => {
  it("publishes due scheduled docs across collections", async () => {
    const client = fakeClient({
      posts: [{ id: 10, status: "scheduled", publishedAt: "2026-06-14T11:00:00.000Z" }],
      pages: [{ id: 20, status: "scheduled", publishedAt: "2026-06-14T10:00:00.000Z" }]
    });
    const report = await runScheduledPublish({ client, now, logger: {} });
    assert.equal(report.published.length, 2);
    assert.deepEqual(
      client.updated.map((u) => `${u.collection}/${u.id}=${u.data.status}`),
      ["posts/10=published", "pages/20=published"]
    );
  });

  it("is a no-op when nothing is due (idempotent)", async () => {
    const client = fakeClient({ posts: [], pages: [] });
    const report = await runScheduledPublish({ client, now, logger: {} });
    assert.deepEqual(report.published, []);
    assert.equal(report.scanned, 0);
    assert.equal(client.updated.length, 0);
  });

  it("records failures without aborting the rest", async () => {
    const client = fakeClient({
      posts: [
        { id: 1, status: "scheduled", publishedAt: "2026-06-14T11:00:00.000Z" },
        { id: 2, status: "scheduled", publishedAt: "2026-06-14T11:00:00.000Z" }
      ],
      pages: []
    });
    const original = client.update;
    client.update = async (collection, id, data) => {
      if (id === 1) {
        throw new Error("boom");
      }
      return original(collection, id, data);
    };
    const report = await runScheduledPublish({ client, now, logger: {} });
    assert.equal(report.failed.length, 1);
    assert.equal(report.failed[0].id, 1);
    assert.equal(report.published.length, 1);
    assert.equal(report.published[0].id, 2);
  });
});
