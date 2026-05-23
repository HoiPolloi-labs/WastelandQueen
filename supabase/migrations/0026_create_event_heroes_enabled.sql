-- Extend create_event RPC to accept heroes_enabled. The column was added
-- in 0025 with a default of false; this update lets the EventSetupPage
-- pass an explicit value (planner toggles it during creation for Gold+ states).

create or replace function public.create_event(p jsonb) returns events
  language plpgsql security definer
  set search_path = public
  as $$
declare
  new_row events;
begin
  insert into events (
    id, starts_at_utc, shift_count, hub_defender_target, turret_mode,
    home_server, notes, state_grade, governor_ign, assessor_ign,
    negotiator_ign, foreign_targets, heroes_enabled
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
    coalesce((p->>'heroes_enabled')::boolean, false)
  )
  returning * into new_row;
  return new_row;
end;
$$;
