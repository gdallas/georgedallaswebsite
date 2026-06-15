import type { AdminViewServerProps, CollectionSlug, Where } from "payload";
import { searchAllCollections } from "../search/adminSearch.mjs";
import styles from "./AdminSearch.module.css";

// Unified admin search view (GDW-036), registered at {adminRoute}/search. Runs
// the query across every searchable collection through payload.find with
// overrideAccess:false + the current user, so results respect RBAC. Uses a plain
// GET form so it works without client JS — submitting reloads with ?q=.
export async function AdminSearch({ initPageResult, searchParams }: AdminViewServerProps) {
  const { req } = initPageResult;
  const { payload, user } = req;
  const adminRoute = payload.config.routes.admin;

  const resolvedParams = await Promise.resolve(searchParams ?? {});
  const rawQuery = resolvedParams.q;
  const query = Array.isArray(rawQuery) ? rawQuery[0] : (rawQuery ?? "");

  const find = (slug: string, where: Record<string, unknown>, limit: number) =>
    payload.find({
      collection: slug as CollectionSlug,
      where: where as Where,
      limit,
      depth: 0,
      overrideAccess: false,
      user
    });

  const { query: q, groups, total } = await searchAllCollections({
    find,
    query,
    adminRoute,
    limitPerCollection: 8
  });

  const groupsWithResults = groups.filter((group) => group.items.length > 0);

  return (
    <main className={`gutter--left gutter--right ${styles.search}`}>
      <h1 className={styles.title}>Search</h1>
      <form method="get" action={`${adminRoute}/search`} className={styles.form} role="search">
        <input
          className={styles.input}
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search posts, pages, projects, links, media…"
          aria-label="Search content"
        />
        <button className={styles.button} type="submit">
          Search
        </button>
      </form>

      {q.length === 0 ? (
        <p className={styles.hint}>Type a query to search across all content.</p>
      ) : total === 0 ? (
        <p className={styles.hint}>No results for “{q}”.</p>
      ) : (
        <div className={styles.results}>
          {groupsWithResults.map((group) => (
            <section key={group.slug} className={styles.group} aria-labelledby={`search-${group.slug}`}>
              <h2 id={`search-${group.slug}`} className={styles.groupTitle}>
                {group.label}
                <span className={styles.count}>{group.total}</span>
              </h2>
              <ul className={styles.list}>
                {group.items.map((item) => (
                  <li key={`${group.slug}-${item.id}`}>
                    <a href={item.href}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      {item.subtitle ? <span className={styles.itemMeta}>{item.subtitle}</span> : null}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
