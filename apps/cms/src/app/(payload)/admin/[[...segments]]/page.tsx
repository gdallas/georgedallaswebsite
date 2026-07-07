import type { Metadata } from "next";
import config from "../../../../payload.config";
import { RootPage, generatePageMetadata } from "@payloadcms/next/views";
import { importMap } from "../importMap.js";

type PageProps = {
  params: Promise<{
    segments: string[];
  }>;
  searchParams: Promise<Record<string, string | string[]>>;
};

// Without this export Next renders no admin <title> or favicon at all:
// Payload's admin.meta (title suffix, icons, description) only reaches the
// document through generatePageMetadata.
export function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  return generatePageMetadata({ config, params, searchParams });
}

export default function Page(props: PageProps) {
  return <RootPage config={config} importMap={importMap} {...props} />;
}
