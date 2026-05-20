-- A. Hit-Squad als gültiger building-Wert
alter table assignments drop constraint assignments_building_check;
alter table assignments add constraint assignments_building_check
  check (building in
    ('hub','turret-n','turret-s','turret-e','turret-w',
     'mud','reserve','hit-squad','unassigned'));

-- B. NAP-Terms
create table nap_terms (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references events(id) on delete cascade,
  with_state text not null,
  terms text not null,
  status text not null default 'proposed'
    check (status in ('proposed','agreed','broken','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index nap_terms_event_idx on nap_terms (event_id);

alter table nap_terms enable row level security;
create policy "anon read nap" on nap_terms for select to anon using (true);
create policy "anon write nap" on nap_terms for all to anon
  using (true) with check (true);

alter publication supabase_realtime add table nap_terms;
