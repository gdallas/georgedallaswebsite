# Media Storage Runbook

CMS media is stored in private S3 buckets and delivered through CloudFront.

## Resources

Each environment has:

- S3 bucket: `georgedallaswebsite-<environment>-media`
- CloudFront distribution for public media delivery

The S3 buckets block all public access and use S3-managed encryption at rest. Direct public listing is disabled. Public media should be referenced through the CloudFront distribution domain or a future reviewed custom media domain.

The CMS uses `MEDIA_PUBLIC_URL` as the public delivery base URL for media records. In deployed environments this value should be the environment's CloudFront media distribution URL or reviewed media custom domain. Local development can use the MinIO bucket URL, for example `http://localhost:9000/georgedallas-local-media`.

## Prefixes

Approved top-level prefixes:

- `uploads/`
- `wordpress-imports/`
- `book-covers/`
- `project-images/`
- `social-images/`

The CMS runtime role has read/write access only within these prefixes.

## Versioning and Lifecycle

Production media bucket versioning is enabled. Development versioning is disabled by default.

Lifecycle rules are conservative: incomplete multipart uploads are aborted after seven days. No rule deletes original media objects without explicit review.

## CORS

CORS is limited to the expected public and CMS origins:

- production: `https://georgedallas.com`, `https://www.georgedallas.com`, `https://cms.georgedallas.com`
- development: `https://dev.georgedallas.com`, `https://cms-dev.georgedallas.com`

## Backups

Production S3 versioning protects against accidental overwrite or deletion. Additional replication or archival policies should be evaluated after launch once real media volume and cost are known.
