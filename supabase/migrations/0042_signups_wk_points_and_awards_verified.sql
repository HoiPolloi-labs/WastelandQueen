-- Awards workstream: in-game personal-reward total + planner verification flag.
--
-- wk_points = the single "Aktuelle Pkte" total from the WK "Persönliche
-- Belohnung" screen. Nullable: NULL means "not entered yet" (distinct from a
-- real 0), so contribution.ts can rank by it only when present and fall back
-- to the composite score otherwise.
--
-- awards_verified = planner has confirmed this row's post-event numbers. Any
-- player self-write (via update_signup_self) force-resets this to false, so a
-- player can never self-verify and any later self-edit drops the row back to
-- unverified for the planner to re-check.
--
-- These are signups columns, so they do NOT need the events column-grant
-- allowlist dance (that trap is events-only, migrations 0030/0034).

alter table public.signups
  add column if not exists wk_points bigint,
  add column if not exists awards_verified boolean not null default false;

comment on column public.signups.wk_points is
  'In-game WK personal-reward total ("Aktuelle Pkte"). NULL = not entered.';
comment on column public.signups.awards_verified is
  'Planner-confirmed post-event numbers. Self-writes always force this false.';
