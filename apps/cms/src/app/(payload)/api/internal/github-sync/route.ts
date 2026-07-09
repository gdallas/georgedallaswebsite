import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { publishSignatureHeader } from "@georgedallas/shared/scheduling";
import config from "../../../../../payload.config";
import { loadCmsConfig } from "../../../../../env";
import { verifySyncRequest } from "../../../../../github/githubSync.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Internal endpoint the scheduled GitHub sync Action calls (GDW-045). The CMS
// Lambda has no internet egress, so the Action fetches the repos and POSTs them
// here, authenticated with an HMAC over the raw body (keyed by the shared
// webhook secret) — defence in depth on top of the CloudFront x-origin-verify
// header the middleware already checks. It upserts each repo by GitHub id
// (preserving George's promote/project choices) and records a run so failures
// are visible in the admin, never breaking the public site (which never reads
// these collections).
export async function POST(request: Request): Promise<Response> {
  const secret = loadCmsConfig().webhookSecret;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "sync is not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get(publishSignatureHeader) ?? undefined;
  const parsed = verifySyncRequest(rawBody, signature, secret);
  if (!parsed.ok) {
    const status = parsed.reason === "invalid_signature" ? 401 : 400;
    return NextResponse.json({ ok: false, error: parsed.reason }, { status });
  }

  const payload = await getPayload({ config });
  const startedAt = new Date().toISOString();
  const syncedAt = new Date().toISOString();
  let upserted = 0;
  const errors: string[] = [];

  for (const repo of parsed.repos) {
    try {
      const existing = await payload.find({
        collection: "github-repos" as never,
        where: { githubId: { equals: repo.githubId } },
        limit: 1,
        depth: 0,
        overrideAccess: true
      });

      const data = {
        githubId: repo.githubId,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description,
        url: repo.url,
        homepage: repo.homepage,
        stars: repo.stars,
        forks: repo.forks,
        language: repo.language,
        topics: repo.topics,
        pushedAt: repo.pushedAt,
        isArchived: repo.isArchived,
        isFork: repo.isFork,
        lastSyncedAt: syncedAt
      };

      if (existing.docs.length > 0) {
        // Update metadata only — never touch George's promoteToProject/project.
        await payload.update({ collection: "github-repos" as never, id: existing.docs[0].id, data, overrideAccess: true });
      } else {
        await payload.create({ collection: "github-repos" as never, data: { ...data, promoteToProject: false }, overrideAccess: true });
      }
      upserted += 1;
    } catch (error) {
      errors.push(`${repo.fullName}: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  const status = errors.length === 0 ? "success" : upserted > 0 ? "partial" : "error";

  try {
    await payload.create({
      collection: "github-sync-runs" as never,
      data: {
        startedAt,
        finishedAt: new Date().toISOString(),
        status,
        reposSeen: parsed.repos.length,
        reposUpserted: upserted,
        error: errors.length > 0 ? errors.slice(0, 20).join("\n") : null
      },
      overrideAccess: true
    });
  } catch (error) {
    payload.logger.error({ err: error }, "Failed to record github sync run");
  }

  return NextResponse.json({ ok: status !== "error", status, reposSeen: parsed.repos.length, reposUpserted: upserted });
}
