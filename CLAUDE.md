# Wasteland Queen

Web tool to coordinate our state's **Wasteland King (WK)** event in *Puzzles & Survival*.
Replaces the Google-Form → Excel → VBA sorting workflow with a public sign-up form, an
auto-sorting planner with drag-and-drop, and a shareable read-only board.

## What this app does

Three URLs per WK event, each gated by its own random uuid token:

| URL | Audience | Purpose |
|---|---|---|
| `/signup/:eventId/:signupToken` | every player | Mobile-first form (in 12 languages). IGN, alliance tag, server, tier, type, max-solo-lair, rally size, captain-willing, shift, pre-event checklist. No registration; per-signup `edit_token` (localStorage) gates self-edit and Withdraw. |
| `/plan/:eventId/:plannerToken` | the planner (Marcel) | Plaza visualization with drag-and-drop. Auto-sort, conflict banner, health-check, stats sidebar, NAP terms, Discord webhook, roster CSV/XLSX, token rotation, pre-event readiness tracker. |
| `/board/:eventId/:boardToken` | the alliance | Read-only Plaza, PNG-export, QR-code linking to sign-up, NAP terms display. |

Plus `/plan/new` to create a new event (anon-allowed; success screen returns all 3 URLs).

Full event mechanics in [`docs/wasteland-king-guide.md`](docs/wasteland-king-guide.md) —
terminology canon (Hub, turret, mud, NAP, Super Reinforcement, Fast Comeback).

## Stack

- **Vite 6** + **React 19** + **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Tailwind v4** via `@tailwindcss/vite`, inline `@theme` tokens in `src/index.css`
- **React Router v7**
- **@dnd-kit/core** + **@dnd-kit/sortable** for planner drag-and-drop, with both
  `PointerSensor` (mouse/stylus, distance:4) and `TouchSensor` (delay:150/tolerance:5).
- **Supabase** (Postgres + auto-REST + Realtime + Edge Functions) — project
  `ecxuvcuvuawxriucarmh` (eu-central-1).
- **Zod** for form validation (`src/features/signup/signup-schema.ts`)
- **react-i18next** + **i18next-browser-languagedetector** — 12 locales
  (en/de/ru/zh/ko/ja/it/tr/es/el/uk/fr), browser auto-detect with English
  fallback. Game terms (Hub, Mud, Captain, Tier, Lair, Hit Squad, Whale,
  Rally, Super Reinforcement, IGN, Fast Comeback) stay untranslated.
- **xlsx** (SheetJS) for roster import/export — dynamic-imported so the
  ~430KB chunk only loads when user clicks Export/Import.
- **html-to-image** for PNG export, **qrcode** for the sign-up QR
- `@/*` path alias → `src/*`

## Layout

