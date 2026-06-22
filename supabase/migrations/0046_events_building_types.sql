-- Optional per-building troop-type pins for Auto-Sort. JSONB map of
-- building key → troop type, e.g. {"hub":"rider","turret-n":"shooter",
-- "turret-e":"fighter","turret-s":"rider","turret-w":"shooter"}. An absent key
-- means "auto" (Hub = strongest captain any type; turrets via the turret_mode
-- layout). Matches how states actually run a FIXED defensive layout where each
-- tower always defends with the same troop type across all shifts (confirmed
-- against a real event roster). Default {} = fully automatic (unchanged
-- behaviour for existing events).
--
-- events is column-grant-locked (0030/0034): a new column is invisible to
-- anon/authenticated until explicitly granted, so use-event.ts's allowlist
-- would 'permission denied' without this grant.

alter table public.events
  add column if not exists building_types jsonb not null default '{}'::jsonb;

grant select (building_types)
  on public.events to anon, authenticated, postgres, service_role;

comment on column public.events.building_types is
  'Optional per-building troop-type pins for Auto-Sort: {"hub"|"turret-n"|... : "fighter"|"shooter"|"rider"}. Absent key = auto.';
