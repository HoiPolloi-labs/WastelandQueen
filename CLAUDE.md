# Wasteland Queen

Web tool to coordinate our state's **Wasteland King (WK)** event in *Puzzles & Survival*.
Local-only for now (no CI, no hosting). All state lives in `localStorage` with JSON import/export
for sharing across the alliance.

## What this app is for

WK runs every 2 weeks for up to 24h. The friction this tool removes:

1. **Roster** — keep a single source of truth for each player's rally size, main troop type,
   and the heroes that actually matter for captaining (Agent X +red stars, Dr. J, Nataly).
2. **Shifts** — schedule 2–4h shifts across the Hub + 4 turrets (N/S/E/W), plus mudsitters
   and hit-squad. Replaces the Google Form + spreadsheet flow.
3. **NAP** — record the terms negotiated per opposing state in Battle Division chat so the
   whole state can see them.
4. **Scoring** — track personal kill / death / occupation points toward the 10,000-point
   reward bar (Gold+ unlocks Nataly frags).

Full event mechanics lives in [`docs/wasteland-king-guide.md`](docs/wasteland-king-guide.md).
Read it before touching domain types — terminology there (Hub, turret, mud, NAP, Super
Reinforcement, Fast Comeback) is canon.

## Stack

- **Vite 6** + **React 19** + **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Tailwind v4** via `@tailwindcss/vite` — config is inline in `src/index.css` under `@theme`
- **React Router v7** for client-side routing
- **Zod** for runtime validation at boundaries (imports, form input)
- **localStorage** for persistence (`src/lib/storage.ts`), namespaced under `wq/v1:`
- `@/*` path alias resolves to `src/*`

No backend yet. When one is needed, swap `src/lib/storage.ts` for a fetch client; keep the
same `load/save/remove` shape so callers don't change.

## Layout

```
src/
  main.tsx              # entry, wraps <BrowserRouter>
  App.tsx               # nav shell + <Routes>
  index.css             # Tailwind + @theme tokens
  components/ui/        # generic presentation (PageHeader, EmptyState, ...)
  features/
    roster/             # player profiles
    shifts/             # shift planning
    nap/                # NAP terms
    scoring/            # personal point tracker
  lib/
    storage.ts          # localStorage wrapper + exportAll/importAll
    cn.ts               # clsx wrapper
  types/
    wk.ts               # domain types + point tables (KILL_POINTS, DEATH_POINTS)
docs/                   # event mechanics reference (do not edit casually)
```

Each `features/<area>/` directory owns its routes, components, hooks, and types for that area.
Promote a type to `src/types/` only when more than one feature consumes it. Promote a UI bit to
`components/ui/` only when reused.

## Commands

```
pnpm install
pnpm dev          # vite on http://localhost:5173
pnpm typecheck    # tsc -b --noEmit
pnpm lint
pnpm format
pnpm build
pnpm preview
```

## Conventions

- TypeScript strict mode is on, including `noUncheckedIndexedAccess` — array access returns
  `T | undefined`. Don't `!`-assert your way out; narrow it.
- Prettier: no semicolons, single quotes, trailing commas, 100 cols.
- Imports: prefer `@/...` over deep relative paths.
- IDs: generate with `crypto.randomUUID()` — no external uuid lib.
- Times: store ISO 8601 UTC strings (`new Date().toISOString()`). UI may render local.
- Never store points without the source (`kill | death | occupation`) — needed for the
  occupation cap rule.

## WK domain gotchas (read before modelling)

- **Occupation points cap at 2,000 (= 120 cumulative minutes)** per player — even if the
  player gets knocked off the turret and returns, the cap doesn't reset.
- **Death points only count at Hub or one of the 4 turrets.** Deaths in the mud / on RSS
  tiles give zero points (but DO count for kill points to the attacker).
- **Kill points exist for the killer regardless of where the kill happened** (Hub, turret,
  mud, foreign RSS tile).
- **Fast Comeback cap is 120% of might lost attacking Hub/turrets** — turret-fire deaths
  and mud deaths do NOT contribute to the cap. If we ever model FC, this distinction matters.
- **Tier 1 (T1) troops give 0 kill points but 4 death points.** Counterintuitive — don't
  "optimize" it away as a typo.
- **Nataly frags are gated by State Grade**: Gold = 5, Platinum = 8, Diamond = 12 per WK
  from the personal Ruler's Hand box. The captured-state King's Sword Box is higher.

## Working agreements with Claude

- Don't add a backend, auth, multi-user sync, or hosting until explicitly asked. The whole
  point of "local-only" is that we share via JSON export, not a server.
- Don't add UI component libraries (shadcn, MUI, Chakra). The existing Tailwind + tiny
  in-house `components/ui/` is enough; if a primitive is missing, add it there.
- Don't invent point values or tier rules — cross-check against
  [`docs/wasteland-king-guide.md`](docs/wasteland-king-guide.md). If the guide is ambiguous,
  ask Marcel rather than guessing.
- Features are intentionally scaffolded as empty pages. Implement them one at a time when
  asked; don't pre-build everything.
- No CI, no GitHub Actions, no Docker. Local dev only.
