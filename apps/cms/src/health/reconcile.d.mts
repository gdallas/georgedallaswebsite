import type { Finding } from "./qualityChecks.d.mts";

export type ExistingIssue = { id: string | number; fingerprint: string; kind: string };

export const qualityKinds: string[];
export const linkKinds: string[];
export function checkedKindsFor(options?: { quality?: boolean; links?: boolean }): string[];
export function reconcileIssues(
  existingOpen: ExistingIssue[],
  findings: Finding[],
  checkedKinds: string[]
): {
  toCreate: Finding[];
  toTouch: Array<{ id: string | number; finding: Finding }>;
  toResolve: ExistingIssue[];
};
