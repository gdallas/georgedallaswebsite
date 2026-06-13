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
      const body = await response.json();
      token = body?.token ?? null;
      if (!token) {
        throw new Error("CMS login did not return a token.");
      }
      return true;
    },

    async findByWordpressId(wordpressId) {
      const query = `where[wordpressOriginalId][equals]=${encodeURIComponent(wordpressId)}&limit=1&depth=0`;
      const response = await fetchImpl(`${base}/api/posts?${query}`, { headers: headers() });
      if (!response.ok) {
        throw new Error(`CMS lookup failed: HTTP ${response.status}.`);
      }
      const body = await response.json();
      return Array.isArray(body?.docs) && body.docs.length > 0 ? body.docs[0] : null;
    },

    async createDraft(data) {
      const response = await fetchImpl(`${base}/api/posts`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const body = await response.json();
          if (body?.errors) {
            detail = JSON.stringify(body.errors);
          }
        } catch {
          // keep the status-only detail
        }
        throw new Error(`CMS create failed: ${detail}.`);
      }
      const body = await response.json();
      return body?.doc ?? body;
    }
  };
}
