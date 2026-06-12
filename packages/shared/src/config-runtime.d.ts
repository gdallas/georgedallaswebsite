import type { AppConfig } from "./config";

export function loadAppConfig(env?: Record<string, string | undefined>): AppConfig;
export function validateAppConfig(config: AppConfig, errors?: string[]): void;
