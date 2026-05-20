# Wasteland Queen

Web tool to coordinate our state's **Wasteland King (WK)** event in *Puzzles & Survival*.
Replaces the Google-Form → Excel → VBA sorting workflow with a public sign-up form, an
auto-sorting planner with drag-and-drop, and a Discord-shareable read-only board.

## What this app does

Three URLs per WK event:

| URL | Audience | Purpose |
|---|---|---|
| `/signup/:eventId` | every player | Mobile-first form. IGN, alliance tag, server, tier, type, max-solo-lair, rally size, captain-willing, shift. No registration. |
| `/plan/:eventId` | the planner (Marcel) | Plaza visualization with drag-and-drop. Auto-sort button, conflict banner, stats sidebar. |
| `/board/:eventId` | the alliance | Read-only Plaza, PNG-export, QR-code linking to sign-up. |

Plus `/plan/new` to create a new event (date, turret mode, home server, notes).

Full event mechanics in [`docs/wasteland-king-guide.md`](docs/wasteland-king-guide.md) — terminology
canon (Hub, turret, mud, NAP, Super Reinforcement, Fast Comeback).

## Stack

- **Vite 6** + **React 19** + **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Tailwind v4** via `@tailwindcss/vite`, inline `@theme` tokens in `src/index.css`
- **React Router v7**
- **@dnd-kit/core** + **@dnd-kit/sortable** for planner drag-and-drop
- **Supabase** (Postgres + auto-REST) for backend — project `ecxuvcuvuawxriucarmh` (eu-central-1)
- **Zod** for form validation (`src/features/signup/signup-schema.ts`)
- **html-to-image** for PNG export, **qrcode** for the sign-up QR
- `@/*` path alias → `src/*`

## Layout

```
src/
  main.tsx                       # entry, <BrowserRouter>
  App.tsx                        # nav shell, hides chrome on /signup + /board
  index.css                      # Tailwind + @theme tokens (wk-turret-* colors)
  components/ui/                 # in-house primitives — Button, Input, Segmented, Toggle, PageHeader, EmptyState
  features/
    event/
      EventSetupPage.tsx         # /plan/new — wizard
      event-id.ts                # next-Saturday → wk-YYYY-MM-DD
      use-event.ts               # SWR-free fetch hook
    signup/
      SignupPage.tsx             # /signup/:eventId — mobile-first form
      signup-schema.ts           # zod schema
      TypeCard.tsx               # Fighter/Shooter/Rider picker
    plan/
      PlanPage.tsx               # /plan/:eventId — Plaza + DnD + sidebar
      Plaza.tsx                  # 5-dropzone Hub-centric layout
      Building.tsx               # Hub/turret slot, type-synergy ring
      PlayerChip.tsx             # draggable card with captain crown
      UnassignedPool.tsx         # left column with filter/search
      ConflictBanner.tsx         # warnings (no captain, mixed types)
      StatsSidebar.tsx           # type-dist bars + counters
      auto-sort.ts               # pure algorithm — captainScore, autoSort
      use-signups.ts             # fetch signups
      use-assignments.ts         # CRUD + applyDraft
    board/
      BoardPage.tsx              # /board/:eventId — read-only + PNG/QR
      Qr.tsx                     # qrcode → data URL
  lib/
    supabase.ts                  # untyped client (cast in hooks)
    capture.ts                   # downloadAsPng (html-to-image wrapper)
    cn.ts                        # clsx wrapper
  types/
    wk.ts                        # domain types + WK point tables (kept from scaffold)
supabase/
  migrations/0001_init.sql       # tables, indexes, RLS policies
docs/                            # WK guide reference (do not edit casually)
```

## Commands

```
pnpm install
pnpm dev          # vite on http://localhost:5173
pnpm typecheck
pnpm lint
pnpm format
pnpm build
pnpm preview
```

Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
(see `.env.example`).

## Backend / Supabase

- **Project**: `wasteland-queen` (ref `ecxuvcuvuawxriucarmh`) in `eu-central-1`.
- **Tables**: `events`, `signups`, `assignments` (see [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)).
- **RLS**: pragmatic — anon can read/write all three tables (security by URL obscurity).
  Acceptable for a 30–50 player alliance tool where the planner URL is shared on Discord.
  If you ever need to harden, add per-event tokens and tighten the policies.
- **Migrations**: managed via Supabase MCP `apply_migration` (no local supabase CLI in scope).
  Mirror every applied migration in `supabase/migrations/NNNN_name.sql` for the repo record.

## Auto-sort algorithm

Pure function in `src/features/plan/auto-sort.ts`. Per shift:

1. Pool = signups whose `shift_pref` covers this shift, sorted by `captainScore` desc.
   `captainScore = rally/100k × 6 + lair × 3 + tier` (rally dominates per WK guide).
2. **Hub captain** = strongest willing captain, type-agnostic.
3. **Turret layout** per `event.turret_mode`:
   - `duplicate-strongest`: dominant type gets turret-N + turret-S; others get one each.
   - `mixed-4th`: 3 turrets typ-rein (N=fighter, E=shooter, S=rider), W = leftovers.
   - `manual`: everyone lands in `unassigned`, planner sorts by hand.
4. Per turret: assign captain (highest-scored willing captain of that type), then
   round-robin fill non-captains by type into their turret(s).
5. Players without a matching turret in their type → `reserve` (or `turret-w` in mixed-4th).

`autoSort()` returns a `DraftAssignment[]`. `useAssignments.applyDraft()` deletes existing
rows for the event and bulk-inserts the draft. Manual drag-and-drop edits use `moveOne`
which does the existing-row check + update-or-insert (no PostgREST upsert because the
unique constraint columns aren't in the conflict-target spec by default).

## WK domain gotchas

- **3 troop types, 4 turrets** — the algorithm respects `turret_mode`; don't hard-code.
- **Hub is the 5th building** and captain'd separately (not part of turret rotation).
- **"Both"-shift players** show up in both shift pools; auto-sort prefers the shift where
  their type is thinner. Drag-edits are scoped to one shift; cross-shift moves are blocked
  (a player can be assigned in shift 1 AND shift 2 via separate auto-sort runs).
- **Type-pure turret** triggers the synergy ring (Super Reinforcement visual). If you mix
  types in a turret, the ConflictBanner calls it out.
- **Rally size dominates captain scoring** because in WK the captain's rally size = the
  building's capacity (see guide). Don't reweight without reading the captain duties section.
- **Personal point tables (KILL_POINTS / DEATH_POINTS)** are still in `src/types/wk.ts` —
  not yet used in any UI, kept for the future scoring feature.

## Deploy

Frontend → Vercel (Vite preset, see `vercel.json`):

1. Connect repo at https://vercel.com/new or run `vercel` CLI in the repo.
2. Set env vars in Vercel project settings:
   - `VITE_SUPABASE_URL` = `https://ecxuvcuvuawxriucarmh.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (the `sb_publishable_...` from `.env.local`)
3. Deploys are static — any push to main rebuilds. No CI/GitHub Actions needed.

## Working agreements with Claude

- Don't add authentication or user accounts — the design is "no registration".
- Don't introduce a UI library (shadcn, MUI, Chakra). Extend `components/ui/` instead.
- Don't invent point values or WK rules — cross-check `docs/wasteland-king-guide.md`.
- Don't change Supabase schema directly via `execute_sql` — use `apply_migration` and
  mirror the file in `supabase/migrations/`.
- Don't pre-build features. Implement on request; the placeholder cleanup is already done.
- localStorage is gone for domain data (moved to Supabase). Only use it for client-side
  preferences if needed (e.g. "last visited event").
