# GitHub Branch Protection Runbook

Protect both `develop` and `main`.

**Status check (2026-07-06, GDW-050):** the API reports **no protection
applied** — neither classic branch protection nor rulesets exist. The
commands below create the intended rulesets; running them is a repository
governance change, so George applies them (Settings → Rules → Rulesets, or
the CLI below).

## Intended rules

- Require a pull request before merging (no direct pushes to `develop`/`main`).
- Require the CI checks to pass: `Quality Gates`, `E2E Smoke`, `Dependency Review`.
- Require unresolved PR conversations to be resolved before merge.
- Disable force pushes and branch deletion.
- Required approvals: currently `0` — George has delegated merge authority
  for the launch push (2026-07-06) and merges are gated by green CI. Raise
  `required_approving_review_count` to `1` to restore the human approval
  gate at any time (recommended after launch).

## Apply via CLI

```bash
cat > ruleset.json <<'JSON'
{
  "name": "protect-develop",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/develop"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "required_status_checks": [
          { "context": "Quality Gates" },
          { "context": "E2E Smoke" },
          { "context": "Dependency Review" }
        ],
        "strict_required_status_checks_policy": false
      }
    }
  ]
}
JSON
gh api repos/gdallas/georgedallaswebsite/rulesets -X POST --input ruleset.json
sed -e 's/protect-develop/protect-main/' -e 's|refs/heads/develop|refs/heads/main|' ruleset.json > ruleset-main.json
gh api repos/gdallas/georgedallaswebsite/rulesets -X POST --input ruleset-main.json
```

## Production environment

Production deployment uses the protected GitHub Environment named
`production` (it already exists). In Settings → Environments → production,
add George as a **required reviewer** so prod deploys pause for human
approval, and restrict deployment branches to `main`.
