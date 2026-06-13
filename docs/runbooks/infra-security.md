# Infrastructure Security Runbook

## GitHub OIDC

Deployments should use GitHub OIDC instead of long-lived AWS access keys.

The CDK foundation defines environment-scoped deploy roles:

- `georgedallaswebsite-dev-github-deploy`
- `georgedallaswebsite-prod-github-deploy`

The AWS IAM OIDC provider for `https://token.actions.githubusercontent.com` is an account-level singleton that already exists in this shared AWS account (created by another project). The foundation stacks reference it by ARN rather than creating a duplicate, which IAM would reject. If this project ever moves to a fresh account, create the provider once with:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
```

The dev role is intended for the GitHub Environment named `development`. The prod role is intended for the GitHub Environment named `production`.

Deploy roles can assume the CDK bootstrap roles (`cdk-*`) in this account; deployments run `cdk deploy` and the actual resource permissions live on those scoped bootstrap roles, not on the deploy role itself.

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
