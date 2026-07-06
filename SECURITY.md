# Security Policy

Report security issues privately to George Dallas before opening a public issue.

Do not commit secrets, tokens, production data, `.env.local`, database dumps, or generated infrastructure state. If a secret is exposed, rotate it immediately in the source system, remove the leaked value from active configuration, review logs for misuse, and treat the repository history as compromised for that value.

Enable GitHub secret scanning, push protection, and Dependency Graph for the repository. Dependency review and Dependabot are configured to run without production secrets.

Dependency Review only runs fully when GitHub Dependency Graph is enabled for the repository. If GitHub reports Dependency Review as unsupported, enable it in repository settings under security analysis.

The full threat model, accepted risks, and incident response basics live in `docs/security/threat-model.md`. For a suspected compromise: rotate the affected secret at its source first, then review the CMS audit log and CloudWatch/CloudTrail for misuse, then record what happened in `docs/security/`.
