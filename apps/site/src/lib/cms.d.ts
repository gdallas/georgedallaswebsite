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

export type PublicPost = {
  id: number | string;
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: unknown;
  publishedAt?: string | null;
  readingTime?: number | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  featuredImage?: MediaRef | null;
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
export function getNowPage(config?: CmsClientConfig): Promise<PublicNowPage | null>;
export function getSiteSettings(config?: CmsClientConfig): Promise<PublicSiteSettings>;
