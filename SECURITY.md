# Security Policy

Report security issues privately to George Dallas before opening a public issue.

Do not commit secrets, tokens, production data, `.env.local`, database dumps, or generated infrastructure state. If a secret is exposed, rotate it immediately in the source system, remove the leaked value from active configuration, review logs for misuse, and treat the repository history as compromised for that value.

Enable GitHub secret scanning and push protection for the repository. Dependency review and Dependabot are configured to run without production secrets.
