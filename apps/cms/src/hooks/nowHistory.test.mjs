import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isNowSnapshotEmpty,
  nowContentSignature,
  shouldArchiveNow,
  snapshotDataFromNow
} from "./nowHistory.mjs";

describe("now history snapshot logic", () => {
  const published = { status: "published", currentFocus: "Writing", work: "CMS", reading: "" };

  it("archives a published Now that differs from the latest entry", () => {
    assert.equal(shouldArchiveNow(published, undefined), true);
    assert.equal(shouldArchiveNow(published, { currentFocus: "Something else" }), true);
  });

  it("does not archive drafts or empty content", () => {
    assert.equal(shouldArchiveNow({ ...published, status: "draft" }, undefined), false);
    assert.equal(shouldArchiveNow({ status: "published", currentFocus: "  " }, undefined), false);
    assert.equal(isNowSnapshotEmpty({ status: "published" }), true);
  });

  it("does not archive when content matches the latest entry (dedupe)", () => {
    const latest = { currentFocus: "Writing", work: "CMS", reading: "" };
    assert.equal(nowContentSignature(latest), nowContentSignature(published));
    assert.equal(shouldArchiveNow(published, latest), false);
  });

  it("builds snapshot data with a capture timestamp and all content fields", () => {
    const data = snapshotDataFromNow(published, new Date("2026-07-09T00:00:00.000Z"));
    assert.equal(data.capturedAt, "2026-07-09T00:00:00.000Z");
    assert.equal(data.currentFocus, "Writing");
    assert.equal(data.watching, null);
  });
});
