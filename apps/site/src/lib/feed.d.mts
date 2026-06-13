import type { PublicPost } from "./cms.mjs";

export type SitemapEntry = {
  loc: string;
  lastmod?: string | null;
  changefreq?: string;
  priority?: string;
};

export function buildRssXml(options?: {
  posts?: PublicPost[];
  site?: URL | string;
  title?: string;
  description?: string;
  feedPath?: string;
}): string;

export function collectSitemapEntries(options?: {
  posts?: PublicPost[];
  site?: URL | string;
  staticRoutes?: Array<{ path: string; changefreq?: string; priority?: string }>;
}): SitemapEntry[];

export function buildSitemapXml(entries?: SitemapEntry[]): string;

export function buildRobotsTxt(options?: { site?: URL | string; sitemapPath?: string }): string;
