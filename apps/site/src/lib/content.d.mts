import type {
  PublicLink,
  PublicNowPage,
  PublicPage,
  PublicPost,
  PublicProject,
  PublicSiteSettings
} from "./cms.mjs";

export function loadSiteSettings(): Promise<PublicSiteSettings | null>;
export function loadPublishedPosts(): Promise<PublicPost[]>;
export function loadPublishedPost(slug: string): Promise<PublicPost | null>;
export function loadPublishedPage(slug: string): Promise<PublicPage | null>;
export function loadProjects(): Promise<PublicProject[]>;
export function loadLinks(): Promise<PublicLink[]>;
export function loadNowPage(): Promise<PublicNowPage | null>;
