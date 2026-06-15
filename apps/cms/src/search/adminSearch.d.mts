export type SearchDoc = Record<string, unknown> & { id: string | number };

export type AdminSearchCollection = {
  slug: string;
  label: string;
  fields: string[];
  title: (doc: SearchDoc) => unknown;
  subtitle?: (doc: SearchDoc) => unknown;
};

export type SearchResultItem = {
  id: string | number;
  title: string;
  subtitle?: string;
  href: string;
};

export type SearchResultGroup = {
  slug: string;
  label: string;
  total: number;
  items: SearchResultItem[];
};

export type AdminSearchResult = {
  query: string;
  groups: SearchResultGroup[];
  total: number;
};

export type FindFn = (
  slug: string,
  where: Record<string, unknown>,
  limit: number
) => Promise<{ docs?: SearchDoc[]; totalDocs?: number } | null | undefined>;

export const adminSearchCollections: AdminSearchCollection[];
export function normalizeQuery(query: unknown): string;
export function buildSearchWhere(fields: string[], query: string): { or: Array<Record<string, { like: string }>> };
export function adminEditUrl(adminRoute: string, slug: string, id: string | number): string;
export function toResultItem(collection: AdminSearchCollection, doc: SearchDoc, adminRoute: string): SearchResultItem;
export function searchAllCollections(input: {
  find: FindFn;
  query: unknown;
  limitPerCollection?: number;
  adminRoute?: string;
  collections?: AdminSearchCollection[];
}): Promise<AdminSearchResult>;
