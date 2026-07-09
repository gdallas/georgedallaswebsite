import type { RedirectRecord } from "@georgedallas/shared/redirects";

export type CmsClientConfig = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  now?: Date;
};

export type MediaRef = {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

export type PublicTag = {
  id: number | string;
  name?: string | null;
  slug?: string | null;
};

export type PublicPost = {
  id: number | string;
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: unknown;
  publishedAt?: string | null;
  updatedAt?: string | null;
  readingTime?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  featuredImage?: MediaRef | null;
  socialImage?: MediaRef | null;
  // Depth=1 responses resolve tags to objects; deeper truncation can leave ids.
  tags?: PublicTag[] | Array<number | string> | null;
};

export type PublicPage = {
  id: number | string;
  title: string;
  slug: string;
  body?: unknown;
  template?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  showInNav?: boolean | null;
};

export type PublicProject = {
  id: number | string;
  title: string;
  slug: string;
  summary?: string | null;
  description?: unknown;
  featured?: boolean | null;
  technologies?: string[] | null;
  githubUrl?: string | null;
  liveUrl?: string | null;
  caseStudyUrl?: string | null;
  image?: MediaRef | null;
  sortOrder?: number | null;
};

export type PublicLink = {
  id: number | string;
  title: string;
  url: string;
  description?: string | null;
  category?: string | null;
  icon?: string | null;
  featured?: boolean | null;
  sortOrder?: number | null;
};

export type BookReadingStatus = "reading" | "finished" | "paused" | "want_to_read" | "reference";

export type PublicBook = {
  id: number | string;
  title: string;
  author: string;
  isbn?: string | null;
  coverImage?: MediaRef | null;
  coverUrl?: string | null;
  readingStatus?: BookReadingStatus | null;
  rating?: number | null;
  dateStarted?: string | null;
  dateFinished?: string | null;
  notes?: unknown;
  relatedPosts?: PublicPost[] | Array<number | string> | null;
  externalUrl?: string | null;
  sortOrder?: number | null;
};

export type TimelineEntryType = "career" | "project" | "writing" | "education" | "personal" | "site_update";

export type PublicTimelineEntry = {
  id: number | string;
  title: string;
  eventDate: string;
  type?: TimelineEntryType | null;
  summary?: string | null;
  body?: unknown;
  image?: MediaRef | null;
  links?: Array<{ label?: string | null; url?: string | null }> | null;
  relatedPosts?: PublicPost[] | Array<number | string> | null;
  relatedProjects?: PublicProject[] | Array<number | string> | null;
  sortOrder?: number | null;
};

export type PublicNowPage = {
  status?: string | null;
  currentFocus?: string | null;
  work?: string | null;
  reading?: string | null;
  listening?: string | null;
  watching?: string | null;
  personal?: string | null;
  updatedAt?: string | null;
};

export type PublicNowEntry = {
  id: number | string;
  capturedAt: string;
  currentFocus?: string | null;
  work?: string | null;
  reading?: string | null;
  listening?: string | null;
  watching?: string | null;
  personal?: string | null;
};

export type PublicSiteSettings = {
  siteTitle?: string | null;
  ownerName?: string | null;
  defaultSeoTitle?: string | null;
  defaultDescription?: string | null;
  defaultSocialImage?: MediaRef | null;
  primaryLinks?: Array<{ label: string; url: string }> | null;
  navigation?: Array<{ label: string; path: string; showInHeader?: boolean; showInFooter?: boolean }> | null;
  footerText?: string | null;
  footerLinks?: Array<{ label: string; url: string }> | null;
};

export class CmsUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown });
}

export function encodeWhere(where: Record<string, unknown>): string;
export function getPublishedPosts(config?: CmsClientConfig): Promise<PublicPost[]>;
export function getPublishedPost(slug: string, config?: CmsClientConfig): Promise<PublicPost | null>;
export function getPublishedPages(config?: CmsClientConfig): Promise<PublicPage[]>;
export function getPublishedPage(slug: string, config?: CmsClientConfig): Promise<PublicPage | null>;
export function getPublicProjects(config?: CmsClientConfig): Promise<PublicProject[]>;
export function getPublicLinks(config?: CmsClientConfig): Promise<PublicLink[]>;
export function getPublicBooks(config?: CmsClientConfig): Promise<PublicBook[]>;
export function getCurrentlyReadingBooks(config?: CmsClientConfig): Promise<PublicBook[]>;
export function getPublicTimelineEntries(config?: CmsClientConfig): Promise<PublicTimelineEntry[]>;
export function getNowPage(config?: CmsClientConfig): Promise<PublicNowPage | null>;
export function getNowHistory(config?: CmsClientConfig): Promise<PublicNowEntry[]>;
export function getSiteSettings(config?: CmsClientConfig): Promise<PublicSiteSettings>;
export function getActiveRedirects(config?: CmsClientConfig): Promise<RedirectRecord[]>;
