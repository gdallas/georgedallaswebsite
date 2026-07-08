import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maxMediaUploadBytes } from "./content.mjs";
import {
  decodeDataUrl,
  isPrivateHost,
  pastedImageFilename,
  resolvePendingUploads
} from "./richTextUploads.mjs";

const pendingNode = (src, id = "node-1") => ({
  type: "upload",
  id,
  pending: { formID: "form-1", src },
  version: 3
});

const bodyWith = (...nodes) => ({
  children: [{ type: "paragraph", children: [{ type: "text", text: "hello" }] }, ...nodes]
});

const okFetch = async () => ({ buffer: Buffer.from("png-bytes"), mimeType: "image/png" });
const okCreate = async () => 42;

describe("resolvePendingUploads", () => {
  it("resolves a pasted remote image into a real media reference", async () => {
    const root = bodyWith(pendingNode("https://example.com/photos/cedar.png"));
    const created = [];
    const summary = await resolvePendingUploads(root, {
      fetchImage: okFetch,
      createMedia: async (image) => {
        created.push(image);
        return 42;
      }
    });

    assert.deepEqual(summary, { resolved: 1, stripped: 0 });
    assert.equal(created[0].filename, "cedar.png");
    const node = root.children[1];
    assert.equal(node.relationTo, "media");
    assert.equal(node.value, 42);
    assert.equal(node.pending, undefined);
  });

  it("resolves data: URLs without fetching", async () => {
    const src = `data:image/png;base64,${Buffer.from("tiny").toString("base64")}`;
    const root = bodyWith(pendingNode(src));
    const summary = await resolvePendingUploads(root, {
      fetchImage: async () => {
        throw new Error("should not fetch for data URLs");
      },
      createMedia: okCreate
    });

    assert.deepEqual(summary, { resolved: 1, stripped: 0 });
    assert.equal(root.children[1].value, 42);
  });

  it("strips the node when the download fails so the draft can still save", async () => {
    const root = bodyWith(pendingNode("https://example.com/gone.png"));
    const summary = await resolvePendingUploads(root, {
      fetchImage: async () => null,
      createMedia: okCreate
    });

    assert.deepEqual(summary, { resolved: 0, stripped: 1 });
    assert.equal(root.children.length, 1);
  });

  it("strips non-image and oversized downloads", async () => {
    const root = bodyWith(pendingNode("https://example.com/doc.pdf", "a"), pendingNode("https://example.com/big.png", "b"));
    const responses = {
      "https://example.com/doc.pdf": { buffer: Buffer.from("x"), mimeType: "application/pdf" },
      "https://example.com/big.png": {
        buffer: Buffer.alloc(maxMediaUploadBytes + 1),
        mimeType: "image/png"
      }
    };
    const summary = await resolvePendingUploads(root, {
      fetchImage: async (src) => responses[src],
      createMedia: okCreate
    });

    assert.deepEqual(summary, { resolved: 0, stripped: 2 });
    assert.equal(root.children.length, 1);
  });

  it("refuses private hosts unless explicitly allowed (local dev)", async () => {
    const blocked = bodyWith(pendingNode("http://192.168.1.10/internal.png"));
    const blockedSummary = await resolvePendingUploads(blocked, {
      fetchImage: okFetch,
      createMedia: okCreate
    });
    assert.deepEqual(blockedSummary, { resolved: 0, stripped: 1 });

    const allowed = bodyWith(pendingNode("http://localhost:8765/test.png"));
    const allowedSummary = await resolvePendingUploads(allowed, {
      allowPrivateHosts: true,
      fetchImage: okFetch,
      createMedia: okCreate
    });
    assert.deepEqual(allowedSummary, { resolved: 1, stripped: 0 });
  });

  it("strips blob: and valueless nodes but leaves real references untouched", async () => {
    const real = { type: "upload", id: "keep", relationTo: "media", value: 7, version: 3 };
    const root = bodyWith(pendingNode("blob:http://localhost/x"), real, {
      type: "upload",
      id: "broken",
      version: 3
    });
    const summary = await resolvePendingUploads(root, {
      fetchImage: okFetch,
      createMedia: okCreate
    });

    assert.deepEqual(summary, { resolved: 0, stripped: 2 });
    assert.deepEqual(
      root.children.map((n) => n.id ?? n.type),
      ["paragraph", "keep"]
    );
  });

  it("walks nested children and survives an empty body", async () => {
    const nested = {
      children: [{ type: "quote", children: [pendingNode("https://example.com/pic.jpg")] }]
    };
    const summary = await resolvePendingUploads(nested, {
      fetchImage: async () => ({ buffer: Buffer.from("jpg"), mimeType: "image/jpeg" }),
      createMedia: okCreate
    });
    assert.deepEqual(summary, { resolved: 1, stripped: 0 });
    assert.equal(nested.children[0].children[0].value, 42);

    assert.deepEqual(await resolvePendingUploads(undefined, { fetchImage: okFetch, createMedia: okCreate }), {
      resolved: 0,
      stripped: 0
    });
  });
});

describe("paste helpers", () => {
  it("derives safe filenames from URLs with a mime fallback", () => {
    assert.equal(pastedImageFilename("https://a.com/img/Cedar%20Tree.png", "image/png"), "Cedar-Tree.png");
    assert.equal(pastedImageFilename("https://a.com/photo", "image/webp"), "photo.webp");
    assert.equal(pastedImageFilename("not a url", "image/svg+xml"), "pasted-image.svg");
  });

  it("decodes base64 data URLs and rejects the rest", () => {
    const decoded = decodeDataUrl(`data:image/png;base64,${Buffer.from("abc").toString("base64")}`);
    assert.equal(decoded.mimeType, "image/png");
    assert.equal(decoded.buffer.toString(), "abc");
    assert.equal(decodeDataUrl("data:text/plain,hello"), null);
  });

  it("classifies private hosts", () => {
    for (const host of ["localhost", "127.0.0.1", "10.0.0.5", "192.168.0.2", "172.20.1.1", "169.254.1.1"]) {
      assert.equal(isPrivateHost(host), true, host);
    }
    assert.equal(isPrivateHost("example.com"), false);
    assert.equal(isPrivateHost("172.32.0.1"), false);
  });
});
