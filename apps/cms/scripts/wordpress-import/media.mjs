// Helpers for the media side of the import: finding image markers in a
// converted body and relinking them to Payload upload nodes once the media
// records exist. Pure and unit-tested; the actual download/upload I/O lives in
// the driver and the Payload client.

export function collectImageNodes(body) {
  const found = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") {
      return;
    }
    if (node.type === "wp-image") {
      found.push(node);
    }
    if (Array.isArray(node.children)) {
      node.children.forEach(walk);
    }
  };
  walk(body?.root);
  return found;
}

export function collectImageSources(body) {
  return [...new Set(collectImageNodes(body).map((node) => node.src).filter(Boolean))];
}

function uploadNode(mediaId) {
  return { type: "upload", relationTo: "media", value: mediaId, fields: null, format: "", version: 3 };
}

// Replace every wp-image marker with a Payload upload node using a src -> media
// id map. Markers with no mapped media are dropped and returned as unresolved
// so the caller can flag them.
export function relinkImages(body, mediaBySrc = {}) {
  const unresolved = [];

  const transform = (children) => {
    if (!Array.isArray(children)) {
      return children;
    }
    const out = [];
    for (const node of children) {
      if (node?.type === "wp-image") {
        const mediaId = mediaBySrc[node.src];
        if (mediaId !== undefined && mediaId !== null) {
          out.push(uploadNode(mediaId));
        } else {
          unresolved.push(node.src);
        }
        continue;
      }
      if (node && Array.isArray(node.children)) {
        node.children = transform(node.children);
      }
      out.push(node);
    }
    return out;
  };

  if (body?.root) {
    body.root.children = transform(body.root.children);
  }
  return { body, unresolved };
}

// Derive a filename for an image URL, used as the S3/object name.
export function filenameFromUrl(url, fallback = "image") {
  try {
    const { pathname } = new URL(url);
    const name = pathname.split("/").filter(Boolean).pop();
    if (name && /\.[a-z0-9]{2,5}$/i.test(name)) {
      return decodeURIComponent(name);
    }
  } catch {
    // fall through to fallback
  }
  return fallback;
}
