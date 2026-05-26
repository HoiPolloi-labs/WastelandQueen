-- The self-edit RPC's whitelist of `set ... =` clauses doesn't include
-- march_size (added in migration 0036). Net effect: SignupPage.tsx sends
-- march_size in the patch payload but the RPC silently drops it. Initial
-- INSERTs still persist march_size (they go through table-level grants,
-- not this RPC). This migration extends the function to mirror the
-- rally_size pattern: `case when ? 'march_size' then nullif(...)::int
-- else march_size end` — so explicit null clears the field, omission
-- keeps it, and a value sets it.
create or replace function public.update_signup_self(
  p_signup_id uuid,
  p_edit_token uuid,
  p_patch jsonb
)
returns signups
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    march_size = case when p_patch ? 'march_size'
      then nullif(p_patch->>'march_size','')::int else march_size end,
    true_might = case when p_patch ? 'true_might'
      then nullif(p_patch->>'true_might','')::bigint else true_might end,
    willing_captain = coalesce((p_patch->>'willing_captain')::boolean, willing_captain),
    shift_pref = coalesce(p_patch->>'shift_pref', shift_pref),
    state_alliance_joined = coalesce((p_patch->>'state_alliance_joined')::boolean, state_alliance_joined),
    planner_notes = case when p_patch ? 'planner_notes'
      then nullif(p_patch->>'planner_notes','') else planner_notes end,
    checklist = case when p_patch ? 'checklist'
      then p_patch->'checklist' else checklist end,
    agent_x_frags = coalesce((p_patch->>'agent_x_frags')::int, agent_x_frags),
    dr_j_frags    = coalesce((p_patch->>'dr_j_frags')::int,    dr_j_frags),
    nataly_frags  = coalesce((p_patch->>'nataly_frags')::int,  nataly_frags)
  where id = p_signup_id
    and edit_token = p_edit_token
    and event_id = public.event_id_claim()
  returning * into row;

  if row.id is null then
    raise exception 'no matching signup or edit_token mismatch';
  end if;
  return row;
end;
$function$;
