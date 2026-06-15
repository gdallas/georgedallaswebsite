// Pure reconciliation between the findings of a check run and the already-open
// content-issues (GDW-037). Keeps the runner idempotent: unchanged problems are
// touched (checkedAt refreshed), new ones created, and ones that have since been
// fixed auto-resolved — but only for the kinds actually evaluated this run.

export const qualityKinds = [
  "missing_excerpt",
  "missing_seo_title",
  "missing_seo_description",
  "missing_social_image",
  "media_missing_alt",
  "stale_now"
];

export const linkKinds = ["broken_link"];

export function checkedKindsFor({ quality = true, links = true } = {}) {
  return [...(quality ? qualityKinds : []), ...(links ? linkKinds : [])];
}

export function reconcileIssues(existingOpen = [], findings = [], checkedKinds = []) {
  const checked = new Set(checkedKinds);
  const existingByFingerprint = new Map(existingOpen.map((issue) => [issue.fingerprint, issue]));
  const currentFingerprints = new Set(findings.map((f) => f.fingerprint));

  const toCreate = [];
  const toTouch = [];
  for (const f of findings) {
    const existing = existingByFingerprint.get(f.fingerprint);
    if (existing) {
      toTouch.push({ id: existing.id, finding: f });
    } else {
      toCreate.push(f);
    }
  }

  // Auto-resolve only issues whose kind we actually re-checked and that are no
  // longer present (link fixed, metadata added). Leaves unrelated kinds alone
  // (important for --links-only / --quality-only runs).
  const toResolve = existingOpen.filter(
    (issue) => checked.has(issue.kind) && !currentFingerprints.has(issue.fingerprint)
  );

  return { toCreate, toTouch, toResolve };
}
