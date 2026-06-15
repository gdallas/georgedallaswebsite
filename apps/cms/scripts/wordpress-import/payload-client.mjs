// Thin Payload REST client used by the real import run. It authenticates as a
// CMS user, looks posts up by their stored WordPress id (so re-runs are
// idempotent), and creates draft posts. The HTTP client is injectable for
// testing the request shaping without a live CMS.

export function createPayloadClient(options = {}) {
  const { cmsUrl, email, password, originVerify, fetchImpl = fetch } = options;

  if (!cmsUrl) {
    throw new Error("cmsUrl is required.");
  }

  const base = String(cmsUrl).replace(/\/+$/, "");
  let token = null;

  function headers() {
    const result = { "Content-Type": "application/json", Accept: "application/json" };
    if (token) {
      result.Authorization = `JWT ${token}`;
    }
    // Local CMS runs behind the same middleware as production; when targeting it
    // directly (not via CloudFront) the origin-verify header must be supplied.
    if (originVerify) {
      result["x-origin-verify"] = originVerify;
    }
    return result;
  }

  // Modern Payload (v3) returns no body token on login — only an httpOnly
  // Set-Cookie whose value is the JWT. CloudFront does not reliably forward a
  // Cookie header to the origin, so we lift the JWT out of the cookie and send
  // it as `Authorization: JWT <token>` (header auth), which Payload also accepts.
  function extractTokenFromCookies(response) {
    const headerBag = response.headers;
    const rawCookies =
      headerBag && typeof headerBag.getSetCookie === "function"
        ? headerBag.getSetCookie()
        : [headerBag?.get?.("set-cookie")].filter(Boolean);
    for (const raw of rawCookies) {
      const pair = String(raw).split(";")[0].trim();
      const eq = pair.indexOf("=");
      const name = eq >= 0 ? pair.slice(0, eq) : "";
      if (/(^|-)(payload-)?token$/.test(name) || name.endsWith("-token")) {
        return pair.slice(eq + 1);
      }
    }
    return null;
  }

  return {
    async login() {
      const response = await fetchImpl(`${base}/api/users/login`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        throw new Error(`CMS login failed: HTTP ${response.status}.`);
      }
      const body = await response.json().catch(() => ({}));
      token = body?.token ?? extractTokenFromCookies(response);
      if (!token) {
        throw new Error("CMS login returned neither a body token nor an auth cookie.");
      }
      return true;
    },

    async findByWordpressId(wordpressId) {
      // URLSearchParams percent-encodes the where[...] brackets; raw brackets in
      // the query string are rejected (HTTP 400) through CloudFront/Payload.
      const params = new URLSearchParams();
      params.set("where[wordpressOriginalId][equals]", String(wordpressId));
      params.set("limit", "1");
      params.set("depth", "0");
      const response = await fetchImpl(`${base}/api/posts?${params.toString()}`, { headers: headers() });
      if (!response.ok) {
        throw new Error(`CMS lookup failed: HTTP ${response.status}.`);
      }
      const body = await response.json();
      return Array.isArray(body?.docs) && body.docs.length > 0 ? body.docs[0] : null;
    },

    createDraft(data) {
      return createIn("posts", data);
    },

    create(collection, data) {
      return createIn(collection, data);
    },

    async update(collection, id, data) {
      const response = await fetchImpl(`${base}/api/${collection}/${id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error(`CMS update failed for ${collection}/${id}: ${await detailOf(response)}.`);
      }
      const body = await response.json();
      return body?.doc ?? body;
    },

    // Generic list query. `where` keys are full bracketed query params, e.g.
    // { "where[status][equals]": "scheduled" }. URLSearchParams encodes the
    // brackets so they survive CloudFront/Payload.
    async list(collection, where = {}, { limit = 100, depth = 0 } = {}) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(where)) {
        params.set(key, String(value));
      }
      params.set("limit", String(limit));
      params.set("depth", String(depth));
      const response = await fetchImpl(`${base}/api/${collection}?${params.toString()}`, { headers: headers() });
      if (!response.ok) {
        throw new Error(`CMS list failed for ${collection}: HTTP ${response.status}.`);
      }
      const body = await response.json();
      return Array.isArray(body?.docs) ? body.docs : [];
    },

    async getGlobal(slug) {
      const response = await fetchImpl(`${base}/api/globals/${slug}?depth=0`, { headers: headers() });
      if (!response.ok) {
        throw new Error(`CMS global fetch failed for ${slug}: HTTP ${response.status}.`);
      }
      return response.json();
    },

    async findOne(collection, field, value) {
      const params = new URLSearchParams();
      params.set(`where[${field}][equals]`, String(value));
      params.set("limit", "1");
      params.set("depth", "0");
      const response = await fetchImpl(`${base}/api/${collection}?${params.toString()}`, { headers: headers() });
      if (!response.ok) {
        throw new Error(`CMS lookup failed for ${collection}: HTTP ${response.status}.`);
      }
      const body = await response.json();
      return Array.isArray(body?.docs) && body.docs.length > 0 ? body.docs[0] : null;
    },

    // Multipart upload to the media collection. WordPress media lands under the
    // `wordpress-imports` prefix and is flagged needs_alt_text when alt is
    // missing, so it surfaces in the review queue (GDW-032).
    async uploadMedia(buffer, meta = {}) {
      const form = new FormData();
      form.append("file", new Blob([buffer], { type: meta.mimeType || "application/octet-stream" }), meta.filename || "image");
      form.append(
        "_payload",
        JSON.stringify({
          alt: meta.alt || "",
          source: meta.source,
          caption: meta.caption,
          importedFromWordPress: true,
          prefix: "wordpress-imports",
          reviewStatus: meta.alt ? "draft" : "needs_alt_text"
        })
      );
      const uploadHeaders = headers();
      // Let fetch set the multipart Content-Type (with boundary).
      delete uploadHeaders["Content-Type"];
      const response = await fetchImpl(`${base}/api/media`, { method: "POST", headers: uploadHeaders, body: form });
      if (!response.ok) {
        throw new Error(`CMS media upload failed: ${await detailOf(response)}.`);
      }
      const body = await response.json();
      return body?.doc ?? body;
    }
  };

  async function createIn(collection, data) {
    const response = await fetchImpl(`${base}/api/${collection}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`CMS create failed for ${collection}: ${await detailOf(response)}.`);
    }
    const body = await response.json();
    return body?.doc ?? body;
  }

  async function detailOf(response) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.errors) {
        detail = JSON.stringify(body.errors);
      }
    } catch {
      // keep the status-only detail
    }
    return detail;
  }
}
