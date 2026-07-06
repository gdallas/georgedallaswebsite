# Cost Controls Runbook

George's budget target for this website is under USD $10/month total. Infrastructure decisions must respect it (see `docs/adr/2026-06-12-aurora-serverless-v2-scale-to-zero.md`).

## Standing cost posture

- Region: `ca-central-1` for all project resources.
- Database: Aurora Serverless v2 with scale-to-zero — $0 compute while idle, ~$0.10/month storage for a small content database, an estimated $1–2/month in ACU-hours for a few editing hours per week.
- VPCs use no NAT gateways (a NAT gateway alone is ~$35/month — never add one without an ADR).
- Dev foundation idle estimate: ~$4–5/month (KMS key $1, seven Secrets Manager secrets ~$2.80, Aurora storage, S3 pennies).
- The prod foundation stack is defined but deliberately **not deployed** until launch preparation (GDW-051), which roughly doubles foundation cost when it lands.

## Budget alert

A monthly AWS Budget named `georgedallaswebsite-monthly` is configured for $10 with email alerts to George at 80% actual, 100% actual, and 100% forecasted spend. AWS Budgets is account-global and managed outside CDK; to recreate it, see the `create-budget` command recorded in this runbook's history or re-run the setup documented below.

```bash
aws budgets create-budget --account-id <ACCOUNT_ID> \
  --budget '{"BudgetName":"georgedallaswebsite-monthly","BudgetLimit":{"Amount":"10","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' \
  --notifications-with-subscribers '[
    {"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"<EMAIL>"}]},
    {"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":100},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"<EMAIL>"}]},
    {"Notification":{"NotificationType":"FORECASTED","ComparisonOperator":"GREATER_THAN","Threshold":100},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"<EMAIL>"}]}
  ]'
```

Note: the account is shared with other projects, so the budget tracks whole-account spend. Use cost allocation tags (`project=georgedallaswebsite`) in Cost Explorer to attribute spend per project.

## Rules for future tickets

- CMS hosting (GDW-013) runs as a Lambda container behind CloudFront — ~$0 idle, cents during editing (see `docs/adr/2026-06-12-cms-lambda-hosting.md`). Do not replace it with an always-on Fargate task or an Application Load Balancer (~$16/month) without a superseding ADR.
- Frontend hosting (GDW-014) should stay within the static-hosting pricing tier (S3 + CloudFront or Amplify Hosting are effectively free at this traffic level).
- Tolerate the ~15-second Aurora resume on first connection rather than adding keep-warm pings that defeat auto-pause.
- Any resource with a fixed monthly cost above $1 needs to be called out in the PR description.
