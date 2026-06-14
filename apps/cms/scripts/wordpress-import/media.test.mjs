import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectImageSources, filenameFromUrl, relinkImages } from "./media.mjs";
import { htmlToLexical } from "./transform.mjs";

describe("collectImageSources", () => {
  it("finds image sources from figures and standalone images", () => {
    const body = htmlToLexical(
      '<p>Intro</p><figure class="wp-block-image"><img src="https://b/a.png" alt="A"/></figure><img src="https://b/b.jpg">'
    );
    assert.deepEqual(collectImageSources(body).sort(), ["https://b/a.png", "https://b/b.jpg"]);
  });

  it("deduplicates repeated sources", () => {
    const body = htmlToLexical('<img src="https://b/x.png"><img src="https://b/x.png">');
    assert.deepEqual(collectImageSources(body), ["https://b/x.png"]);
  });
});

describe("relinkImages", () => {
  it("replaces wp-image markers with upload nodes and reports unresolved ones", () => {
    const body = htmlToLexical('<img src="https://b/a.png"><img src="https://b/missing.png">');
    const { body: out, unresolved } = relinkImages(body, { "https://b/a.png": 42 });

    const types = out.root.children.map((node) => node.type);
    assert.ok(types.includes("upload"));
    const upload = out.root.children.find((node) => node.type === "upload");
    assert.equal(upload.relationTo, "media");
    assert.equal(upload.value, 42);
    assert.deepEqual(unresolved, ["https://b/missing.png"]);
    assert.ok(!JSON.stringify(out).includes("wp-image"), "no markers should remain");
  });
});

describe("filenameFromUrl", () => {
  it("extracts the filename with extension", () => {
    assert.equal(filenameFromUrl("https://b.com/wp-content/2020/05/diagram.png"), "diagram.png");
    assert.equal(filenameFromUrl("https://b.com/img/photo.jpeg?w=600"), "photo.jpeg");
  });

  it("falls back when there is no usable filename", () => {
    assert.equal(filenameFromUrl("https://b.com/no-extension/", "img"), "img");
    assert.equal(filenameFromUrl("not a url", "img"), "img");
  });
});
