-- Per-event policy: when true, post-event self-entry REQUIRES the player to
-- upload a Personal-Reward screenshot (OCR) before they can submit their WK
-- results. When false (default) manual entry is allowed. The screenshot is
-- only OCR'd, never stored.
--
-- events is column-grant-locked (migrations 0030/0034): a table-level SELECT
-- was revoked and re-granted per safe column. A NEW events column is therefore
-- invisible to anon/authenticated until explicitly granted, so use-event.ts's
-- allowlist would 'permission denied' without this grant.

alter table public.events
  add column if not exists awards_require_screenshot boolean not null default false;

grant select (awards_require_screenshot)
  on public.events to anon, authenticated, postgres, service_role;

comment on column public.events.awards_require_screenshot is
  'When true, post-event self-entry requires a Personal-Reward screenshot upload (OCR-only, not stored).';

-- Extend create_event so the EventSetup checkbox persists at creation time
-- (otherwise the column would silently default false regardless of the client).
create or replace function public.create_event(p jsonb)
returns events
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  new_row events;
begin
  insert into events (
    id, starts_at_utc, shift_count, hub_defender_target, turret_mode,
    home_server, notes, state_grade, governor_ign, assessor_ign,
    negotiator_ign, foreign_targets, heroes_enabled, auto_fill_to_capacity,
    awards_require_screenshot
  )
  values (
    p->>'id',
    (p->>'starts_at_utc')::timestamptz,
    coalesce((p->>'shift_count')::int, 2),
    coalesce((p->>'hub_defender_target')::int, 4),
    coalesce(p->>'turret_mode', 'duplicate-strongest'),
    coalesce(p->>'home_server', 'S724'),
    nullif(p->>'notes', ''),
    nullif(p->>'state_grade', '')::text,
    nullif(p->>'governor_ign', ''),
    nullif(p->>'assessor_ign', ''),
    nullif(p->>'negotiator_ign', ''),
    case when p ? 'foreign_targets' and jsonb_typeof(p->'foreign_targets') = 'array'
      then array(select jsonb_array_elements_text(p->'foreign_targets'))
      else null
    end,
    coalesce((p->>'heroes_enabled')::boolean, false),
    coalesce((p->>'auto_fill_to_capacity')::boolean, false),
    coalesce((p->>'awards_require_screenshot')::boolean, false)
  )
  returning * into new_row;
  return new_row;
end;
$function$;
