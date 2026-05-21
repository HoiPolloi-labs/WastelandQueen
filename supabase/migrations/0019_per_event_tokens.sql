-- Per-event role tokens replace URL-obscurity with JWT-claim-based RLS.
-- Three tokens per event (signup/planner/board), each granting a single role.
-- Client exchanges (event_id, token) for a JWT via the token-exchange Edge
-- Function; RLS policies key off auth.jwt() ->> 'event_id'/'event_role'.

-- ---------------------------------------------------------------------------
-- 1. Token columns + secrets sidecar
-- ---------------------------------------------------------------------------

alter table events
  add column signup_token uuid not null default gen_random_uuid(),
  add column planner_token uuid not null default gen_random_uuid(),
  add column board_token uuid not null default gen_random_uuid();

create table event_secrets (
  event_id text primary key references events(id) on delete cascade,
  discord_webhook_url text,
  updated_at timestamptz not null default now()
);

insert into event_secrets (event_id, discord_webhook_url)
select id, discord_webhook_url from events where discord_webhook_url is not null;

alter table events drop column discord_webhook_url;

alter table event_secrets enable row level security;
-- no policies = no anon access. Service-role / RPCs only.

-- ---------------------------------------------------------------------------
-- 2. JWT-claim helpers
-- ---------------------------------------------------------------------------

create or replace function public.event_id_claim() returns text
  language sql stable
  as $$ select coalesce(auth.jwt() ->> 'event_id', '') $$;

create or replace function public.event_role_claim() returns text
  language sql stable
  as $$ select coalesce(auth.jwt() ->> 'event_role', '') $$;

-- ---------------------------------------------------------------------------
-- 3. Wipe old anon-everything policies
-- ---------------------------------------------------------------------------

drop policy if exists "anon read events" on events;
drop policy if exists "anon write events" on events;
drop policy if exists "anon read signups" on signups;
drop policy if exists "anon insert signups" on signups;
drop policy if exists "anon delete signups" on signups;
drop policy if exists "anon write signups" on signups;
drop policy if exists "anon read assignments" on assignments;
drop policy if exists "anon write assignments" on assignments;
drop policy if exists "anon read nap" on nap_terms;
drop policy if exists "anon write nap" on nap_terms;

-- ---------------------------------------------------------------------------
-- 4. New policies — token/role-based
-- ---------------------------------------------------------------------------

-- EVENTS
-- anon insert stays open: anyone can create a new event (it's the bootstrap).
-- The freshly-generated tokens come back via RETURNING and the creator becomes
-- the implicit planner via the planner_token shown on the success screen.
create policy "anon create event" on events for insert to anon
  with check (true);
create policy "auth read own event" on events for select
  using (id = public.event_id_claim());
create policy "planner update own event" on events for update
  using (id = public.event_id_claim() and public.event_role_claim() = 'planner')
  with check (id = public.event_id_claim() and public.event_role_claim() = 'planner');
create policy "planner delete own event" on events for delete
  using (id = public.event_id_claim() and public.event_role_claim() = 'planner');

-- SIGNUPS
-- planner: full CRUD scoped to event
-- signup: read (for duplicate-check) + insert new. Self-edit goes through RPCs
--         (update_signup_self / delete_signup_self) which verify edit_token.
-- board:  read only
create policy "auth read signups" on signups for select
  using (event_id = public.event_id_claim());
create policy "signup or planner insert" on signups for insert
  with check (
    event_id = public.event_id_claim()
    and public.event_role_claim() in ('signup','planner')
  );
create policy "planner update signups" on signups for update
  using (event_id = public.event_id_claim() and public.event_role_claim() = 'planner')
  with check (event_id = public.event_id_claim() and public.event_role_claim() = 'planner');
create policy "planner delete signups" on signups for delete
  using (event_id = public.event_id_claim() and public.event_role_claim() = 'planner');

-- ASSIGNMENTS / NAP_TERMS — planner-write, any-role-read scoped to event
create policy "auth read assignments" on assignments for select
  using (event_id = public.event_id_claim());
create policy "planner write assignments" on assignments for all
  using (event_id = public.event_id_claim() and public.event_role_claim() = 'planner')
  with check (event_id = public.event_id_claim() and public.event_role_claim() = 'planner');

create policy "auth read nap" on nap_terms for select
  using (event_id = public.event_id_claim());
create policy "planner write nap" on nap_terms for all
  using (event_id = public.event_id_claim() and public.event_role_claim() = 'planner')
  with check (event_id = public.event_id_claim() and public.event_role_claim() = 'planner');

-- ---------------------------------------------------------------------------
-- 5. RPCs for signup-role self-edits
--    These bypass RLS via SECURITY DEFINER but enforce edit_token internally.
-- ---------------------------------------------------------------------------

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
      then nullif(p_patch->>'planner_notes','') else planner_notes end
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

create or replace function public.delete_signup_self(
  p_signup_id uuid,
  p_edit_token uuid
) returns void
  language plpgsql security definer
  set search_path = public
  as $$
begin
  if public.event_role_claim() not in ('signup','planner') then
    raise exception 'forbidden';
  end if;
  delete from signups
  where id = p_signup_id
    and edit_token = p_edit_token
    and event_id = public.event_id_claim();
  if not found then
    raise exception 'no matching signup or edit_token mismatch';
  end if;
end;
$$;

-- Planner-only secret writer (Discord webhook URL etc.)
create or replace function public.set_event_secret(
  p_key text,
  p_value text
) returns void
  language plpgsql security definer
  set search_path = public
  as $$
begin
  if public.event_role_claim() <> 'planner' then
    raise exception 'forbidden';
  end if;
  if p_key <> 'discord_webhook_url' then
    raise exception 'unknown secret key';
  end if;
  insert into event_secrets (event_id, discord_webhook_url)
  values (public.event_id_claim(), p_value)
  on conflict (event_id) do update
    set discord_webhook_url = p_value,
        updated_at = now();
end;
$$;

-- Indicator (boolean only — never exposes the URL itself) so the Planner UI
-- can render "Webhook configured ✓" without ever pulling the secret.
create or replace function public.event_has_webhook() returns boolean
  language sql stable security definer
  set search_path = public
  as $$
  select exists(
    select 1 from event_secrets
    where event_id = public.event_id_claim()
      and discord_webhook_url is not null
  );
$$;

grant execute on function public.update_signup_self(uuid, uuid, jsonb) to anon, authenticated;
grant execute on function public.delete_signup_self(uuid, uuid) to anon, authenticated;
grant execute on function public.set_event_secret(text, text) to authenticated;
grant execute on function public.event_has_webhook() to authenticated;
