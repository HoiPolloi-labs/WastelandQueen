-- Planner-callable RPC to rotate one or more of the event's role tokens.
-- Use case: planner accidentally shared a URL with the wrong audience and
-- needs to invalidate it. After rotation, the old URL stops minting JWTs
-- (token-exchange returns invalid_token); existing JWTs remain valid until
-- their 24h expiry. The planner gets the new URLs from the RETURNING row.
create or replace function public.rotate_event_tokens(
  rotate_signup boolean default false,
  rotate_planner boolean default false,
  rotate_board boolean default false
) returns table(signup_token uuid, planner_token uuid, board_token uuid)
  language plpgsql security definer
  set search_path = public
  as $$
begin
  if public.event_role_claim() <> 'planner' then
    raise exception 'forbidden';
  end if;
  if not (rotate_signup or rotate_planner or rotate_board) then
    raise exception 'at least one of rotate_signup/rotate_planner/rotate_board must be true';
  end if;

  return query
  update events set
    signup_token  = case when rotate_signup  then gen_random_uuid() else signup_token  end,
    planner_token = case when rotate_planner then gen_random_uuid() else planner_token end,
    board_token   = case when rotate_board   then gen_random_uuid() else board_token   end
  where id = public.event_id_claim()
  returning events.signup_token, events.planner_token, events.board_token;
end;
$$;

grant execute on function public.rotate_event_tokens(boolean, boolean, boolean) to authenticated;