```
src/
  main.tsx                       # entry, <BrowserRouter>, imports ./i18n
  App.tsx                        # nav shell + LanguageSwitcher; hides chrome on public routes
  index.css                      # Tailwind + @theme tokens
  i18n/
    index.ts                     # i18next init, supported locales, detection config
    locales/{en,de,ru,zh,ko,ja,it,tr,es,el,uk,fr}.json
  components/ui/                 # in-house primitives — Button, Input, Segmented, Toggle,
                                 #   PageHeader, EmptyState, BuildInfo, LanguageSwitcher
  features/
    auth/
      EventAuthGate.tsx          # reads :eventId/:token, exchanges JWT, injects into supabase
      LegacyTokenlessURL.tsx     # /plan/:id (no token) → redirect via localStorage or "URL outdated"
    event/
      EventSetupPage.tsx         # /plan/new — wizard with success-screen 3-URL output
      event-id.ts                # next-Saturday → wk-YYYY-MM-DD (round-trip safe)
      use-event.ts               # SWR-free fetch hook with refresh
      use-events.ts              # usePlannerEvents — lists events from localStorage (post-RLS)
      EventPicker.tsx            # planner header dropdown (limited to known-token events)
    signup/
      SignupPage.tsx             # /signup/:eventId/:token — mobile form with pre-event checklist
      signup-schema.ts           # zod schema (rally_size mandatory)
      TypeCard.tsx               # Fighter/Shooter/Rider picker
      ProfileScreenshotUpload.tsx # optional Vision-LLM auto-fill from game profile screenshot
      HeroesScreenshotUpload.tsx  # optional Vision-LLM auto-fill for hero frag counts (heroes_enabled)
      edit-token.ts              # localStorage gate for Withdraw button
      notify.ts                  # Discord ping (signup events + planner-triggered reminders)
    plan/
      PlanPage.tsx               # /plan/:eventId/:token — Plaza + DnD + sidebar
      Plaza.tsx                  # 5-dropzone Hub layout + Mud/Reserve/Hit-Squad row
      Building.tsx               # Hub/turret slot, type-synergy ring, tier heat bar, captain-present toggle
      PlayerChip.tsx             # draggable card with captain crown + score badge
      OtherShiftDropzone.tsx     # cross-shift DnD target
      UnassignedPool.tsx         # left column with filter/search
      ConflictBanner.tsx         # warnings (no captain, mixed types)
      StatsSidebar.tsx           # type-dist bars + counters
      HealthCheckPanel.tsx       # pre-event readiness signals per shift
      PreEventStatusPanel.tsx    # per-player checklist gaps + Copy/Send reminder + Mudsit-Check
      HeroesSettings.tsx         # planner-side toggle for event.heroes_enabled
      HeroesContext.tsx          # context carrying heroes_enabled down to PlayerChip
      WebhookSettings.tsx        # Discord webhook URL via set_event_secret RPC
      TokenRotation.tsx          # rotate signup/planner/board tokens via RPC + navigate
      RosterImportExport.tsx     # XLSX/CSV export + import (upsert by IGN, heroes cols when enabled)
      auto-sort.ts               # pure algorithm — captainScore, autoSort
      health-check.ts            # pure — per-shift readiness signals
      preevent-status.ts         # pure — checklist gaps + Mudsit-shield gaps + reminder text
      use-signups.ts             # fetch signups + realtime subscription
      use-assignments.ts         # CRUD + applyDraft + setCaptainPresent + foreign_target + realtime
    nap/
      use-nap-terms.ts           # fetch/add/update/remove + realtime
      NapList.tsx                # read-only or interactive list of terms
      NapPanel.tsx               # planner sidebar variant with add-form + copy-to-chat
    board/
      BoardPage.tsx              # /board/:eventId/:token — read-only + PNG/QR
      Qr.tsx                     # qrcode → data URL
    awards/
      AwardsPage.tsx             # /awards/:eventId/:token — score table + box assignment + governor cockpit + heroes-panel
      PointCalcModal.tsx         # per-tier kill/death breakdown calculator (optional)
      contribution.ts            # pure — score-weighting per signup
      use-box-counts.ts          # event-config persistence for box counts
  lib/
    supabase.ts                  # createClient + setEventSession (JWT injection via accessToken)
    capture.ts                   # downloadAsPng (html-to-image wrapper)
    cn.ts                        # clsx wrapper
    csv.ts                       # RFC4180 parser + stringifier (no PapaParse dependency)
    share-formats.ts             # Plaza + NAP → plain-ASCII for in-game chat paste
  types/
    wk.ts                        # domain types + WK point tables + Checklist + CHECKLIST_KEYS
supabase/
  migrations/0001..0029_*.sql    # mirrored from `apply_migration` MCP calls
  functions/
    notify-discord/index.ts      # Webhook poster: signup events + planner-triggered reminders
    token-exchange/index.ts      # mints per-event JWT (ES256 asymmetric or HS256 legacy)
    extract-profile/index.ts     # Vision-LLM dispatcher: kind='profile' | 'heroes'; rate-limited
docs/                            # WK guide reference (do not edit casually)
```

## Commands

```
pnpm install
pnpm dev            # vite on http://localhost:5173
pnpm typecheck
pnpm lint
pnpm format
pnpm build
pnpm preview        # production-built bundle on http://localhost:4173
pnpm test           # vitest watch mode
pnpm test:run       # one-shot
pnpm test:coverage  # v8 coverage report
```

## Tests

Vitest + happy-dom. Pure-function coverage only — UI is verified manually
via the Claude Preview MCP. Component / DnD tests would be high cost for
low ROI given the visual nature of the planner.

Suites:

- `src/types/wk.test.ts` — `parseShiftPref` / `serializeShiftPref` roundtrip
- `src/features/event/shift-window.test.ts` — UTC time-window math for 1–4 shifts
- `src/features/event/event-id.test.ts` — next-Saturday + id roundtrip + regression
  guard ensuring `nextSaturdayIso()` output never breaks `Date.toISOString()`
- `src/features/signup/signup-schema.test.ts` — zod boundaries
- `src/features/awards/contribution.test.ts` — score-weighting + attendance + early-signup
- `src/features/plan/auto-sort.test.ts` — all 3 turret modes, captain selection,
  cross-shift, invariants (no double-assign, never auto-route to `hit-squad`)
