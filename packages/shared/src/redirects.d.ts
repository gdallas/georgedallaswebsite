export type RedirectRecord = {
  sourcePath?: string | null;
  destination?: string | null;
  statusCode?: string | null;
  status?: string | null;
  enabled?: boolean | null;
};

export type RedirectOptions = {
  allowedHosts?: string[];
  maxHops?: number;
};

export type ServableRedirect = {
  source: string;
  destination: string;
  statusCode: string;
};

export type RedirectResolution = {
  destination: string | null;
  hops: number;
  loop: boolean;
};

export function redirectActiveWhere(): {
  status: { equals: string };
  enabled: { not_equals: boolean };
};
export function normalizeRedirectPath(path: string | null | undefined): string | null;
export function isSafeRedirectDestination(destination: string | null | undefined, options?: RedirectOptions): boolean;
export function detectRedirectLoops(redirects: RedirectRecord[]): Set<string>;
export function selectServableRedirects(redirects: RedirectRecord[], options?: RedirectOptions): ServableRedirect[];
export function resolveRedirectChain(
  redirects: RedirectRecord[],
  path: string,
  options?: RedirectOptions
): RedirectResolution;
