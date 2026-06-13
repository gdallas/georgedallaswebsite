import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isNowPagePublic,
  isPublicBuildVisible,
  isPublicListingVisible,
  publicBuildWhere,
  publicListingWhere
} from "./visibility.mjs";

describe("public visibility", () => {
  const now = "2026-06-13T00:00:00.000Z";

  it("treats only published, public, past-dated posts as visible", () => {
    assert.equal(isPublicBuildVisible({ status: "published", visibility: "public", publishedAt: "2026-06-01T00:00:00.000Z" }, now), true);
    assert.equal(isPublicBuildVisible({ status: "draft", visibility: "public", publishedAt: "2026-06-01T00:00:00.000Z" }, now), false);
    assert.equal(isPublicBuildVisible({ status: "published", visibility: "private", publishedAt: "2026-06-01T00:00:00.000Z" }, now), false);
    assert.equal(isPublicBuildVisible({ status: "published", visibility: "public", publishedAt: "2026-07-01T00:00:00.000Z" }, now), false);
    assert.equal(isPublicBuildVisible({ status: "published", visibility: "public" }, now), false);
  });

  it("builds a post where-clause requiring published, public, and a past publish date", () => {
    const where = publicBuildWhere(now);
    assert.deepEqual(where.and[0], { status: { equals: "published" } });
    assert.deepEqual(where.and[1], { visibility: { equals: "public" } });
    assert.deepEqual(where.and[2], { publishedAt: { less_than_equal: now } });
  });

  it("treats only published, public listing items as visible", () => {
    assert.equal(isPublicListingVisible({ status: "published", visibility: "public" }), true);
    assert.equal(isPublicListingVisible({ status: "draft", visibility: "public" }), false);
    assert.equal(isPublicListingVisible({ status: "archived", visibility: "public" }), false);
    assert.equal(isPublicListingVisible({ status: "published", visibility: "unlisted" }), false);
  });

  it("builds a listing where-clause requiring published and public", () => {
    assert.deepEqual(publicListingWhere(), {
      and: [{ status: { equals: "published" } }, { visibility: { equals: "public" } }]
    });
  });

  it("exposes the Now page only when published", () => {
    assert.equal(isNowPagePublic({ status: "published" }), true);
    assert.equal(isNowPagePublic({ status: "draft" }), false);
    assert.equal(isNowPagePublic(undefined), false);
  });
});
