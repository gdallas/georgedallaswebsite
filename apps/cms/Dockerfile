# Build context is the repository root: docker build -f apps/cms/Dockerfile .
# Runs the CMS as a Lambda container via the AWS Lambda Web Adapter (see
# docs/adr/2026-06-12-cms-lambda-hosting.md).

FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS builder
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@georgedallas/cms..."

# Build-time placeholders only: the standalone server re-reads process.env at
# runtime, where Lambda provides the real environment.
RUN APP_ENV=local \
    PUBLIC_SITE_URL=http://localhost:4321 \
    CMS_PUBLIC_URL=http://localhost:3000 \
    DATABASE_URL=postgres://placeholder:placeholder@localhost:5432/placeholder \
    S3_ENDPOINT=http://localhost:9000 \
    S3_REGION=us-east-1 \
    S3_BUCKET=placeholder \
    MEDIA_PUBLIC_URL=http://localhost:9000/placeholder \
    PAYLOAD_SECRET=build-time-placeholder \
    SESSION_SECRET=build-time-placeholder \
    pnpm --filter @georgedallas/cms build

FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS runtime
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1 \
    AWS_LWA_PORT=3000 \
    AWS_LWA_READINESS_CHECK_PATH=/api/health \
    AWS_LWA_INVOKE_MODE=buffered
WORKDIR /app
COPY --from=builder /repo/apps/cms/.next/standalone ./
COPY --from=builder /repo/apps/cms/.next/static ./apps/cms/.next/static
EXPOSE 3000
CMD ["node", "apps/cms/server.js"]
