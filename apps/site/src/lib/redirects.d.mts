import type { RedirectRecord, RedirectOptions } from "@georgedallas/shared/redirects";

export function buildRedirectDocument(props?: { destination?: string; statusCode?: string }): string;

export function toRedirectRoutes(
  redirects: RedirectRecord[],
  options?: RedirectOptions
): Array<{
  params: { redirect: string };
  props: { source: string; destination: string; statusCode: string };
}>;
