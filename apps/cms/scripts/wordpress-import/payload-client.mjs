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
