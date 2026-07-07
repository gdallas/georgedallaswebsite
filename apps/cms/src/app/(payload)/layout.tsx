import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import type { ServerFunctionClient } from "payload";
import config from "../../payload.config";
import "@payloadcms/next/css";
import "./custom.css";
import { importMap } from "./admin/importMap.js";

type LayoutProps = {
  children: React.ReactNode;
};

// The "use server" directive makes this a serializable server-action
// reference; without it, production rendering fails with React's
// "Functions cannot be passed directly to Client Components" error.
const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({
    ...args,
    config,
    importMap
  });
};

export default async function PayloadLayout({ children }: LayoutProps) {
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  );
}
