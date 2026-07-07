import type {
  NavPreferences,
  PayloadRequest,
  SanitizedPermissions,
  ServerProps,
  VisibleEntities
} from "payload";

import { Logout } from "@payloadcms/ui";
import { EntityType, groupNavItems, type EntityToGroup } from "@payloadcms/ui/shared";
import { PREFERENCE_KEYS, formatAdminURL } from "payload/shared";

import { tieredNavGroups } from "../../admin/navigation.mjs";
import { BrandMark } from "../BrandMark";
import { NavClient, type NavTierGroup } from "./NavClient";
import { NavShell } from "./NavShell";

type NavProps = { req?: PayloadRequest; visibleEntities?: VisibleEntities } & ServerProps;

// groupNavItems resolves label functions, so what remains is a string or a
// locale map; the CMS is single-locale English, so take the first value.
function labelText(label: unknown): string {
  if (typeof label === "string") {
    return label;
  }
  if (label && typeof label === "object") {
    const first = Object.values(label as Record<string, string>)[0];
    if (typeof first === "string") {
      return first;
    }
  }
  return "";
}

// Custom sidebar (GDW-059, admin.components.Nav): writing dominant, library
// and site tools quiet, system plumbing tucked away. Grouping and tiering are
// driven by src/admin/navigation.mjs; entity visibility and permissions go
// through Payload's own groupNavItems, exactly like the stock nav.
export async function Nav(props: NavProps) {
  const { i18n, payload, permissions, req, user, visibleEntities } = props;

  if (!payload?.config) {
    return null;
  }

  const { collections, globals } = payload.config;
  const adminRoute = payload.config.routes.admin;

  const entities: EntityToGroup[] = [
    ...collections
      .filter(({ slug }) => visibleEntities?.collections?.includes(slug))
      .map((collection) => ({ type: EntityType.collection, entity: collection }) as EntityToGroup),
    ...globals
      .filter(({ slug }) => visibleEntities?.globals?.includes(slug))
      .map((global) => ({ type: EntityType.global, entity: global }) as EntityToGroup)
  ];

  // No permissions means nothing is readable, which groupNavItems expresses
  // as an empty nav — same outcome as the stock permission gate.
  const shaped = tieredNavGroups(
    groupNavItems(entities, permissions ?? ({} as SanitizedPermissions), i18n)
  ) as Array<{
    entities: { label: unknown; slug: string; type: EntityType }[];
    label: string;
    tier: NavTierGroup["tier"];
  }>;

  const groups: NavTierGroup[] = shaped.map((group) => ({
    label: group.label,
    tier: group.tier,
    entities: group.entities.map(({ label, slug, type }) => ({
      href: formatAdminURL({
        adminRoute,
        path: type === EntityType.collection ? `/collections/${slug}` : `/globals/${slug}`
      }),
      id: type === EntityType.collection ? `nav-${slug}` : `nav-global-${slug}`,
      label: labelText(label)
    }))
  }));

  // Same lookup as Payload's own getNavPrefs, so NavGroup collapse state
  // keeps persisting to the user's payload-preferences under the stock key.
  const navPreferences: NavPreferences | null = req?.user?.collection
    ? await payload
        .find({
          collection: "payload-preferences",
          depth: 0,
          limit: 1,
          pagination: false,
          req,
          where: {
            and: [
              { key: { equals: PREFERENCE_KEYS.NAV } },
              { "user.relationTo": { equals: req.user.collection } },
              { "user.value": { equals: req.user.id } }
            ]
          }
        })
        .then((res) => (res.docs[0]?.value as NavPreferences | undefined) ?? null)
    : null;

  const searchHref = formatAdminURL({ adminRoute, path: "/search" });
  const accountHref = formatAdminURL({
    adminRoute,
    path: payload.config.admin.routes.account
  });

  return (
    <NavShell>
      <nav aria-label="Site admin" className="nav__wrap">
        <NavClient groups={groups} navPreferences={navPreferences} searchHref={searchHref} />
        <div className="nav__controls gdw-nav__footer">
          <div className="gdw-nav__identity">
            <BrandMark className="gdw-nav__mark" />
            <div className="gdw-nav__identity-text">
              <span className="gdw-nav__site">George Dallas</span>
              {typeof user?.email === "string" && (
                <span className="gdw-nav__user">{user.email}</span>
              )}
            </div>
          </div>
          <div className="gdw-nav__session">
            <a className="gdw-nav__account" href={accountHref}>
              Account
            </a>
            <Logout />
          </div>
        </div>
      </nav>
    </NavShell>
  );
}
