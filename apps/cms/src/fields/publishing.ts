import type { Field } from "payload";

export const publishingStatusField: Field = {
  name: "status",
  type: "select",
  required: true,
  defaultValue: "draft",
  options: [
    { label: "Draft", value: "draft" },
    { label: "In review", value: "in_review" },
    { label: "Scheduled", value: "scheduled" },
    { label: "Published", value: "published" },
    { label: "Archived", value: "archived" }
  ]
};

// Sidebar variants for dated content (posts, pages): the three fields that
// decide whether something is live sit together next to the save button, each
// explaining its part of the rule. Live = Published + Public + date passed
// (packages/shared/src/visibility.mjs).
export const datedPublishingSidebarFields: Field[] = [
  {
    name: "status",
    type: "select",
    required: true,
    defaultValue: "draft",
    options: [
      { label: "Draft", value: "draft" },
      { label: "In review", value: "in_review" },
      { label: "Scheduled", value: "scheduled" },
      { label: "Published", value: "published" },
      { label: "Archived", value: "archived" }
    ],
    admin: {
      position: "sidebar",
      description:
        "Draft and In review stay off the site. Scheduled goes live by itself at the publish date (set a future date). Published is live once Visibility is Public and the publish date has passed. Archived takes it back off the site."
    }
  },
  {
    name: "visibility",
    type: "select",
    required: true,
    defaultValue: "private",
    options: [
      { label: "Public", value: "public" },
      { label: "Unlisted", value: "unlisted" },
      { label: "Private", value: "private" }
    ],
    admin: {
      position: "sidebar",
      description:
        "Public appears on the site once Status is Published. Unlisted and Private are never rendered publicly."
    }
  },
  {
    name: "publishedAt",
    type: "date",
    admin: {
      position: "sidebar",
      date: {
        pickerAppearance: "dayAndTime"
      },
      description:
        "Required to publish. Sets the date and ordering on the site; a future date keeps it hidden until then."
    }
  }
];

export const listingStatusField: Field = {
  name: "status",
  type: "select",
  required: true,
  defaultValue: "draft",
  options: [
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
    { label: "Archived", value: "archived" }
  ]
};

export const publishedAtField: Field = {
  name: "publishedAt",
  type: "date",
  admin: {
    date: {
      pickerAppearance: "dayAndTime"
    }
  }
};

export const visibilityField: Field = {
  name: "visibility",
  type: "select",
  required: true,
  defaultValue: "private",
  options: [
    { label: "Public", value: "public" },
    { label: "Unlisted", value: "unlisted" },
    { label: "Private", value: "private" }
  ]
};
