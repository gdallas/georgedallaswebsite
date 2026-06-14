export function buildPreviewUrl(input?: {
  collection?: string;
  id?: string | number | null;
  cmsPublicUrl?: string;
  secret?: string;
  ttlSeconds?: number;
}): string | null;
