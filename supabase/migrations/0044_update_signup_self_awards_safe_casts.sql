-- Harden the post-event award casts in update_signup_self. The RPC is directly
-- callable by any signup-token holder, so a malformed patch ({"kill_points":"abc"})
-- or an oversized integer (>18 digits) would otherwise abort the whole UPDATE on
-- a failed ::bigint cast. Guard each award field with a digit-pattern check
-- (1–18 digits, safely within bigint range); non-matching input keeps the old
-- value (numeric fields) or nulls (the nullable wk_points). attended is parsed
-- via an explicit truthy/falsy match instead of a raw ::boolean cast. Everything
-- else is identical to 0043, including the awards_verified = false force.

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
    secondary_troop_types = case when p_patch ? 'secondary_troop_types'
      then case when jsonb_typeof(p_patch->'secondary_troop_types') = 'array'
        then array(select jsonb_array_elements_text(p_patch->'secondary_troop_types'))
        else null end
      else secondary_troop_types end,
    secondary_tier = case when p_patch ? 'secondary_tier'
      then nullif(p_patch->>'secondary_tier','')::int else secondary_tier end,
    defend_at_start = coalesce((p_patch->>'defend_at_start')::boolean, defend_at_start),
    willing_foreign_hub = coalesce((p_patch->>'willing_foreign_hub')::boolean, willing_foreign_hub),
    planner_notes = case when p_patch ? 'planner_notes'
      then nullif(p_patch->>'planner_notes','') else planner_notes end,
    checklist = case when p_patch ? 'checklist'
      then p_patch->'checklist' else checklist end,
    agent_x_frags = coalesce((p_patch->>'agent_x_frags')::int, agent_x_frags),
    dr_j_frags    = coalesce((p_patch->>'dr_j_frags')::int,    dr_j_frags),
    nataly_frags  = coalesce((p_patch->>'nataly_frags')::int,  nataly_frags),
    -- post-event self-entry (always unverified), digit-guarded against crashes
    attended = case when p_patch ? 'attended' then
      case
        when lower(coalesce(p_patch->>'attended','')) in ('true','t','1')  then true
        when lower(coalesce(p_patch->>'attended','')) in ('false','f','0') then false
        else null
      end
      else attended end,
    kill_points = case when p_patch ? 'kill_points' and (p_patch->>'kill_points') ~ '^[0-9]{1,18}$'
      then (p_patch->>'kill_points')::bigint else kill_points end,
    death_points = case when p_patch ? 'death_points' and (p_patch->>'death_points') ~ '^[0-9]{1,18}$'
      then (p_patch->>'death_points')::bigint else death_points end,
    occupation_points = case when p_patch ? 'occupation_points' and (p_patch->>'occupation_points') ~ '^[0-9]{1,18}$'
      then (p_patch->>'occupation_points')::bigint else occupation_points end,
    wk_points = case when p_patch ? 'wk_points'
      then case when (p_patch->>'wk_points') ~ '^[0-9]{1,18}$' then (p_patch->>'wk_points')::bigint else null end
      else wk_points end,
    -- a player can NEVER self-verify; any self-write resets to unverified
    awards_verified = false
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
