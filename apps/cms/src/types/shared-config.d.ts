declare module "../../../packages/shared/src/config.mjs" {
  import type { AppConfig } from "../../../../packages/shared/src/config";

  export function loadAppConfig(env?: Record<string, string | undefined>): AppConfig;
  export function validateAppConfig(config: AppConfig, errors?: string[]): void;
}
