-- Event creation via SECURITY DEFINER RPC. Why not direct INSERT?
-- The supabase-js .insert(...).select() chain sends `Prefer:
-- return=representation` which makes PostgREST do an implicit SELECT after
-- the INSERT. That SELECT goes through RLS — anon's `auth read own event`
-- policy requires `id = event_id_claim()` which is empty for anon, so it
-- returns 0 rows and PostgREST surfaces this as "new row violates RLS"
-- even though the row was inserted fine.
--
-- An RPC bypasses RLS for the return path, lets the client read the freshly
-- generated tokens, and keeps the trust model intact (anyone can create an
-- event; no extra power).

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
    negotiator_ign, foreign_targets
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
    end
  )
  returning * into new_row;
  return new_row;
end;
$$;

grant execute on function public.create_event(jsonb) to anon, authenticated;
