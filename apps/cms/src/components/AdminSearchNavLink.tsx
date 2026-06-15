import type { ServerProps } from "payload";

// Adds a "Search" link to the admin nav (afterNavLinks). Server component so it
// can read the configured admin route from the injected payload instance; falls
// back to the default mount path. Uses Payload's nav__link class to match the
// surrounding nav styling.
export function AdminSearchNavLink(props: ServerProps) {
  const adminRoute = props?.payload?.config?.routes?.admin ?? "/admin";
  return (
    <a className="nav__link" href={`${adminRoute}/search`}>
      Search
    </a>
  );
}
