## Summary

<!-- What does this change and why? -->

## Test plan

- [ ] `pnpm typecheck` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm test:run` green (added tests for new pure-function logic)
- [ ] `pnpm build` succeeds
- [ ] Drove the affected flow against `pnpm preview` (prod build), watching the console

## Checklist

- [ ] New user-facing strings added to **all 12** locale files (parity check passes)
- [ ] Schema changes are a new `supabase/migrations/NNNN_*.sql` (mirrored, not edited in place)
- [ ] No secrets committed (`.env.local`, service-role / JWT / Anthropic keys, webhook URLs)
- [ ] Docs updated if behavior/architecture changed (`README.md` / `CLAUDE.md`)