- `src/features/plan/health-check.test.ts` — readiness signals (hub captain,
  type pool, hit-squad coverage, absent-captain errors)
- `src/features/plan/preevent-status.test.ts` — missing-checklist gaps + reminder format
- `src/lib/csv.test.ts` — RFC4180 quoting, BOM, trailing-empty-row dropping
- `src/lib/share-formats.test.ts` — Plaza + NAP plain-ASCII serialization

Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
(see `.env.example`).

## Verification workflow (anti-regression)

UI changes must be verified against the production-built bundle, not just dev mode.
Dev sometimes catches errors that prod (with minification + different exception
paths) doesn't, and vice-versa.

1. `pnpm build && pnpm preview` — open on http://localhost:4173.
2. Drive the real user flow that the change affects (not just "does the button exist?").
   Clear inputs, mid-edit navigation, oversized files, malformed input — all the
   ways a real user would break it.
3. Open the browser console and watch for `console.error` during the flow. The
   `Invalid time value` RangeError in EventSetupPage slipped through dev-only
   checks because no one cleared the date input.
4. For Vision-LLM / Edge Function changes: curl the endpoint directly with both
   valid and invalid payloads before deploying client code that depends on it.

## Backend / Supabase

- **Project**: `wasteland-queen` (ref `ecxuvcuvuawxriucarmh`) in `eu-central-1`.
- **Tables**: `events`, `signups`, `assignments`, `nap_terms`, `event_secrets`,
  `extraction_log`, `audit_log`. See `supabase/migrations/`.

### Auth model (since migration 0019)

Per-event tokens + JWT-claim RLS. Each event row has three uuid tokens
(`signup_token` / `planner_token` / `board_token`). URLs include the token
(`/plan/:eventId/:plannerToken` etc.); `EventAuthGate` exchanges it for a 24h
JWT via the `token-exchange` Edge Function; `supabase.ts` injects the JWT
into REST + Realtime via `accessToken()`. RLS policies key off
`event_id_claim()` and `event_role_claim()` helper functions.

- **anon insert** on `events` is allowed (via `create_event` RPC — see below).
- **planner role**: full CRUD on event + signups + assignments + nap_terms.
- **signup role**: read all signups in the event (for IGN duplicate-check),
  insert new, self-edit own row via `update_signup_self` / `delete_signup_self`
  RPCs (verify edit_token server-side).
- **board role**: read-only on event + signups + assignments + nap_terms.

### Why SECURITY DEFINER RPCs

The supabase-js `.insert(...).select().single()` chain sends
`Prefer: return=representation` which makes PostgREST do an implicit SELECT
after the INSERT. That SELECT goes through RLS — and `event_id_claim()`
returns `''` for anon, so `auth read own event` returns 0 rows. PostgREST
surfaces this as "new row violates row-level security policy" even though
the INSERT actually succeeded.

Workaround: `create_event(jsonb)` RPC for event creation, `update_signup_self`
/ `delete_signup_self` for player self-edit, `set_event_secret` /
`event_has_webhook` for the Discord webhook, `rotate_event_tokens` for token
regeneration. All `SECURITY DEFINER` with role checks via `event_role_claim()`.

### Edge Function secrets

Required function secrets (set in Supabase Dashboard → Functions → Manage secrets):

- `JWT_PRIVATE_KEY` — for `token-exchange`. Either a JWK with private `d`
  parameter, a PKCS#8 PEM, or (for legacy HS256 projects) a plain shared
  secret. The function auto-detects format.
- `ANTHROPIC_API_KEY` — for `extract-profile` Vision-LLM autofill.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-provided by the
runtime.

### Realtime

`signups` + `assignments` + `nap_terms` are in the `supabase_realtime`
publication. Hooks subscribe via `supabase.channel()` so planner reflects
sign-ups / DnD edits / NAP changes across tabs without F5. RLS applies to
realtime delivery just like REST — board-role gets reads, planner gets
everything in their event.

### Migrations + duplicate-signup index

Managed via Supabase MCP `apply_migration`. **Always mirror** the applied
migration into `supabase/migrations/NNNN_name.sql` for the repo record.

Unique index on `(event_id, lower(ign))` enforces one signup per IGN per
event (case-insensitive). The form looks up on IGN-blur and switches to
update-mode if a match is found.

## Auto-sort algorithm

Pure function in `src/features/plan/auto-sort.ts`. Per shift:

