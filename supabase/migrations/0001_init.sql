-- Wasteland King event coordination schema.
-- Pragmatic RLS: anon read+write everywhere (security-by-URL-obscurity).
-- Hardening TODO: per-event tokens for planner/board access.

create table events (
  id text primary key,
  starts_at_utc timestamptz not null,
  shift_count int not null default 2 check (shift_count between 1 and 4),
  turret_mode text not null default 'duplicate-strongest'
    check (turret_mode in ('duplicate-strongest', 'mixed-4th', 'manual')),
  home_server text not null default 'S724',
  notes text,
  created_at timestamptz not null default now()
);

create table signups (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references events(id) on delete cascade,
  ign text not null check (char_length(ign) between 1 and 32),
  alliance_tag text not null check (char_length(alliance_tag) between 1 and 4),
  server text not null check (server ~ '^S[0-9]+$'),
  tier int not null check (tier between 1 and 12),
  troop_type text not null check (troop_type in ('fighter','shooter','rider')),
  max_solo_lair int not null check (max_solo_lair between 1 and 10),
  rally_size int check (rally_size >= 0),
  willing_captain boolean not null default false,
  shift_pref text not null check (shift_pref in ('first','second','both')),
  submitted_at timestamptz not null default now()
);
create index signups_event_idx on signups (event_id);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references events(id) on delete cascade,
  signup_id uuid not null references signups(id) on delete cascade,
  building text not null check (building in
    ('hub','turret-n','turret-s','turret-e','turret-w','mud','reserve','unassigned')),
  shift int not null check (shift between 1 and 4),
  is_captain boolean not null default false,
  position int not null default 0,
  updated_at timestamptz not null default now(),
  unique (event_id, signup_id, shift)
);
create index assignments_event_shift_building_idx
  on assignments (event_id, shift, building);

-- RLS: open for anon (URL-obscurity model)
alter table events enable row level security;
alter table signups enable row level security;
alter table assignments enable row level security;

create policy "anon read events" on events for select to anon using (true);
create policy "anon write events" on events for all to anon
  using (true) with check (true);

create policy "anon read signups" on signups for select to anon using (true);
create policy "anon insert signups" on signups for insert to anon
  with check (true);
create policy "anon delete signups" on signups for delete to anon using (true);

create policy "anon read assignments" on assignments for select to anon using (true);
create policy "anon write assignments" on assignments for all to anon
  using (true) with check (true);
