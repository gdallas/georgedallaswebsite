import { projectDraftFromRepo } from "../github/githubSync.mjs";

// When George ticks "Promote to project" on a synced repo, seed a draft/private
// Project from it and link them (GDW-045). Only ever *creates* — never
// publishes, never overwrites an existing linked project on later syncs — so
// the public projects page stays curated. Failures are logged, not thrown, so a
// slug clash can't block saving the repo.
/** @returns {import("payload").CollectionAfterChangeHook} */
export function createPromoteRepoToProjectHook() {
  return async ({ doc, req }) => {
    if (!req?.payload || !doc?.promoteToProject || doc?.project) {
      return doc;
    }

    try {
      const draft = projectDraftFromRepo(doc);
      const existing = await req.payload.find({
        collection: "projects",
        where: { slug: { equals: draft.slug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req
      });
      const slug = existing?.docs?.length ? `${draft.slug}-${doc.githubId}` : draft.slug;

      const project = await req.payload.create({
        collection: "projects",
        data: { ...draft, slug },
        overrideAccess: true,
        req
      });

      // Link the repo to its project. The re-fired afterChange sees `project`
      // set and exits, so this does not loop.
      await req.payload.update({
        collection: "github-repos",
        id: doc.id,
        data: { project: project.id },
        overrideAccess: true,
        req
      });
    } catch (error) {
      req.payload.logger?.error?.({ err: error, repo: doc?.fullName }, "Promote repo to project failed");
    }

    return doc;
  };
}
