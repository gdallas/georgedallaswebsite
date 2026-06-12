import { validateSlug } from "../validation/content.mjs";

export const slugField = {
  name: "slug",
  type: "text",
  required: true,
  unique: true,
  index: true,
  admin: {
    description: "Lowercase URL-safe identifier, such as ai-systems-notes."
  },
  validate: validateSlug
} as const;
