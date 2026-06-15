import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { datedKind, decideMarkers, globalKind, listingKind, markerKey } from "./markers.mjs";

const now = new Date("2026-06-14T12:00:00.000Z");
const published = {
  id: 7,
  status: "published",
  visibility: "public",
  publishedAt: "2026-06-01T00:00:00.000Z"
};
const draft = { id: 7, status: "draft", visibility: "private", publishedAt: null };
const future = "2026-06-20T09:00:00.000Z";

const types = (markers) => markers.map((m) => m.type).sort();

describe("decideMarkers — rebuild signals", () => {
  it("rebuilds when a post is published", () => {
    const markers = decideMarkers({ kind: datedKind, collection: "posts", doc: published, previousDoc: draft, now });
    const rebuild = markers.find((m) => m.type === "rebuild");
    assert.ok(rebuild);
    assert.equal(rebuild.reason, "visible");
  });

  it("rebuilds when a published post is unpublished", () => {
    const markers = decideMarkers({ kind: datedKind, collection: "posts", doc: draft, previousDoc: published, now });
    const rebuild = markers.find((m) => m.type === "rebuild");
    assert.ok(rebuild);
    assert.equal(rebuild.reason, "unpublished");
  });

  it("rebuilds when a published post is edited", () => {
    const edited = { ...published, title: "new" };
    const markers = decideMarkers({ kind: datedKind, collection: "posts", doc: edited, previousDoc: published, now });
    assert.deepEqual(types(markers), ["rebuild"]);
  });

  it("stays quiet for a draft-only edit", () => {
    const markers = decideMarkers({ kind: datedKind, collection: "posts", doc: draft, previousDoc: { ...draft, title: "x" }, now });
    assert.deepEqual(markers, []);
  });

  it("rebuilds when a published post is deleted", () => {
    const markers = decideMarkers({ kind: datedKind, collection: "posts", doc: published, operation: "delete", now });
    const rebuild = markers.find((m) => m.type === "rebuild");
    assert.ok(rebuild);
    assert.equal(rebuild.reason, "deleted");
  });

  it("does not rebuild when a private draft is deleted", () => {
    const markers = decideMarkers({ kind: datedKind, collection: "posts", doc: draft, operation: "delete", now });
    assert.deepEqual(markers, []);
  });

  it("treats future-dated published posts as not yet visible (no rebuild on creation)", () => {
    const scheduledDoc = { id: 7, status: "published", visibility: "public", publishedAt: future };
    const markers = decideMarkers({ kind: datedKind, collection: "posts", doc: scheduledDoc, previousDoc: draft, now });
    assert.deepEqual(markers, []);
  });
});

describe("decideMarkers — schedule signals", () => {
  it("upserts a schedule when a post becomes scheduled", () => {
    const scheduled = { id: 7, status: "scheduled", visibility: "public", publishedAt: future };
    const markers = decideMarkers({ kind: datedKind, collection: "posts", doc: scheduled, previousDoc: draft, now });
    const schedule = markers.find((m) => m.type === "schedule");
    assert.ok(schedule);
    assert.equal(schedule.action, "upsert");
    assert.equal(schedule.publishedAt, new Date(future).toISOString());
  });

  it("deletes the schedule when a scheduled post is published early", () => {
    const scheduled = { id: 7, status: "scheduled", visibility: "public", publishedAt: future };
    const markers = decideMarkers({ kind: datedKind, collection: "posts", doc: published, previousDoc: scheduled, now });
    assert.deepEqual(types(markers), ["rebuild", "schedule"]);
    assert.equal(markers.find((m) => m.type === "schedule").action, "delete");
  });

  it("deletes the schedule when a scheduled post is deleted", () => {
    const scheduled = { id: 7, status: "scheduled", visibility: "public", publishedAt: future };
    const markers = decideMarkers({ kind: datedKind, collection: "posts", doc: scheduled, operation: "delete", now });
    assert.equal(markers.find((m) => m.type === "schedule").action, "delete");
  });

  it("never emits schedule markers for listing content", () => {
    const proj = { id: 3, status: "published", visibility: "public" };
    const markers = decideMarkers({ kind: listingKind, collection: "projects", doc: proj, previousDoc: { id: 3, status: "draft", visibility: "private" }, now });
    assert.deepEqual(types(markers), ["rebuild"]);
  });
});

describe("decideMarkers — globals", () => {
  it("always emits a rebuild for a global change (no schedule, no visibility check)", () => {
    const markers = decideMarkers({ kind: globalKind, collection: "now-page", doc: { id: 1, status: "published" }, now });
    assert.deepEqual(types(markers), ["rebuild"]);
    assert.equal(markers[0].reason, "global");
  });

  it("falls back to the collection slug when the global has no id", () => {
    const markers = decideMarkers({ kind: globalKind, collection: "site-settings", doc: {}, now });
    assert.equal(markers[0].id, "site-settings");
  });
});

describe("markerKey", () => {
  it("uses a stable per-doc key for schedules so latest intent wins", () => {
    const key = markerKey("publish/", { type: "schedule", action: "upsert", collection: "posts", id: "7" }, now);
    assert.equal(key, "publish/schedule/posts/7.json");
  });

  it("uses a unique timestamped key for rebuilds", () => {
    const key = markerKey("publish/", { type: "rebuild", collection: "posts", id: "7", reason: "visible" }, now);
    assert.equal(key, `publish/rebuild/posts/7.${now.getTime()}.json`);
  });
});
