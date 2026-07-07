"use client";

import type { NavPreferences } from "payload";

import { Link, NavGroup } from "@payloadcms/ui";
import { usePathname } from "next/navigation";

const baseClass = "nav";

export type NavLinkItem = {
  href: string;
  id: string;
  label: string;
};

export type NavTierGroup = {
  entities: NavLinkItem[];
  label: string;
  tier: "primary" | "quiet" | "system";
};

type Props = {
  groups: NavTierGroup[];
  navPreferences: NavPreferences | null;
  searchHref: string;
};

// Client half of the custom sidebar: active states need the pathname, and
// NavGroup owns collapse animation + preference persistence. Links keep
// Payload's stock nav__link classes (including the exact-match div and the
// nav__link-indicator) so focus and active styling stay on the stock rails.
export function NavClient({ groups, navPreferences, searchHref }: Props) {
  const pathname = usePathname();

  const renderLink = ({ href, id, label }: NavLinkItem, extraClass?: string) => {
    const isActive =
      pathname.startsWith(href) && ["/", undefined].includes(pathname[href.length]);
    const className = [`${baseClass}__link`, extraClass].filter(Boolean).join(" ");
    const content = (
      <>
        {isActive && <div className={`${baseClass}__link-indicator`} />}
        <span className={`${baseClass}__link-label`}>{label}</span>
      </>
    );

    if (pathname === href) {
      return (
        <div aria-current="page" className={className} id={id} key={id}>
          {content}
        </div>
      );
    }

    return (
      <Link
        aria-current={isActive ? "page" : undefined}
        className={className}
        href={href}
        id={id}
        key={id}
        prefetch={false}
      >
        {content}
      </Link>
    );
  };

  const tier = (wanted: NavTierGroup["tier"]) => groups.filter((group) => group.tier === wanted);

  return (
    <>
      {/* Write: the reason the admin exists — large, immediate, no folding. */}
      <div className="gdw-nav__write">
        {tier("primary").flatMap((group) =>
          group.entities.map((entity) => renderLink(entity, "gdw-nav__write-link"))
        )}
      </div>

      {renderLink({ href: searchHref, id: "nav-search", label: "Search" }, "gdw-nav__search")}

      {/* Library and site tools: quiet, folded until asked for. */}
      {tier("quiet").map((group) => (
        <NavGroup
          isOpen={navPreferences?.groups?.[group.label]?.open ?? false}
          key={group.label}
          label={group.label}
        >
          {group.entities.map((entity) => renderLink(entity))}
        </NavGroup>
      ))}

      {/* System plumbing: demoted behind a divider at the foot. */}
      <div className="gdw-nav__foot">
        <hr className="gdw-nav__divider" />
        {tier("system").map((group) => (
          <NavGroup
            isOpen={navPreferences?.groups?.[group.label]?.open ?? false}
            key={group.label}
            label={group.label}
          >
            {group.entities.map((entity) => renderLink(entity))}
          </NavGroup>
        ))}
      </div>
    </>
  );
}
