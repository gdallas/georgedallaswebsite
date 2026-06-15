import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkedKindsFor, linkKinds, qualityKinds, reconcileIssues } from "./reconcile.mjs";

const fp = (s) => s;

describe("checkedKindsFor", () => {
  it("includes only the requested categories", () => {
    assert.deepEqual(checkedKindsFor({ quality: true, links: false }), qualityKinds);
    assert.deepEqual(checkedKindsFor({ quality: false, links: true }), linkKinds);
  });
});

describe("reconcileIssues", () => {
  const existing = [
    { id: 1, kind: "missing_excerpt", fingerprint: fp("a") },
    { id: 2, kind: "broken_link", fingerprint: fp("b") },
    { id: 3, kind: "missing_seo_title", fingerprint: fp("c") }
  ];

  it("creates new, touches existing, and resolves fixed (within checked kinds)", () => {
    const findings = [
      { kind: "missing_excerpt", fingerprint: fp("a") }, // still present -> touch #1
      { kind: "broken_link", fingerprint: fp("d") } // new -> create
      // "b" (broken_link) and "c" (missing_seo_title) gone -> resolve
    ];
    const { toCreate, toTouch, toResolve } = reconcileIssues(existing, findings, checkedKindsFor());
    assert.deepEqual(toCreate.map((f) => f.fingerprint), ["d"]);
    assert.deepEqual(toTouch.map((t) => t.id), [1]);
    assert.deepEqual(toResolve.map((i) => i.id).sort(), [2, 3]);
  });

  it("does not resolve kinds that were not checked this run", () => {
    // links-only run: quality issues must be left untouched even if absent.
    const { toResolve } = reconcileIssues(existing, [], checkedKindsFor({ quality: false, links: true }));
    assert.deepEqual(toResolve.map((i) => i.id), [2]);
  });
});
