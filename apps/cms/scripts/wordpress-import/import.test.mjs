import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runWordpressImport } from "./import.mjs";

// In-memory Payload client: one array per collection, auto-incrementing ids,
// equality lookups. Enough to exercise the whole pipeline without a CMS.
function fakeClient() {
  const db = {
    "import-jobs": [],
    "imported-items": [],
    "import-issues": [],
    posts: [],
    redirects: [],
    media: []
  };
  let nextId = 1;
  return {
    db,
    async create(collection, data) {
      const doc = { id: nextId++, ...data };
      db[collection].push(doc);
      return doc;
    },
    async update(collection, id, data) {
      const doc = db[collection].find((row) => row.id === id);
      Object.assign(doc, data);
      return doc;
    },
    async findOne(collection, field, value) {
      return db[collection].find((row) => String(row[field]) === String(value)) ?? null;
    },
    async uploadMedia(buffer, meta) {
      const doc = { id: nextId++, ...meta };
      db.media.push(doc);
      return doc;
    }
  };
}

const downloadOk = async () => ({ buffer: Buffer.from("img-bytes"), mimeType: "image/png" });

const posts = [
  {
    id: 1,
    slug: "with-image",
    link: "https://blog.example.com/2020/05/with-image/",
    title: { rendered: "With image" },
    excerpt: { rendered: "<p>An excerpt.</p>" },
    content: { rendered: '<p>Text with a <a href="https://x.com/a">link</a>.</p><figure><img src="https://b/a.png" alt="A"/></figure>' }
  },
  {
    id: 2,
    slug: "needs-work",
    link: "https://blog.example.com/2019/03/needs-work/",
    title: { rendered: "Needs work" },
    content: { rendered: '<p>No excerpt, a [gallery], and a bad <img src="https://b/broken.png"></p>' }
  }
];

describe("runWordpressImport", () => {
  it("imports posts, media, issues, redirects, and tracks a job", async () => {
    const client = fakeClient();
    const report = await runWordpressImport({ posts, client, downloadImage: downloadOk, source: "https://api" });

    assert.equal(report.imported, 2);
    assert.equal(report.failed, 0);
    assert.equal(client.db.posts.length, 2);
    assert.equal(client.db["import-jobs"].length, 1);
    assert.equal(client.db["import-jobs"][0].status, "completed");
    assert.equal(client.db["imported-items"].length, 2);

    // Post 1: image downloaded, uploaded, and relinked to an upload node.
    assert.equal(client.db.media.length, 2);
    const withImage = client.db.posts.find((p) => p.wordpressOriginalId === "1");
    assert.ok(JSON.stringify(withImage.body).includes('"upload"'));
    assert.ok(!JSON.stringify(withImage.body).includes("wp-image"));
    // The inline link survived conversion.
    assert.ok(JSON.stringify(withImage.body).includes("https://x.com/a"));

    // A redirect was proposed from the old permalink.
    const redirect = client.db.redirects.find((r) => r.sourcePath === "/2020/05/with-image");
    assert.equal(redirect.destination, "/writing/with-image");

    // Post 2: missing excerpt + shortcode -> issues + needs review.
    const item2 = client.db["imported-items"].find((i) => i.wordpressId === "2");
    assert.equal(item2.status, "needs_review");
    const kinds = client.db["import-issues"].map((i) => i.kind);
    assert.ok(kinds.includes("missing_excerpt"));
    assert.ok(kinds.includes("unsupported_shortcode"));
    assert.ok(report.needsReview >= 1);
  });

  it("flags media that fail to download and still imports the post", async () => {
    const client = fakeClient();
    const downloadFail = async () => {
      throw new Error("404");
    };
    await runWordpressImport({ posts: [posts[0]], client, downloadImage: downloadFail });

    assert.equal(client.db.posts.length, 1);
    assert.equal(client.db.media.length, 0);
    const kinds = client.db["import-issues"].map((i) => i.kind);
    assert.ok(kinds.includes("media_download_failed"));
    assert.ok(kinds.includes("image_relink_failed"));
  });

  it("is idempotent and resumable on re-run", async () => {
    const client = fakeClient();
    await runWordpressImport({ posts, client, downloadImage: downloadOk });
    const second = await runWordpressImport({ posts, client, downloadImage: downloadOk });

    assert.equal(second.imported, 0);
    assert.equal(second.skipped, 2);
    assert.equal(client.db.posts.length, 2, "no duplicate posts");
    assert.equal(client.db["imported-items"].length, 2, "no duplicate items");
  });

  it("skips a post already present by wordpressOriginalId (no imported-items row)", async () => {
    const client = fakeClient();
    // Simulates a post imported before the import collections existed.
    client.db.posts.push({ id: 50, slug: "with-image", wordpressOriginalId: "1" });
    const report = await runWordpressImport({ posts: [posts[0]], client, downloadImage: downloadOk });

    assert.equal(report.skipped, 1);
    assert.equal(report.imported, 0);
    assert.equal(client.db.posts.length, 1, "must not duplicate the existing post");
  });

  it("disambiguates and flags a duplicate slug from a different post", async () => {
    const client = fakeClient();
    client.db.posts.push({ id: 99, slug: "with-image", wordpressOriginalId: "555" });
    await runWordpressImport({ posts: [posts[0]], client, downloadImage: downloadOk });

    const imported = client.db.posts.find((p) => p.wordpressOriginalId === "1");
    assert.equal(imported.slug, "with-image-wp1");
    assert.ok(client.db["import-issues"].some((i) => i.kind === "duplicate_slug"));
  });

  it("records failures without aborting the run", async () => {
    const client = fakeClient();
    let calls = 0;
    const original = client.create;
    client.create = async (collection, data) => {
      if (collection === "posts") {
        calls += 1;
        if (calls === 1) {
          throw new Error("CMS create failed: HTTP 422.");
        }
      }
      return original(collection, data);
    };
    const report = await runWordpressImport({ posts, client, downloadImage: downloadOk });
    assert.equal(report.failed, 1);
    assert.equal(report.imported, 1);
    assert.ok(client.db["imported-items"].some((i) => i.status === "failed"));
  });

  it("requires a client", async () => {
    await assert.rejects(runWordpressImport({ posts }), /client is required/);
  });
});
