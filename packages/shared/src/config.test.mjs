import assert from "node:assert/strict";
import test from "node:test";
import { loadAppConfig } from "./config.mjs";

const validEnv = {
  APP_ENV: "local",
  PUBLIC_SITE_URL: "http://localhost:4321",
  CMS_PUBLIC_URL: "http://localhost:3000",
  MEDIA_PUBLIC_URL: "http://localhost:9000/georgedallas-local-media",
  DATABASE_URL: "postgres://george:george-local-password@localhost:5432/georgedallas_local",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "georgedallas-local-media",
  S3_ACCESS_KEY_ID: "local-minio",
  S3_SECRET_ACCESS_KEY: "local-minio-password",
  PAYLOAD_SECRET: "local-payload-secret-value",
  SESSION_SECRET: "local-session-secret-value"
};

test("loads valid local configuration", async () => {
  const config = loadAppConfig(validEnv);

  assert.equal(config.appEnv, "local");
  assert.equal(config.s3.endpoint, "http://localhost:9000");
});

test("fails fast when required variables are missing", async () => {
  assert.throws(
    () => loadAppConfig({ ...validEnv, DATABASE_URL: "" }),
    /DATABASE_URL is required/
  );
});

test("blocks production-looking database URLs outside production", async () => {
  assert.throws(
    () => loadAppConfig({ ...validEnv, DATABASE_URL: "postgres://example/prod" }),
    /Non-production environments/
  );
});
