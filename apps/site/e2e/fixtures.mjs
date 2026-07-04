// Seed content for end-to-end smoke tests. Deliberately includes content that
// must NOT reach the public site (a draft, a private post, a future-scheduled
// post, a draft project) so the visibility filtering can be tested end to end.
// The mock CMS returns these unfiltered; the site's data layer is what must
// drop them.

function paragraph(text) {
  return {
    root: {
      type: "root",
      children: [{ type: "paragraph", children: [{ type: "text", text, format: 0 }] }]
    }
  };
}

export const POSTS = [
  {
    id: 1,
    title: "Test Post One",
    slug: "test-post-one",
    excerpt: "A seeded post used by the end-to-end smoke tests.",
    status: "published",
    visibility: "public",
    publishedAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    readingTime: 3,
    seoTitle: "Test Post One",
    seoDescription: "A seeded post used by the end-to-end smoke tests.",
    body: paragraph("This is the body of the seeded end-to-end test post.")
  },
  {
    id: 2,
    title: "Hidden Draft Post",
    slug: "draft-post",
    excerpt: "Should never be visible.",
    status: "draft",
    visibility: "public",
    publishedAt: "2026-01-15T00:00:00.000Z",
    body: paragraph("Draft body.")
  },
  {
    id: 3,
    title: "Hidden Private Post",
    slug: "private-post",
    excerpt: "Should never be visible.",
    status: "published",
    visibility: "private",
    publishedAt: "2026-01-15T00:00:00.000Z",
    body: paragraph("Private body.")
  },
  {
    id: 4,
    title: "Hidden Future Post",
    slug: "future-post",
    excerpt: "Should never be visible.",
    status: "published",
    visibility: "public",
    publishedAt: "2099-01-15T00:00:00.000Z",
    body: paragraph("Future body.")
  }
];

export const PAGES = [
  {
    id: 1,
    title: "About George",
    slug: "about",
    status: "published",
    visibility: "public",
    publishedAt: "2026-01-15T00:00:00.000Z",
    seoTitle: "About George",
    seoDescription: "About the seeded test site.",
    body: paragraph("This is the seeded about page body.")
  }
];

export const PROJECTS = [
  {
    id: 1,
    title: "Seed Project",
    slug: "seed-project",
    status: "published",
    visibility: "public",
    summary: "A seeded project for the smoke tests.",
    technologies: ["Astro", "AWS"],
    githubUrl: "https://github.com/example/seed-project",
    sortOrder: 1
  },
  {
    id: 2,
    title: "Hidden Draft Project",
    slug: "hidden-project",
    status: "draft",
    visibility: "public",
    summary: "Should never be visible.",
    sortOrder: 2
  }
];

export const LINKS = [
  {
    id: 1,
    title: "GitHub",
    url: "https://github.com/gdallas",
    status: "published",
    visibility: "public",
    category: "professional",
    description: "Code and projects.",
    sortOrder: 1
  }
];

export const TIMELINE_ENTRIES = [
  {
    id: 1,
    title: "Started clinical training",
    type: "education",
    eventDate: "2026-04-10T00:00:00.000Z",
    status: "published",
    visibility: "public",
    summary: "A seeded education milestone for the public timeline.",
    sortOrder: 1
  },
  {
    id: 2,
    title: "Shipped the personal site",
    type: "project",
    eventDate: "2026-03-20T00:00:00.000Z",
    status: "published",
    visibility: "public",
    summary: "A project milestone that should appear on the opposite side of the tree.",
    sortOrder: 2
  },
  {
    id: 3,
    title: "Published a seeded essay",
    type: "writing",
    eventDate: "2026-02-15T00:00:00.000Z",
    status: "published",
    visibility: "public",
    summary: "A writing milestone used to exercise timeline category color coding.",
    sortOrder: 3
  }
];

export const NOW_PAGE = {
  status: "published",
  currentFocus: "Shipping the personal site",
  work: "Building the CMS and public site",
  reading: "A good systems book",
  updatedAt: "2026-06-01T00:00:00.000Z"
};

export const SITE_SETTINGS = {
  siteTitle: "George Dallas",
  ownerName: "George Dallas",
  defaultSeoTitle: "George Dallas",
  defaultDescription: "AI engineer, therapist, and systems thinker.",
  primaryLinks: [{ label: "Email", url: "mailto:george@example.com" }]
};

// Maps request pathnames to the JSON the mock CMS should return. Collection
// endpoints return { docs }; globals return the object directly.
export const RESPONSES = {
  "/api/posts": { docs: POSTS },
  "/api/pages": { docs: PAGES },
  "/api/projects": { docs: PROJECTS },
  "/api/links": { docs: LINKS },
  "/api/timeline-entries": { docs: TIMELINE_ENTRIES },
  "/api/globals/now-page": NOW_PAGE,
  "/api/globals/site-settings": SITE_SETTINGS
};
