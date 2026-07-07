"use client";

import { Hamburger, useNav } from "@payloadcms/ui";
import type { ReactNode } from "react";

const baseClass = "nav";

// Client shell for the custom sidebar (GDW-059). Reuses Payload's stock
// `nav` class contract (nav--nav-open/animate/hydrated, nav__scroll,
// nav__mobile-close) so the template's drawer layout, transitions, and
// narrow-viewport behavior keep working; only the contents are ours.
export function NavShell({ children }: { children: ReactNode }) {
  const { hydrated, navOpen, navRef, setNavOpen, shouldAnimate } = useNav();

  return (
    <aside
      className={[
        baseClass,
        "gdw-nav",
        navOpen && `${baseClass}--nav-open`,
        shouldAnimate && `${baseClass}--nav-animate`,
        hydrated && `${baseClass}--nav-hydrated`
      ]
        .filter(Boolean)
        .join(" ")}
      inert={!navOpen ? true : undefined}
    >
      <div className={`${baseClass}__scroll`} ref={navRef}>
        {children}
        <div className={`${baseClass}__header`}>
          <div className={`${baseClass}__header-content`}>
            <button
              className={`${baseClass}__mobile-close`}
              onClick={() => setNavOpen(false)}
              tabIndex={!navOpen ? -1 : undefined}
              type="button"
            >
              <Hamburger isActive />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
