import { NextResponse } from "next/server";
import { loadCmsConfig } from "../../../env";

export function GET() {
  const config = loadCmsConfig();

  return NextResponse.json({
    ok: true,
    app: "georgedallas-cms",
    environment: config.appEnv
  });
}
