import type { Finding } from "./qualityChecks.d.mts";

export type ExtractedLink = {
  url: string;
  collection: string;
  documentId: string;
};

export function isCheckableUrl(url: unknown): boolean;
export function extractRichTextLinks(value: unknown): string[];
export function extractLinks(collection: string, doc: Record<string, unknown>): ExtractedLink[];
export function classifyLink(input?: { status?: number; error?: string }): "ok" | "broken" | "skipped";
export function brokenLinkFinding(input: {
  url: string;
  collection: string;
  documentId: string | number;
  status?: number;
  error?: string;
}): Finding;