1. Pool = signups whose `shift_pref` covers this shift, sorted by `captainScore`
   desc: **`tier × 20 + rally/100k × 4 + lair × 1`**. Tier dominates within a
   ~1-tier gap; rally can overcome a 2-tier gap (whale T11 with 3M rally beats
   T13 with 250k rally).
2. **Hub captain** = strongest willing captain, type-agnostic. Plus N defenders
   of the same type if `event.hub_defender_target > 0`.
3. **Turret layout** per `event.turret_mode`:
   - `duplicate-strongest`: dominant type gets turret-N + turret-S; others get one each.
   - `mixed-4th`: 3 turrets type-pure (N=fighter, E=shooter, S=rider), W = leftovers.
   - `manual`: everyone lands in `unassigned`, planner sorts by hand.
4. Per turret: assign captain (highest-scored willing captain of that type),
   then round-robin fill non-captains by type into their turret(s).
5. Players without a matching turret in their type → `reserve` (or `turret-w`
   in mixed-4th).

`autoSort()` returns a `DraftAssignment[]`. `useAssignments.applyDraft()`
deletes existing rows for the event and bulk-inserts the draft. Manual
drag-and-drop edits use `moveOne` which does the existing-row check +
update-or-insert (no PostgREST upsert because the unique constraint columns
aren't in the conflict-target spec by default).

## WK domain gotchas

- **3 troop types, 4 turrets** — the algorithm respects `turret_mode`; don't hard-code.
- **Hub is the 5th building** and captain'd separately (not part of turret rotation).
- **Hit Squad** (foreign-hub offensive captains) is a manual-only bucket. Auto-sort
  never routes to `hit-squad` — it's always a deliberate R5/whale decision.
- **NAP terms** are planner-write only post-RLS. Players can read them on the
  Board page.
- **"Both"-shift players** show up in both shift pools; auto-sort prefers the
  shift where their type is thinner. Drag-edits are scoped to one shift;
  cross-shift moves are blocked (a player can be assigned in shift 1 AND
  shift 2 via separate auto-sort runs).
- **Type-pure turret** triggers the synergy ring (Super Reinforcement visual).
  If you mix types in a turret, the ConflictBanner calls it out.
- **Rally size dominates the secondary axis** of captain scoring because in
  WK the captain's rally size = the building's capacity. Don't reweight
  without reading the captain duties section of the guide.
- **Personal point tables** (KILL_POINTS / DEATH_POINTS) are in `src/types/wk.ts`
  but the game only surfaces aggregated post-event totals, not per-tier
  breakdowns — so the tables are reference-only, not used for auto-compute.
- **Heroes tracking is opt-in per event** (`event.heroes_enabled`, default
  false). Worth flipping on for Gold+ states coordinating Nataly / Agent X /
  Dr. J frag progress. Toggle is in EventSetupPage at create-time and in
  the planner sidebar (`HeroesSettings` card) post-hoc. When on: SignupPage
  shows three frag inputs, AwardsPage renders alliance-wide totals,
  PlayerChip tooltip appends `📿 Agent X N · Dr. J M · Nataly K`, Roster
  XLSX/CSV export+import include the three columns. Off state hides the
  UI but data persists silently (0 defaults), so flipping on/off mid-event
  is non-destructive.
- **Realtime now covers `events` too** (migration 0028). Planner toggles like
  heroes_enabled / coffer state / governor changes propagate to other open
  planner tabs and the Board page without F5. `use-event` subscribes; RLS
  still gates delivery by `event_id_claim()`.
- **Per-state Hit-Squad buckets** (migration 0029). When `event.foreign_targets`
  has 2+ entries, Plaza renders one Hit-Squad bucket per target instead of a
  single generic one. Each drop is tagged with `assignments.foreign_target`
  so the same player can land on "→ S850" vs "→ S612" buckets. Soft contract:
  no FK between `assignments.foreign_target` and `events.foreign_targets`, so
  mid-event target changes don't cascade-invalidate live rows. Untagged-but-
  targeted rows surface as a separate overflow bucket so legacy data stays
  visible. Auto-sort still skips Hit-Squad entirely.
- **Discord pings are now planner-triggerable**, not just signup-event-driven.
  `PreEventStatusPanel` has Copy + Send buttons that POST the formatted
  reminder text to the existing `notify-discord` Edge Function with
  `action: 'reminder'` (Pre-Event readiness) or `'mudsit_reminder'` (Mudsit
  shield-check). Same webhook URL, different embed colour. Client formats
  the text (i18n stays out of Deno); function just forwards.
- **Mudsit-Shield-Check** detects signups assigned to building `mud` who
  haven't ticked the `shield` checklist item. Pure function
  `computeMudsitShieldGaps` in `preevent-status.ts`.
- **PointCalcModal** in AwardsPage: small calculator icon next to kill/death
  columns opens a per-tier breakdown modal using `KILL_POINTS` / `DEATH_POINTS`.
  Niche but handy when a player has the per-tier screenshot (the game usually
  only shows aggregates — see "Personal point tables" comment above). Apply
  writes total to the column; manual edit still works directly.
- **Vision-LLM dispatch via `kind`**: `extract-profile` edge function (v4)
  now accepts `kind: 'profile' | 'heroes'` and swaps the system prompt.
  `HeroesScreenshotUpload` (signup feature) uses `kind: 'heroes'` to detect
  Agent X / Dr. J / Nataly fragment counts. Same 5/h-per-signup_token rate
  limit and Sonnet 4.6 model.

## Internationalization

12 supported locales, browser-detected with English fallback. Adding a new
string ALWAYS means:

1. Add the key + English value to `src/i18n/locales/en.json`.
2. Add the key + native translation to ALL OTHER 11 locale files.
3. Use `useTranslation()` + `t('namespace.key')` in the component.
4. Build with `pnpm build` and verify no `Missing key` warnings in console.

**Game terms are not translated** in any language. "Hub", "Mud", "Captain",
"Tier", "Lair", "Hit Squad", "Whale", "Rally", "Super Reinforcement", "IGN",
"Fast Comeback" — players already know these from their game client and
mixing localized + English terms would be more confusing than helpful.

Pages translated today: Sign-up + Board (Phase 1+2) + Planner + EventSetup
+ Awards + CheatSheet + HeroScene + PlayerChip tooltips (Phase 3+4). All
12 locales (en, de, ru, zh, ko, ja, it, tr, fr, uk, el, es) have the full
376-key schema. CI-style parity check:

```
node -e "const fs=require('fs');const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?flat(v,p+k+'.'):[p+k]);const en=new Set(flat(JSON.parse(fs.readFileSync('src/i18n/locales/en.json','utf8'))));for(const l of ['de','ru','zh','ko','ja','it','tr','fr','uk','el','es']){const k=new Set(flat(JSON.parse(fs.readFileSync('src/i18n/locales/'+l+'.json','utf8'))));const m=[...en].filter(x=>!k.has(x));const e=[...k].filter(x=>!en.has(x));console.log(l,m.length?'MISSING '+m.length:'parity',e.length?'EXTRA '+e.length:'')}"
```

should print "parity" for every locale.

## Deploy

Frontend → Vercel (Vite preset, see `vercel.json`):

1. Connect repo at https://vercel.com/new or run `vercel` CLI in the repo.
2. Set env vars in Vercel project settings:
   - `VITE_SUPABASE_URL` = `https://ecxuvcuvuawxriucarmh.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (the `sb_publishable_...` from `.env.local`)
3. Deploys are static — any push to main rebuilds. No CI/GitHub Actions needed.
4. Edge Functions deploy separately via Supabase MCP `deploy_edge_function`.

## Working agreements with Claude

- **Verify against the production build** before pushing UI changes that
  affect observable behavior. `pnpm build && pnpm preview`, then drive the
  actual flow with mid-edit / cleared-input / oversized / malformed input
  paths. "Does the button render?" is not verification.
- **Watch console.error** during browser preview tests — runtime exceptions
  (Invalid time value, hook order, missing i18n keys) won't show in DOM
  scrapes.
- **Strings → i18n keys** in every locale file when adding to Sign-up /
  Board / Auth screens. Other pages still mix DE/EN; that's fine for now.
- **No authentication beyond per-event tokens** — the design is "no
  registration". URLs with role tokens are the security boundary.
- **No UI library** (shadcn, MUI, Chakra). Extend `components/ui/` instead.
- **Cross-check WK rules** in `docs/wasteland-king-guide.md` — don't invent
  point values, captain duties, NAP semantics.
- **`apply_migration` MCP for schema changes** — never `execute_sql` for DDL.
  Always mirror the applied migration in `supabase/migrations/NNNN_name.sql`.
- **SECURITY DEFINER RPC for inserts/returns** when the row needs to come
  back to anon. PostgREST's implicit SELECT-after-INSERT will fail RLS
  otherwise (see "Why SECURITY DEFINER RPCs" above).
- **localStorage** only for client-side prefs (last visited event, planner
  token cache for redirect, locale, edit_token for signup self-edit). All
  domain data lives in Supabase.
