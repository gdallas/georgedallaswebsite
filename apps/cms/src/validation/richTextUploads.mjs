// Resolves upload nodes that a paste leaves "pending" in a Lexical body
// (GDW-064). Copying an image from a web page puts text/html on the
// clipboard; the Lexical upload feature bails on text/html pastes, imports
// the <img> as a *pending* upload node, and then cannot fetch the remote
// image from the browser (CORS), so the node stays pending forever and
// saving dies with "This field is not a valid upload ID". Server-side there
// is no CORS: download the image (same trust decision as the WordPress
// importer, with tighter guards), create the media document — it enters the
// alt-text queue like any altless upload — and rewrite the node into a real
// reference. Anything unresolvable is stripped so a draft can always save.

import { allowedMediaMimeTypes, maxMediaUploadBytes } from "./content.mjs";

const imageMimeTypes = allowedMediaMimeTypes.filter((type) => type.startsWith("image/"));

export function isPrivateHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

export function decodeDataUrl(src) {
  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.+)$/i.exec(src);

  if (!match) {
    return null;
  }

  try {
    return { mimeType: match[1].toLowerCase(), buffer: Buffer.from(match[2], "base64") };
  } catch {
    return null;
  }
}

export function pastedImageFilename(src, mimeType) {
  const extension = (mimeType || "").split("/")[1]?.replace("+xml", "") || "png";

  try {
    const url = new URL(src);
    const last = decodeURIComponent(url.pathname.split("/").pop() || "");
    const cleaned = last.replace(/[^a-zA-Z0-9._-]/g, "-");

    if (cleaned && /\.[a-zA-Z0-9]{2,5}$/.test(cleaned)) {
      return cleaned;
    }

    if (cleaned) {
      return `${cleaned}.${extension}`;
    }
  } catch {
    // Fall through to the generic name.
  }

  return `pasted-image.${extension}`;
}

// Walks a serialized Lexical tree, resolving or stripping every upload node
// that lacks a real reference. Mutates the tree in place; returns counts.
// IO is injected so the walker stays unit-testable:
//   fetchImage(src) -> { buffer, mimeType, filename? } | null
//   createMedia({ buffer, filename, mimeType }) -> media id | null
export async function resolvePendingUploads(root, { allowPrivateHosts = false, createMedia, fetchImage }) {
  const summary = { resolved: 0, stripped: 0 };

  if (!root || !Array.isArray(root.children)) {
    return summary;
  }

  const resolveNode = async (node) => {
    const src = node?.pending?.src;

    if (typeof src !== "string" || src.length === 0) {
      return null;
    }

    let image = null;

    if (src.startsWith("data:")) {
      const decoded = decodeDataUrl(src);

      if (decoded) {
        image = { ...decoded, filename: pastedImageFilename("", decoded.mimeType) };
      }
    } else if (/^https?:\/\//i.test(src)) {
      try {
        const url = new URL(src);

        if (!allowPrivateHosts && isPrivateHost(url.hostname)) {
          return null;
        }

        const fetched = await fetchImage(src);

        if (fetched?.buffer) {
          image = {
            ...fetched,
            filename: fetched.filename || pastedImageFilename(src, fetched.mimeType)
          };
        }
      } catch {
        return null;
      }
    }

    if (
      !image ||
      !imageMimeTypes.includes(image.mimeType) ||
      image.buffer.length === 0 ||
      image.buffer.length > maxMediaUploadBytes
    ) {
      return null;
    }

    try {
      const mediaId = await createMedia(image);

      if (mediaId == null) {
        return null;
      }

      return {
        type: "upload",
        id: node.id,
        fields: {},
        format: node.format ?? "",
        relationTo: "media",
        value: mediaId,
        version: 3
      };
    } catch {
      return null;
    }
  };

  const visit = async (parent) => {
    if (!parent || !Array.isArray(parent.children)) {
      return;
    }

    const kept = [];

    for (const child of parent.children) {
      if (child && typeof child === "object" && child.type === "upload") {
        const hasReference = child.value != null && child.value !== "" && !child.pending;

        if (hasReference) {
          kept.push(child);
          continue;
        }

        const resolved = await resolveNode(child);

        if (resolved) {
          kept.push(resolved);
          summary.resolved += 1;
        } else {
          summary.stripped += 1;
        }

        continue;
      }

      await visit(child);
      kept.push(child);
    }

    parent.children = kept;
  };

  await visit(root);

  return summary;
}

// Collection beforeValidate hook for posts/pages: runs before field
// validation, so the rewrite happens before the upload field can reject a
// pending node. Guards: image mime types only, the 4 MB media cap, an 8 s
// timeout, and no private hosts outside local development.
export function createResolvePastedUploadsHook() {
  return async (args) => {
    const data = args?.data;
    const req = args?.req;
    const root = data?.body?.root;

    if (!root || !req) {
      return data;
    }

    await resolvePendingUploads(root, {
      allowPrivateHosts: process.env.APP_ENV === "local",
      fetchImage: async (src) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);

        try {
          const res = await fetch(src, { redirect: "follow", signal: controller.signal });

          if (!res.ok) {
            return null;
          }

          const mimeType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
          const arrayBuffer = await res.arrayBuffer();
          return { buffer: Buffer.from(arrayBuffer), mimeType };
        } catch {
          return null;
        } finally {
          clearTimeout(timer);
        }
      },
      createMedia: async ({ buffer, filename, mimeType }) => {
        const doc = await req.payload.create({
          collection: "media",
          data: {},
          file: { data: buffer, mimetype: mimeType, name: filename, size: buffer.length },
          overrideAccess: false,
          req,
          user: req.user
        });

        return doc?.id ?? null;
      }
    });

    return data;
  };
}
