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
