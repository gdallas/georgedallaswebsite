import type {
  PublicBook,
  PublicLink,
  PublicNowEntry,
  PublicNowPage,
  PublicPage,
  PublicPost,
  PublicProject,
  PublicSiteSettings,
  PublicTimelineEntry
} from "./cms.mjs";

export function loadSiteSettings(): Promise<PublicSiteSettings | null>;
export function loadPublishedPosts(): Promise<PublicPost[]>;
export function loadPublishedPost(slug: string): Promise<PublicPost | null>;
export function loadPublishedPage(slug: string): Promise<PublicPage | null>;
export function loadProjects(): Promise<PublicProject[]>;
export function loadLinks(): Promise<PublicLink[]>;
export function loadBooks(): Promise<PublicBook[]>;
export function loadCurrentlyReadingBooks(): Promise<PublicBook[]>;
export function loadTimelineEntries(): Promise<PublicTimelineEntry[]>;
export function loadNowPage(): Promise<PublicNowPage | null>;
export function loadNowHistory(): Promise<PublicNowEntry[]>;
export function loadActiveRedirectRoutes(): Promise<
  Array<{ params: { redirect: string }; props: { source: string; destination: string; statusCode: string } }>
>;
