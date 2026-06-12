# Infrastructure Runbook

Infrastructure is managed with AWS CDK from `infra/`.

## Local Validation

From the repository root:

```bash
pnpm install
pnpm --filter @georgedallas/infra synth
```

CDK synth must not require production secrets.

## Environments

The CDK app defines separate `dev` and `prod` foundation stacks. Later infrastructure tickets should add reusable constructs while preserving environment isolation.

## Account Isolation

This project can share an AWS account with other websites, but its resources must remain logically separate. Do not reuse VPCs, databases, buckets, IAM roles, KMS keys, CloudFront distributions, or Secrets Manager paths from other sites unless a future ADR explicitly approves it.

All George Dallas website resources use the `georgedallaswebsite` project prefix and environment-specific names so they are easy to identify in a shared AWS account.

## Naming and Tags

Resource names should use:

```text
georgedallaswebsite-<environment>-<component>
```

Required tags:

- `project=georgedallaswebsite`
- `environment=<dev|prod>`
- `owner=George Dallas`
- `managed-by=aws-cdk`

## Review and Apply

Infrastructure changes must go through pull request review. Destructive changes require explicit notes covering affected resources, backup or recovery expectations, and rollback steps.

Do not commit credentials, generated state, local CDK output, or secret values.
