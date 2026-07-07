import { BrandMark } from "./BrandMark";

// Small mark (admin.components.graphics.Icon) shown in the admin nav and
// account areas. Sized by the .gdw-nav-icon rule in app/(payload)/custom.css.
export function BrandIcon() {
  return <BrandMark className="gdw-nav-icon" />;
}
