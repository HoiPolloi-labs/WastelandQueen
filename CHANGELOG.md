# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project
uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet._

## [0.1.0] — 2026-05-29

First public open-source release. Everything below already powers the live
state at <https://waqu.app>.

### Added

- **Three tokenized event URLs** — sign-up / planner / board — gated by random
  per-event uuid tokens, no accounts or registration.
- **Mobile-first sign-up form** in 12 locales with Zod validation, IGN
  duplicate detection, per-signup `edit_token` self-edit/withdraw, a
  pre-event readiness checklist, and optional Vision-LLM auto-fill from a
  profile screenshot (Claude vision, rate-limited).
- **Drag-and-drop planner** (`@dnd-kit`, mouse + touch + keyboard sensors)
  with optimistic updates and rollback on persist failure.
- **Auto-sort** — captain scoring, three turret-layout modes
  (duplicate-strongest / mixed-4th / manual), Hub-defender targeting, and a
  rally-**capacity-fill** mode that sizes each building from the captain's
  rally vs joiners' march sizes.
- **Plaza buckets** — Hub, 4 turrets, Mud, Reserve, and per-state Hit-Squad,
  with Super-Reinforcement synergy hints and a conflict banner.
- **Read-only board** with PNG export and a QR code linking back to sign-up.
- **Post-event Awards** page — contribution scoring, box distribution, and a
  governor cockpit (Coffer / King's-Sword).
- **NAP terms**, health-check panel, pre-event reminders with one-click
  Discord pings, roster CSV/XLSX import/export, and token rotation.
- **Live editable demo** sandbox (`/demo/:id/:token`) — full planner driven by
  a read-only board JWT; every interaction is local-only and persists nothing.
- **12-locale i18n** at full key-parity (CI-guarded), browser-detected with
  English fallback and lazy-loaded locale bundles.
- **Supabase backend** — Postgres with row-level security keyed off per-event
  JWT claims, SECURITY DEFINER RPCs, Realtime sync, and four Edge Functions
  (`token-exchange`, `extract-profile`, `notify-discord`, short-URL resolver `r`).
- **WCAG 2.1.1** keyboard support for the planner; dark-scheme native controls.

### Security

- Per-event JWTs auto-refresh 5 min before expiry (and on tab focus), closing
  the "writes 401 after 24h" gap.
- `planner_token` is column-revoked from non-planner roles; clients read an
  explicit column allowlist.
- CSV export guards against formula injection.

[Unreleased]: https://github.com/HoiPolloi-labs/WastelandQueen/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/HoiPolloi-labs/WastelandQueen/releases/tag/v0.1.0
