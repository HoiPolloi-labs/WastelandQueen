-- Rate-limit log for profile-screenshot extraction calls. One row per call.
-- Used by the extract-profile Edge Function via check_and_log_extraction RPC.
-- Periodically prune (cron) — but for our volume (50-200 signups/event, 5/hr
-- cap each) it's not urgent.
create table extraction_log (
  id bigserial primary key,
  event_id text not null references events(id) on delete cascade,
  -- the signup_token that gated the call (so a leaked event_id alone can't be
  -- used to spam). Plain rather than hashed — same anti-spam model as audit_log.
  signup_token uuid not null,
  called_at timestamptz not null default now(),
  success boolean not null,
  model text
);
create index extraction_log_rate_idx on extraction_log (signup_token, called_at desc);

alter table extraction_log enable row level security;
-- No anon policies; writes happen via service-role in the Edge Function.

-- RPC that the Edge Function calls before hitting Anthropic. Returns:
--   ok=true  → call is allowed; row already logged.
--   ok=false → over the rate limit; reason explains.
-- Bundling the check + log into one transaction prevents the race where two
-- concurrent calls both see "4 in window" and both decide they're allowed.
create or replace function public.check_and_log_extraction(
  p_event_id text,
  p_signup_token uuid,
  p_max_per_hour int default 5
) returns table(ok boolean, reason text, remaining int)
  language plpgsql security definer
  set search_path = public
  as $$
declare
  used int;
begin
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
$$;

grant execute on function public.check_and_log_extraction(text, uuid, int) to authenticated, anon, service_role;
