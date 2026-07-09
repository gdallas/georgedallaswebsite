import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { signPayload } from "@georgedallas/shared/scheduling";
import { buildSyncBody, mapGithubRepo, projectDraftFromRepo, verifySyncRequest } from "./githubSync.mjs";

const apiRepo = {
  id: 42,
  name: "cedar",
  full_name: "gdallas/cedar",
  description: "A static site engine",
  html_url: "https://github.com/gdallas/cedar",
  homepage: "https://cedar.example",
  stargazers_count: 12,
  forks_count: 3,
  language: "TypeScript",
  topics: ["astro", "cms", 7],
  pushed_at: "2026-07-01T00:00:00Z",
  archived: false,
  fork: false
};

const SECRET = "test-webhook-secret-1234567890";

describe("github sync mapping", () => {
  it("maps the GitHub API shape and drops non-string topics", () => {
    const repo = mapGithubRepo(apiRepo);
    assert.equal(repo.githubId, 42);
    assert.equal(repo.fullName, "gdallas/cedar");
    assert.equal(repo.stars, 12);
    assert.deepEqual(repo.topics, ["astro", "cms"]);
    assert.equal(repo.isArchived, false);
  });

  it("degrades missing fields to null/empty rather than throwing", () => {
    const repo = mapGithubRepo({ id: 1, name: "x", full_name: "gdallas/x" });
    assert.equal(repo.description, null);
    assert.equal(repo.language, null);
    assert.deepEqual(repo.topics, []);
  });

  it("seeds a private draft project from a repo (never public without review)", () => {
    const draft = projectDraftFromRepo(mapGithubRepo(apiRepo));
    assert.equal(draft.status, "draft");
    assert.equal(draft.visibility, "private");
    assert.equal(draft.githubUrl, "https://github.com/gdallas/cedar");
    assert.equal(draft.slug, "cedar");
    assert.deepEqual(draft.technologies, ["TypeScript", "astro", "cms"]);
  });
});

describe("github sync request verification", () => {
  const now = 1_800_000_000_000;
  const body = buildSyncBody([apiRepo], now);

  it("accepts a fresh, well-signed request", () => {
    const result = verifySyncRequest(body, signPayload(body, SECRET), SECRET, { now });
    assert.equal(result.ok, true);
    assert.equal(result.repos.length, 1);
    assert.equal(result.repos[0].fullName, "gdallas/cedar");
  });

  it("rejects a bad signature", () => {
    const result = verifySyncRequest(body, signPayload(body, "wrong"), SECRET, { now });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid_signature");
  });

  it("rejects a stale request beyond the skew window", () => {
    const result = verifySyncRequest(body, signPayload(body, SECRET), SECRET, { now: now + 60 * 60 * 1000 });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "stale_request");
  });

  it("rejects a non-JSON body even when signed", () => {
    const raw = "not json";
    const result = verifySyncRequest(raw, signPayload(raw, SECRET), SECRET, { now });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid_body");
  });
});
