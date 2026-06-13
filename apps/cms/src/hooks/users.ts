import type { CollectionBeforeChangeHook } from "payload";
import { resolveFirstUserRole } from "../access/firstUser.mjs";

export const ensureFirstUserIsOwner: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== "create") {
    return data;
  }

  const { totalDocs } = await req.payload.count({
    collection: "users",
    overrideAccess: true,
    req
  });

  return {
    ...data,
    role: resolveFirstUserRole({ isFirstUser: totalDocs === 0, requestedRole: data.role })
  };
};
