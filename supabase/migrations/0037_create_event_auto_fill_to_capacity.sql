-- Extend create_event RPC to accept the auto_fill_to_capacity flag added in
-- migration 0035. Without this, the EventSetup form's toggle would write
-- through PostgREST's RPC layer but the column would silently default to
-- false on insert regardless of what the client sent.
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
    negotiator_ign, foreign_targets, heroes_enabled, auto_fill_to_capacity
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
    coalesce((p->>'auto_fill_to_capacity')::boolean, false)
  )
  returning * into new_row;
  return new_row;
end;
$function$;
