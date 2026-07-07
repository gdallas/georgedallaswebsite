import type { CollectionConfig } from "payload";
import type { RedirectRecord } from "@georgedallas/shared/redirects";
import { detectRedirectLoops, normalizeRedirectPath } from "@georgedallas/shared/redirects";
import { collectionNavGroup } from "../admin/navigation.mjs";
import { auditCollectionChanges, auditCollectionDeletes } from "../audit/auditEvents";
import {
  requireContentMutation,
  requirePublicOrContentReadActiveRedirects
} from "../access/payloadAccess";
import { validateRedirectDestination, validateRedirectSource } from "../validation/content.mjs";

export const Redirects: CollectionConfig = {
  slug: "redirects",
  admin: {
    group: collectionNavGroup("redirects"),
    description: "URL redirects that keep old WordPress links working.",
    defaultColumns: ["sourcePath", "destination", "statusCode", "status", "enabled", "updatedAt"],
    useAsTitle: "sourcePath"
  },
  access: {
    create: requireContentMutation,
    delete: requireContentMutation,
    read: requirePublicOrContentReadActiveRedirects,
    update: requireContentMutation
  },
  fields: [
    {
      name: "sourcePath",
      type: "text",
      required: true,
      unique: true,
      validate: validateRedirectSource
    },
    {
      name: "destination",
      type: "text",
      required: true,
      validate: validateRedirectDestination
    },
    {
      name: "statusCode",
      type: "select",
      required: true,
      defaultValue: "301",
      options: [
        { label: "301 permanent", value: "301" },
        { label: "302 temporary", value: "302" },
        { label: "307 temporary, preserve method", value: "307" },
        { label: "308 permanent, preserve method", value: "308" }
      ]
    },
    {
      // Review lifecycle. WordPress-import proposals land as "proposed" and are
      // excluded from the public build until reviewed and set to "active".
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Proposed (not yet live)", value: "proposed" },
        { label: "Active", value: "active" },
        { label: "Disabled", value: "disabled" }
      ],
      admin: {
        position: "sidebar",
        description: "Only Active redirects are emitted into the deployed site."
      }
    },
    {
      name: "enabled",
      type: "checkbox",
      defaultValue: true,
      admin: { position: "sidebar", description: "Kill switch — unchecking removes it from the build even when Active." }
    },
    {
      name: "notes",
      type: "textarea"
    }
  ],
  hooks: {
    afterChange: [auditCollectionChanges("redirects")],
    afterDelete: [auditCollectionDeletes("redirects")],
    beforeChange: [
      // Block activating a redirect that would form a loop with the other
      // active redirects (self-redirect or a longer cycle).
      async ({ data, req, originalDoc }) => {
        const status = data.status ?? originalDoc?.status ?? "active";
        if (status !== "active") {
          return data;
        }

        const sourcePath = data.sourcePath ?? originalDoc?.sourcePath;
        const destination = data.destination ?? originalDoc?.destination;
        const source = normalizeRedirectPath(sourcePath);
        if (!source) {
          return data;
        }

        const existing = await req.payload.find({
          collection: "redirects" as never,
          where: { status: { equals: "active" } },
          limit: 1000,
          depth: 0,
          overrideAccess: true
        });

        const others = existing.docs.filter((doc) => doc.id !== originalDoc?.id) as unknown as RedirectRecord[];
        const candidate: RedirectRecord = { sourcePath, destination, status: "active", enabled: true };
        const loops = detectRedirectLoops([...others, candidate]);
        if (loops.has(source)) {
          throw new Error("This redirect would create a loop with an existing active redirect.");
        }

        return data;
      }
    ]
  }
};
