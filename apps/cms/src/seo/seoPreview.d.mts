export type SeoDoc = {
  title?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  excerpt?: string | null;
  slug?: string | null;
  canonicalUrl?: string | null;
  socialImage?: { url?: string | null } | string | null;
  featuredImage?: { url?: string | null } | string | null;
};

export type LengthStatus = { length: number; status: "ok" | "short" | "long" };
export type SocialImage = { url: string; source: "social" | "featured" | "default" };
export type SeoPreview = {
  title: string;
  description: string;
  canonical: string;
  image: SocialImage;
  titleLength: LengthStatus;
  descriptionLength: LengthStatus;
};

export const DEFAULT_OG_IMAGE: string;
export const seoLimits: { title: { min: number; max: number }; description: { min: number; max: number } };
export function publicPathFor(collection: string, slug: string | null | undefined): string;
export function effectiveTitle(doc?: SeoDoc): string;
export function effectiveDescription(doc?: SeoDoc): string;
export function canonicalFor(doc?: SeoDoc, options?: { siteUrl?: string; collection?: string }): string;
export function socialImageUrl(
  doc?: SeoDoc,
  options?: { mediaBaseUrl?: string; siteUrl?: string; defaultImage?: string }
): SocialImage;
export function lengthStatus(value: string, range?: { min: number; max: number }): LengthStatus;
export function buildSeoPreview(
  doc?: SeoDoc,
  options?: { collection?: string; siteUrl?: string; mediaBaseUrl?: string }
): SeoPreview;
