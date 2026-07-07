import path from "node:path";
import { fileURLToPath } from "node:url";
import { withPayload } from "@payloadcms/next/withPayload";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output keeps the Lambda container image small (see the CMS
  // Lambda hosting ADR). The tracing root makes standalone work in the
  // pnpm monorepo.
  experimental: {
    serverActions: {
      allowedOrigins: ["cms.georgedallas.com", "cms-dev.georgedallas.com"],
      bodySizeLimit: "6mb"
    }
  },
  output: "standalone",
  outputFileTracingRoot: path.resolve(dirname, "..", "..")
};

export default withPayload(nextConfig);
