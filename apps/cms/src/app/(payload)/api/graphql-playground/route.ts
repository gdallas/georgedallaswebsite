import config from "../../../../payload.config";
import { GRAPHQL_PLAYGROUND_GET } from "@payloadcms/next/routes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = GRAPHQL_PLAYGROUND_GET(config);
