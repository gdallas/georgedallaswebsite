export type VisibilityDoc = {
  status?: string | null;
  visibility?: string | null;
  publishedAt?: string | null;
};

export type WhereClause = {
  and: Array<Record<string, Record<string, string>>>;
};

export function isPublicBuildVisible(doc: VisibilityDoc, now?: Date | string): boolean;
export function publicBuildWhere(now?: Date | string): WhereClause;
export function isPublicListingVisible(doc: VisibilityDoc): boolean;
export function publicListingWhere(): WhereClause;
export function isNowPagePublic(doc: { status?: string | null }): boolean;
