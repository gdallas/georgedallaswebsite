# Infrastructure Security Runbook

## GitHub OIDC

Deployments should use GitHub OIDC instead of long-lived AWS access keys.

The CDK foundation defines environment-scoped deploy roles:

- `georgedallaswebsite-shared-github-oidc`
- `georgedallaswebsite-dev-github-deploy`
- `georgedallaswebsite-prod-github-deploy`

The shared OIDC stack defines the AWS IAM OIDC provider for `https://token.actions.githubusercontent.com`.

The dev role is intended for the GitHub Environment named `development`. The prod role is intended for the GitHub Environment named `production`.

Trust policies require:

- audience: `sts.amazonaws.com`
- repository: `gdallas/georgedallaswebsite`
- GitHub Environment matching the target AWS environment

## Runtime Roles

The CDK foundation defines separate runtime roles per environment:

- `georgedallaswebsite-<environment>-cms-runtime`
- `georgedallaswebsite-<environment>-jobs-runtime`

CMS runtime receives read access to application secrets needed by the CMS. Jobs runtime receives read access only to job-oriented secrets until later tickets create queues, buckets, and APIs that can be granted explicitly.

## Secrets

Secrets Manager placeholders are defined per environment:

- `/georgedallaswebsite/<environment>/database-credentials`
- `/georgedallaswebsite/<environment>/payload-secret`
- `/georgedallaswebsite/<environment>/session-secret`
- `/georgedallaswebsite/<environment>/webhook-secret`
- `/georgedallaswebsite/<environment>/email-config`
- `/georgedallaswebsite/<environment>/external-api-keys`

Do not print secret values in logs. Do not copy production values into local `.env.local` files.

## KMS

Each environment has a KMS key alias:

```text
alias/georgedallaswebsite-<environment>-app-key
```

Production keys use a retain policy. Development keys can be destroyed with explicit review.

## Review Notes

Infrastructure pull requests must explain any new permissions, whether they are environment-scoped, and what resource ARNs they apply to. Broad `*` permissions require justification and should be temporary where possible.
