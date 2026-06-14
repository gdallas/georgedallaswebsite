import { createServer } from "node:http";
import { RESPONSES } from "./fixtures.mjs";

// Minimal stand-in for the Payload REST API used by the site's build-time data
// layer. It ignores query parameters (including the published where-clause) and
// returns the full fixture set, so the SITE's visibility filtering is what gets
// exercised — not the CMS's. Unknown collection paths return an empty docs list.
export function startMockCms() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const { pathname } = new URL(req.url, "http://localhost");
      const body = Object.prototype.hasOwnProperty.call(RESPONSES, pathname)
        ? RESPONSES[pathname]
        : pathname.startsWith("/api/globals/")
          ? {}
          : { docs: [] };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        port,
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done))
      });
    });
  });
}
