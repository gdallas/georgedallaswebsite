import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeEntities, detectUnsupported, htmlToLexical, slugify, transformPost } from "./transform.mjs";

describe("slugify", () => {
  it("produces lowercase hyphenated slugs", () => {
    assert.equal(slugify("Hello, World!"), "hello-world");
    assert.equal(slugify("  Spaced   Out  "), "spaced-out");
    assert.equal(slugify("Already-good-slug"), "already-good-slug");
  });

  it("matches the CMS slug pattern", () => {
    const pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    for (const input of ["Café Notes #1", "AI & Therapy", "multiple---hyphens"]) {
      assert.match(slugify(input), pattern, `slugify(${input}) should be a valid slug`);
    }
  });

  it("falls back when nothing usable remains", () => {
    assert.equal(slugify("!!!", "post-7"), "post-7");
    assert.equal(slugify("", "post-7"), "post-7");
  });
});

describe("decodeEntities", () => {
  it("decodes named and numeric entities", () => {
    assert.equal(decodeEntities("Tom &amp; Jerry"), "Tom & Jerry");
    assert.equal(decodeEntities("it&#8217;s &#x2026;"), "it’s …");
    assert.equal(decodeEntities("a&nbsp;b"), "a b");
  });
});

describe("htmlToLexical", () => {
  it("converts paragraphs and headings into lexical nodes", () => {
    const body = htmlToLexical("<h2>Title</h2><p>First &amp; second.</p>");
    const types = body.root.children.map((node) => node.type);
    assert.deepEqual(types, ["heading", "paragraph"]);
    assert.equal(body.root.children[0].tag, "h2");
    assert.equal(body.root.children[0].children[0].text, "Title");
    assert.equal(body.root.children[1].children[0].text, "First & second.");
  });

  it("converts blockquotes and lists", () => {
    const body = htmlToLexical("<blockquote>Quoted</blockquote><ul><li>one</li><li>two</li></ul>");
    assert.deepEqual(body.root.children.map((n) => n.type), ["quote", "list"]);
    const list = body.root.children[1];
    assert.equal(list.listType, "bullet");
    assert.equal(list.children.length, 2);
    assert.equal(list.children[0].children[0].text, "one");
  });

  it("uses an ordered list for <ol>", () => {
    const body = htmlToLexical("<ol><li>first</li></ol>");
    assert.equal(body.root.children[0].listType, "number");
  });

  it("wraps loose text in a paragraph and never returns an empty root", () => {
    assert.equal(htmlToLexical("just text").root.children[0].children[0].text, "just text");
    assert.equal(htmlToLexical("").root.children.length, 1);
    assert.equal(htmlToLexical("").root.children[0].type, "paragraph");
  });

  it("drops script/style content", () => {
    const body = htmlToLexical("<p>safe</p><script>alert(1)</script>");
    const text = JSON.stringify(body);
    assert.ok(!text.includes("alert(1)"));
  });
});

describe("detectUnsupported", () => {
  it("flags shortcodes and embeds", () => {
    const warnings = detectUnsupported(
      '[gallery ids="1,2"]<p>x</p>[caption]y[/caption]<iframe src="https://yt"></iframe><!-- wp:embed -->'
    );
    assert.deepEqual(warnings.shortcodes, ["caption", "gallery"]);
    assert.ok(warnings.embeds.includes("iframe"));
    assert.ok(warnings.embeds.includes("wp:embed"));
  });

  it("returns empty arrays for clean content", () => {
    assert.deepEqual(detectUnsupported("<p>Just a paragraph.</p>"), { shortcodes: [], embeds: [] });
  });
});

describe("transformPost", () => {
  const wpPost = {
    id: 42,
    slug: "my-first-post",
    link: "https://blog.example.com/2020/my-first-post/",
    date_gmt: "2020-05-01T10:00:00",
    title: { rendered: "My &amp; First Post" },
    excerpt: { rendered: "<p>An excerpt.</p>" },
    content: { rendered: "<p>Body paragraph.</p>[gallery]" },
    _embedded: { author: [{ name: "Jane Doe" }] }
  };

  it("maps WordPress fields onto the Payload post shape", () => {
    const { data, source } = transformPost(wpPost);
    assert.equal(data.title, "My & First Post");
    assert.equal(data.slug, "my-first-post");
    assert.equal(data.excerpt, "An excerpt.");
    assert.equal(data.seoTitle, "My & First Post");
    assert.equal(data.seoDescription, "An excerpt.");
    assert.equal(data.wordpressOriginalId, "42");
    assert.equal(data.wordpressOriginalUrl, "https://blog.example.com/2020/my-first-post/");
    assert.equal(data.publishedAt, "2020-05-01T10:00:00.000Z");
    assert.equal(source.authorName, "Jane Doe");
    assert.equal(data.body.root.children[0].type, "paragraph");
  });

  it("imports as an unpublished, private draft", () => {
    const { data } = transformPost(wpPost);
    assert.equal(data.status, "draft");
    assert.equal(data.visibility, "private");
  });

  it("surfaces unsupported-content warnings", () => {
    const { warnings } = transformPost(wpPost);
    assert.deepEqual(warnings.shortcodes, ["gallery"]);
  });

  it("falls back to a title and slug when they are missing", () => {
    const { data } = transformPost({ id: 9, content: { rendered: "<p>x</p>" } });
    assert.equal(data.title, "Untitled WordPress post 9");
    assert.equal(data.slug, "untitled-wordpress-post-9");
  });

  it("throws when the post has no id", () => {
    assert.throws(() => transformPost({ title: { rendered: "x" } }), /missing an id/);
  });
});
