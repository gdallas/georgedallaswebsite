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
