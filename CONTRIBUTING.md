# Contributing to Wasteland Queen

Thanks for your interest! This is a community tool for coordinating the
**Wasteland King** event in *Puzzles & Survival*. Forks for your own state,
bug reports, and PRs are all welcome.

## Getting set up

```bash
pnpm install
cp .env.example .env.local
# fill in VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
pnpm dev          # http://localhost:5173
```

You need your **own** Supabase project (free tier is fine). Apply the schema
from `supabase/migrations/0001..NNNN_*.sql` in order, then drop the URL +
publishable (anon) key into `.env.local`. See [`README.md`](README.md#deploy)
for the deploy story and [`CLAUDE.md`](CLAUDE.md) for the deeper engineering
context (RLS model, auto-sort algorithm, edge functions).

## The local check before you push

CI runs all four; run them locally first so the loop is fast:

```bash
pnpm typecheck     # tsc -b --noEmit
pnpm lint          # eslint .
pnpm test:run      # vitest run
pnpm build         # tsc -b && vite build
```

Everything must be green. Tests are **pure-function only** (Vitest +
happy-dom) — UI/DnD is verified manually against the production build
(`pnpm preview`). If you add domain logic to a pure module, add a test for it.

## House rules

- **Internationalization is non-optional.** Adding any user-facing string means
  adding the key + a translation to **all 12 locale files** in
  `src/i18n/locales/`. Game-client terms (Hub, Mud, Captain, Tier, Rally,
  Super Reinforcement, Fast Comeback, IGN, …) stay untranslated in every
  language. There's a parity-check one-liner in `CLAUDE.md`; it must print
  `parity` for every locale.
- **Schema changes are migrations.** Add a new `supabase/migrations/NNNN_*.sql`
  — never edit an applied one. Use `apply_migration`, then mirror the file into
  the repo. DDL only via migrations, not ad-hoc SQL.
- **Respect the auth model.** The only security boundary is the per-event
  uuid tokens + JWT-claim RLS. Don't add routes that read/write event data
  outside an `EventAuthGate`. Never expose `planner_token` to non-planner
  roles (see the column-grant gotcha in `CLAUDE.md`).
- **No new UI library.** Extend `src/components/ui/` instead of pulling in
  shadcn/MUI/Chakra.
- **Don't invent game rules.** Cross-check WK mechanics against
  [`docs/wasteland-king-guide.md`](docs/wasteland-king-guide.md).

## Commit & PR

- Keep commits focused; explain the *why* in the body.
- Open a PR against `main` with a short summary + a test-plan checklist.
- Secrets (`.env.local`, service-role key, `JWT_PRIVATE_KEY`, the Anthropic
  key, Discord webhook URLs) are **never** committed. They live in `.env.local`
  (gitignored) or Supabase function secrets only.

## Reporting bugs / ideas

Use the GitHub issue templates. For anything security-sensitive (token leakage,
RLS bypass, etc.), see [`SECURITY.md`](SECURITY.md) instead of filing a public
issue.
