const appEnvironments = new Set(["local", "development", "production"]);

export function loadAppConfig(env = process.env) {
  const errors = [];
  const required = (name) => {
    const value = env[name]?.trim();
    if (!value) {
      errors.push(`${name} is required`);
      return "";
    }
    return value;
  };

  const appEnvRaw = required("APP_ENV");
  const appEnv = appEnvironments.has(appEnvRaw) ? appEnvRaw : undefined;

  if (!appEnv && appEnvRaw) {
    errors.push("APP_ENV must be local, development, or production");
  }

  const config = {
    appEnv: appEnv ?? "local",
    publicSiteUrl: required("PUBLIC_SITE_URL"),
    cmsPublicUrl: required("CMS_PUBLIC_URL"),
    databaseUrl: required("DATABASE_URL"),
    s3: {
      endpoint: env.S3_ENDPOINT?.trim() || undefined,
      publicUrl: required("MEDIA_PUBLIC_URL"),
      region: required("S3_REGION"),
      bucket: required("S3_BUCKET"),
      accessKeyId: env.S3_ACCESS_KEY_ID?.trim() || undefined,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY?.trim() || undefined
    },
    payloadSecret: required("PAYLOAD_SECRET"),
    sessionSecret: required("SESSION_SECRET"),
    // Deployed environments only: CloudFront injects this header value so the
    // CMS can reject traffic that bypasses the CDN. Unset for local dev.
    originVerifySecret: env.ORIGIN_VERIFY_SECRET?.trim() || undefined
  };

  validateAppConfig(config, errors);

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join("\n- ")}`);
  }

  return config;
}

export function validateAppConfig(config, errors = []) {
  validateUrl("PUBLIC_SITE_URL", config.publicSiteUrl, errors);
  validateUrl("CMS_PUBLIC_URL", config.cmsPublicUrl, errors);
  validateUrl("MEDIA_PUBLIC_URL", config.s3.publicUrl, errors);

  if (!config.databaseUrl.startsWith("postgres://") && !config.databaseUrl.startsWith("postgresql://")) {
    errors.push("DATABASE_URL must be a PostgreSQL connection URL");
  }

  if (config.appEnv !== "production" && looksLikeProductionDatabase(config.databaseUrl)) {
    errors.push("Non-production environments must not use a production-looking DATABASE_URL");
  }

  if (config.appEnv === "local" && !config.s3.endpoint) {
    errors.push("S3_ENDPOINT is required for local S3-compatible storage");
  }

  if (config.payloadSecret.length < 16) {
    errors.push("PAYLOAD_SECRET must be at least 16 characters");
  }

  if (config.sessionSecret.length < 16) {
    errors.push("SESSION_SECRET must be at least 16 characters");
  }
}

function validateUrl(name, value, errors) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      errors.push(`${name} must use http or https`);
    }
  } catch {
    errors.push(`${name} must be a valid URL`);
  }
}

function looksLikeProductionDatabase(value) {
  const normalized = value.toLowerCase();
  return normalized.includes("prod") || normalized.includes("production") || normalized.includes("georgedallas.com");
}
