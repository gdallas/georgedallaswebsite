// Pure helpers behind the editor's paste-image fix. Copying an image from a
// web page puts BOTH the raw image bytes (in clipboardData.items/files) AND a
// text/html `<img src>` on the clipboard. Payload's built-in Lexical paste
// handler bails the instant text/html is present and falls back to importing
// the remote URL as a *pending* upload node — which the browser then tries to
// fetch and can't (cross-origin CORS), so the node shimmers forever; the
// server-side resolver can't rescue it either because the CMS Lambda has no
// VPC egress. The fix grabs the bytes that are already local and uploads them
// through the admin's own session, exactly like the dashboard drop card. The
// browser wiring lives in PasteImageUploadFeatureClient.tsx; the decisions
// that are worth testing live here.

import { payloadErrorMessage, validateQuickImage } from "../dashboard/quickCapture.mjs";

// Every image blob on the clipboard, de-duplicated. `items` is the richer
// source ("Copy image" surfaces the decoded bytes there); `files` is the
// fallback for a plain file paste.
export function extractPastedImageFiles(clipboardData) {
  if (!clipboardData) {
    return [];
  }

  const files = [];
  const seen = new Set();

  const add = (file) => {
    if (!file || typeof file.type !== "string" || !file.type.startsWith("image/")) {
      return;
    }

    const key = `${file.name}:${file.size}:${file.type}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    files.push(file);
  };

  const items = clipboardData.items ? Array.from(clipboardData.items) : [];
  for (const item of items) {
    if (item.kind === "file" && typeof item.type === "string" && item.type.startsWith("image/")) {
      add(item.getAsFile());
    }
  }

  if (files.length === 0 && clipboardData.files) {
    for (const file of Array.from(clipboardData.files)) {
      add(file);
    }
  }

  return files;
}

// 24-char hex, MongoID-shaped: matches the id Payload's upload plugin stamps on
// each node's field data (it uses bson-objectid; only the shape matters here).
export function newLexicalNodeId(randomBytes) {
  const bytes = randomBytes ?? randomByteArray(12);
  return Array.from(bytes, (byte) => (byte & 0xff).toString(16).padStart(2, "0")).join("");
}

function randomByteArray(length) {
  const out = new Uint8Array(length);

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(out);
  } else {
    for (let i = 0; i < length; i += 1) {
      out[i] = Math.floor(Math.random() * 256);
    }
  }

  return out;
}

// Uploads one pasted image to the media collection with the admin's own cookie
// session and returns the new media id (or an error message to surface). The
// same client-side size/type gate the drop card uses runs first, because the
// Lambda Function URL rejects oversized bodies before app code can explain why.
// fetchImpl is injected so the decision path stays unit-testable.
/**
 * @param {{ file: { name?: string, type?: string, size?: number }, mediaEndpoint: string, fetchImpl?: typeof fetch }} args
 * @returns {Promise<{ id: string | number | null, error: string | null }>}
 */
export async function uploadPastedImage({ file, mediaEndpoint, fetchImpl }) {
  const gate = validateQuickImage(file);
  if (gate !== true) {
    return { id: null, error: gate };
  }

  const doFetch = fetchImpl ?? globalThis.fetch;
  const body = new FormData();
  body.append("file", file);

  let res;
  try {
    res = await doFetch(mediaEndpoint, { method: "POST", body, credentials: "same-origin" });
  } catch {
    return { id: null, error: "Could not upload the pasted image. Check your connection and try again." };
  }

  const json = await res.json().catch(() => null);
  const id = json?.doc?.id;

  if (res.ok && id != null) {
    return { id, error: null };
  }

  return { id: null, error: payloadErrorMessage(json, "Could not add the pasted image. Try again.") };
}
