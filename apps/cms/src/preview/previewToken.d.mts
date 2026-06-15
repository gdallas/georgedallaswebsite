export type PreviewTokenInput = {
  collection: string;
  id: string | number;
  exp?: number;
  ttlSeconds?: number;
  now?: number;
};

export type PreviewTokenResult =
  | { valid: true; collection: string; id: string; exp: number }
  | { valid: false; reason: "missing_secret" | "malformed" | "bad_signature" | "expired" };

export function createPreviewToken(input: PreviewTokenInput, secret: string): string;
export function verifyPreviewToken(token: unknown, secret: string, now?: number): PreviewTokenResult;
