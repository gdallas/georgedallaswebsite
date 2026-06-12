# GitHub Branch Protection Runbook

Protect both `develop` and `main`.

Required settings:

- Require a pull request before merging.
- Require at least one approval from George.
- Require review from CODEOWNERS.
- Require the CI quality gate checks to pass before merge.
- Require branches to be up to date before merge where practical.
- Require unresolved PR conversations to be resolved before merge.
- Disable force pushes.
- Disable branch deletion.

Production deployment should use a protected GitHub Environment named `production` with George as an approving reviewer.
