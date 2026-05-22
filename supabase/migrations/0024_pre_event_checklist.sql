-- Pre-event checklist per signup. JSONB instead of fixed columns so we can
-- add/remove items per event without a schema migration (e.g. "heroes" only
-- matters for captains, "shield" only for mud-sitters). Keys are booleans;
-- absence is equivalent to false.
--
-- Standard items today: taxis (T1 taxis filling infirmary for Deep Healing),
-- speedups (training speedups + resources for Fast Comeback), heroes
-- (relevant heroes equipped + leveled), shield (3-day shield active for
-- mud-sitters). Planner reads "missing" items per player to ping pre-event.
alter table signups add column checklist jsonb not null default '{}'::jsonb;

-- Extend update_signup_self to accept checklist updates from signup-role
-- callers (still verified via edit_token).
create or replace function public.update_signup_self(
  p_signup_id uuid,
  p_edit_token uuid,
  p_patch jsonb
) returns signups
  language plpgsql security definer
  set search_path = public
  as $$
declare
  row signups;
begin
  if public.event_role_claim() not in ('signup','planner') then
    raise exception 'forbidden';
  end if;

  update signups set
    ign = coalesce(p_patch->>'ign', ign),
    alliance_tag = coalesce(p_patch->>'alliance_tag', alliance_tag),
    server = coalesce(p_patch->>'server', server),
    tier = coalesce((p_patch->>'tier')::int, tier),
    troop_type = coalesce(p_patch->>'troop_type', troop_type),
    max_solo_lair = coalesce((p_patch->>'max_solo_lair')::int, max_solo_lair),
    rally_size = case when p_patch ? 'rally_size'
      then nullif(p_patch->>'rally_size','')::bigint else rally_size end,
    true_might = case when p_patch ? 'true_might'
      then nullif(p_patch->>'true_might','')::bigint else true_might end,
    willing_captain = coalesce((p_patch->>'willing_captain')::boolean, willing_captain),
    shift_pref = coalesce(p_patch->>'shift_pref', shift_pref),
    state_alliance_joined = coalesce((p_patch->>'state_alliance_joined')::boolean, state_alliance_joined),
    planner_notes = case when p_patch ? 'planner_notes'
      then nullif(p_patch->>'planner_notes','') else planner_notes end,
    checklist = case when p_patch ? 'checklist'
      then p_patch->'checklist' else checklist end
  where id = p_signup_id
    and edit_token = p_edit_token
    and event_id = public.event_id_claim()
  returning * into row;

  if row.id is null then
    raise exception 'no matching signup or edit_token mismatch';
  end if;
  return row;
end;
$$;
