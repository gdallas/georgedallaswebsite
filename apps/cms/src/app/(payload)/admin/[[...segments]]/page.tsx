import config from "../../../../payload.config";
import { RootPage } from "@payloadcms/next/views";
import { importMap } from "../importMap.js";

type PageProps = {
  params: Promise<{
    segments: string[];
  }>;
  searchParams: Promise<Record<string, string | string[]>>;
};

export default function Page(props: PageProps) {
  return <RootPage config={config} importMap={importMap} {...props} />;
}
