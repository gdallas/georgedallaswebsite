import type { PublicPost, PublicSiteSettings } from "./cms.mjs";

export const SITE_NAME: string;
export const DEFAULT_DESCRIPTION: string;
export const DEFAULT_OG_IMAGE: string;

export function siteOrigin(site?: URL | string): string;
export function absoluteUrl(pathOrUrl: string, site?: URL | string): string;
export function canonicalUrl(pathname: string, site?: URL | string): string;

export type ResolvedSeo = {
  title?: string;
  description: string;
  canonical: string;
  image: string;
  ogType: string;
  siteName: string;
};

export function resolveSeo(
  page?: {
    title?: string;
    description?: string;
    image?: string;
    ogType?: string;
    pathname?: string;
  },
  settings?: PublicSiteSettings | null,
  site?: URL | string
): ResolvedSeo;

export function websiteJsonLd(options?: {
  site?: URL | string;
  name?: string;
  description?: string;
}): Record<string, unknown>;

export function personJsonLd(options?: {
  site?: URL | string;
  name?: string;
  sameAs?: string[];
}): Record<string, unknown>;

export function articleJsonLd(
  post: PublicPost,
  options?: { site?: URL | string; settings?: PublicSiteSettings | null }
): Record<string, unknown>;

export function jsonLdToString(data: unknown): string;
