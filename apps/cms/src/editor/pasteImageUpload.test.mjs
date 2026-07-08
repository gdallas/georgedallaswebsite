import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractPastedImageFiles, newLexicalNodeId, uploadPastedImage } from "./pasteImageUpload.mjs";

function fakeFile({ name = "pic.png", type = "image/png", size = 1024 } = {}) {
  return { name, type, size };
}

function fakeClipboard({ items = [], files = [] } = {}) {
  return {
    items: items.map((entry) => ({
      kind: entry.kind ?? "file",
      type: entry.type,
      getAsFile: () => entry.file ?? null
    })),
    files
  };
}

describe("extractPastedImageFiles", () => {
  it("pulls image bytes out even when text/html is also on the clipboard", () => {
    const image = fakeFile();
    const clipboard = fakeClipboard({
      items: [
        { kind: "string", type: "text/html", file: null },
        { kind: "file", type: "image/png", file: image }
      ]
    });

    const result = extractPastedImageFiles(clipboard);
    assert.equal(result.length, 1);
    assert.equal(result[0], image);
  });

  it("falls back to files when items carry no image", () => {
    const image = fakeFile({ name: "shot.webp", type: "image/webp" });
    const result = extractPastedImageFiles(fakeClipboard({ items: [], files: [image] }));
    assert.deepEqual(result, [image]);
  });

  it("ignores non-image clipboard content", () => {
    const clipboard = fakeClipboard({ items: [{ kind: "string", type: "text/plain", file: null }] });
    assert.deepEqual(extractPastedImageFiles(clipboard), []);
  });

  it("de-duplicates the same blob surfaced through both items and files", () => {
    const image = fakeFile();
    const clipboard = fakeClipboard({ items: [{ kind: "file", type: "image/png", file: image }], files: [image] });
    assert.equal(extractPastedImageFiles(clipboard).length, 1);
  });

  it("returns nothing for a missing clipboard", () => {
    assert.deepEqual(extractPastedImageFiles(null), []);
  });
});

describe("newLexicalNodeId", () => {
  it("is a 24-character hex string", () => {
    assert.match(newLexicalNodeId(), /^[0-9a-f]{24}$/);
  });

  it("is deterministic from injected bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 15, 16, 255, 3, 4, 5, 6, 7, 8]);
    assert.equal(newLexicalNodeId(bytes), "0001020f10ff030405060708");
  });
});

describe("uploadPastedImage", () => {
  const endpoint = "/api/media";

  it("rejects an oversized image before any request is sent", async () => {
    let called = false;
    const result = await uploadPastedImage({
      file: fakeFile({ size: 6 * 1024 * 1024 }),
      mediaEndpoint: endpoint,
      fetchImpl: async () => {
        called = true;
        return { ok: true, json: async () => ({}) };
      }
    });

    assert.equal(called, false, "no upload should be attempted for an oversized file");
    assert.equal(result.id, null);
    assert.match(result.error, /larger than/);
  });

  it("rejects a non-image file with a friendly message", async () => {
    const result = await uploadPastedImage({
      file: fakeFile({ name: "notes.txt", type: "text/plain" }),
      mediaEndpoint: endpoint,
      fetchImpl: async () => ({ ok: true, json: async () => ({}) })
    });
    assert.equal(result.id, null);
    assert.match(result.error, /not an image/);
  });

  it("returns the new media id on success", async () => {
    const result = await uploadPastedImage({
      file: fakeFile(),
      mediaEndpoint: endpoint,
      fetchImpl: async (url, init) => {
        assert.equal(url, endpoint);
        assert.equal(init.method, "POST");
        assert.equal(init.credentials, "same-origin");
        return { ok: true, json: async () => ({ doc: { id: 42 } }) };
      }
    });
    assert.equal(result.id, 42);
    assert.equal(result.error, null);
  });

  it("surfaces the server's error message on failure", async () => {
    const result = await uploadPastedImage({
      file: fakeFile(),
      mediaEndpoint: endpoint,
      fetchImpl: async () => ({ ok: false, json: async () => ({ errors: [{ message: "File is not allowed." }] }) })
    });
    assert.equal(result.id, null);
    assert.equal(result.error, "File is not allowed.");
  });

  it("reports a friendly error when the request throws", async () => {
    const result = await uploadPastedImage({
      file: fakeFile(),
      mediaEndpoint: endpoint,
      fetchImpl: async () => {
        throw new Error("network down");
      }
    });
    assert.equal(result.id, null);
    assert.match(result.error, /Check your connection/);
  });
});
