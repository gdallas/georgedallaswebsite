import { BrandMark } from "./BrandMark";

// Login-page logo (admin.components.graphics.Logo): the cedar mark over the
// wordmark. Styled by the .gdw-login-logo rules in app/(payload)/custom.css.
export function BrandLogo() {
  return (
    <div className="gdw-login-logo">
      <BrandMark />
      <div className="gdw-login-logo__wordmark">George Dallas</div>
      <div className="gdw-login-logo__tagline">Content studio</div>
    </div>
  );
}
