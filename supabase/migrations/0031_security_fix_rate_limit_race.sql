-- ============================================================================
-- SECURITY FIX (review-pass): close the rate-limit TOCTOU race in
-- check_and_log_extraction. Old logic SELECT-counted then INSERTed in
-- separate statements at READ COMMITTED isolation, so N concurrent calls
-- could all see `used < cap` and all insert, bursting past the 5/h limit.
--
-- Fix: take a per-signup-token advisory lock for the duration of the
-- transaction. Concurrent calls for the same token serialise; different
-- tokens are unaffected. The lock auto-releases at txn end.
-- ============================================================================

create or replace function public.check_and_log_extraction(
  p_event_id text,
  p_signup_token uuid,
  p_max_per_hour integer default 5
)
returns table(ok boolean, reason text, remaining integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  used int;
begin
  -- Serialise concurrent rate-limit checks for the same signup_token.
  -- hashtextextended produces a stable int8 from the uuid string; advisory
  -- locks key on that.
  perform pg_advisory_xact_lock(hashtextextended(p_signup_token::text, 0));

  -- Verify the signup_token belongs to this event before logging anything.
  if not exists (
    select 1 from events
    where id = p_event_id
      and signup_token = p_signup_token
  ) then
    return query select false, 'invalid_signup_token', 0;
    return;
  end if;

  select count(*) into used
  from extraction_log
  where signup_token = p_signup_token
    and called_at > now() - interval '1 hour';

  if used >= p_max_per_hour then
    return query select false, 'rate_limited', 0;
    return;
  end if;

  insert into extraction_log (event_id, signup_token, success, model)
  values (p_event_id, p_signup_token, false, null);

  return query select true, null::text, p_max_per_hour - used - 1;
end;
$function$;
