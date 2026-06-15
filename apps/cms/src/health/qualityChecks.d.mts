export type Finding = {
  kind: string;
  severity: "info" | "warning" | "error";
  collection: string;
  documentId: string;
  url?: string;
  httpStatus?: number;
  detail: string;
  fingerprint: string;
};

export const defaultStaleNowDays: number;
export function fingerprint(kind: string, collection: string, documentId: unknown, url?: string): string;
export function checkPost(post: Record<string, unknown>): Finding[];
export function checkPage(page: Record<string, unknown>): Finding[];
export function checkMedia(media: Record<string, unknown>): Finding[];
export function checkNowPage(
  nowPage: Record<string, unknown> | null,
  options?: { now?: Date | string; staleNowDays?: number }
): Finding[];
export function runQualityChecks(input: {
  posts?: Record<string, unknown>[];
  pages?: Record<string, unknown>[];
  media?: Record<string, unknown>[];
  nowPage?: Record<string, unknown> | null;
  now?: Date | string;
  staleNowDays?: number;
}): Finding[];
