// Dependency-free SEO helpers shared by the layout and the feed/sitemap
// endpoints. All functions are pure and framework-agnostic (the Astro pages
// pass `Astro.site`), so they can be unit-tested with node:test.

export const SITE_NAME = "George Dallas";
export const DEFAULT_DESCRIPTION =
  "George Dallas — AI engineer, therapist, systems thinker on Vancouver Island.";
// Fallback social image. SVG is fine for the baseline; a 1200x630 raster
// version can replace it with the social-preview work (GDW-038).
export const DEFAULT_OG_IMAGE = "/brand/cedar-circuitry-wordmark.svg";

// Normalize an origin (URL or string) to a string with no trailing slash.
export function siteOrigin(site) {
  const raw = site instanceof URL ? site.origin : String(site ?? "");
  return raw.replace(/\/+$/, "");
}

// Build an absolute URL from a site origin and a path or relative reference.
// Already-absolute http(s) URLs are returned unchanged.
export function absoluteUrl(pathOrUrl, site) {
  const value = String(pathOrUrl ?? "");
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${siteOrigin(site)}${path}`;
}

// Canonical URL for a route: absolute, with the trailing slash stripped except
// for the site root. Astro's directory build emits "/about/" paths; the site
// promotes clean "/about" links, so canonical matches the clean form.
export function canonicalUrl(pathname, site) {
  let path = String(pathname ?? "/");
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  if (path.length > 1) {
    path = path.replace(/\/+$/, "");
  }
  return `${siteOrigin(site)}${path || "/"}`;
}

function mediaUrl(media, site) {
  return media?.url ? absoluteUrl(media.url, site) : null;
}

// Resolve the effective meta for a page from page-level overrides and optional
// site settings, falling back to the shared defaults.
export function resolveSeo(page = {}, settings = null, site = undefined) {
  const description = page.description ?? settings?.defaultDescription ?? DEFAULT_DESCRIPTION;
  const image =
    (page.image ? absoluteUrl(page.image, site) : null) ??
    mediaUrl(settings?.defaultSocialImage, site) ??
    absoluteUrl(DEFAULT_OG_IMAGE, site);
  return {
    title: page.title,
    description,
    canonical: canonicalUrl(page.pathname ?? "/", site),
    image,
    ogType: page.ogType ?? "website",
    siteName: settings?.siteTitle ?? SITE_NAME
  };
}

export function websiteJsonLd(options = {}) {
  const { site, name = SITE_NAME, description = DEFAULT_DESCRIPTION } = options;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: `${siteOrigin(site)}/`,
    description
  };
}

export function personJsonLd(options = {}) {
  const { site, name = SITE_NAME, sameAs } = options;
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: `${siteOrigin(site)}/`
  };
  if (Array.isArray(sameAs) && sameAs.length > 0) {
    person.sameAs = sameAs;
  }
  return person;
}

export function articleJsonLd(post, options = {}) {
  const { site, settings } = options;
  const canonical = canonicalUrl(`/writing/${post.slug}`, site);
  const author = settings?.ownerName ?? SITE_NAME;
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    url: canonical,
    mainEntityOfPage: canonical,
    author: { "@type": "Person", name: author },
    publisher: { "@type": "Person", name: author },
    image:
      mediaUrl(post.socialImage, site) ??
      mediaUrl(post.featuredImage, site) ??
      mediaUrl(settings?.defaultSocialImage, site) ??
      absoluteUrl(DEFAULT_OG_IMAGE, site),
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined
  };
  // Drop keys that resolved to undefined so the emitted JSON-LD stays clean.
  return JSON.parse(JSON.stringify(data));
}

export function projectJsonLd(project, options = {}) {
  const { site, settings } = options;
  const canonical = canonicalUrl(`/projects/${project.slug}`, site);
  const author = settings?.ownerName ?? SITE_NAME;
  const technologies = Array.isArray(project.technologies) ? project.technologies.filter(Boolean) : [];
  const data = {
    "@context": "https://schema.org",
    "@type": project.githubUrl ? "SoftwareSourceCode" : "CreativeWork",
    name: project.title,
    description: project.summary ?? undefined,
    url: canonical,
    mainEntityOfPage: canonical,
    author: { "@type": "Person", name: author },
    image: mediaUrl(project.image, site) ?? undefined,
    keywords: technologies.length > 0 ? technologies.join(", ") : undefined,
    codeRepository: project.githubUrl ?? undefined,
    dateCreated: project.startDate ? new Date(project.startDate).toISOString() : undefined,
    dateModified: project.updatedAt ? new Date(project.updatedAt).toISOString() : undefined
  };
  // Drop keys that resolved to undefined so the emitted JSON-LD stays clean.
  return JSON.parse(JSON.stringify(data));
}

// Serialize JSON-LD for embedding in a <script> tag, escaping "<" so a value
// can never close the script element early.
export function jsonLdToString(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
