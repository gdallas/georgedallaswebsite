## Summary

-

## Testing Evidence

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`

## Security

- [ ] No secrets, tokens, credentials, or production data are committed.
- [ ] New secret names are documented in `.env.example` or the infra runbook with placeholder values only.
- [ ] Public code only exposes content intended for public visibility.
- [ ] Environment changes preserve local, development, and production separation.
- [ ] Database migrations are reviewed, reversible where practical, and include rollback notes when destructive.
- [ ] Risky production migrations include a recent backup or snapshot identifier in the PR/deployment notes.

## Accessibility

- [ ] Keyboard, focus, semantic HTML, color contrast, and reduced-motion impact were considered.

## Documentation

- [ ] README, runbooks, ADRs, or environment examples were updated where relevant.
