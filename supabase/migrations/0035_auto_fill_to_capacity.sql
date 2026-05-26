-- Per-event toggle: when true, Auto-Sort fills Hub + each turret with as many
-- same-type defenders as the captain's rally_size can hold (estimated march
-- per defender summed against rally cap) instead of the fixed
-- hub_defender_target count. Default false to preserve existing behavior.
alter table events
  add column auto_fill_to_capacity boolean not null default false;

-- Column-revoke gotcha: events has an explicit per-column SELECT grant
-- (migration 0034) to keep planner_token out of anon/authenticated reach.
-- New columns are NOT auto-granted — they must be added to the allowlist
-- or `use-event.ts` SELECTs will hit "permission denied for column".
grant select (auto_fill_to_capacity) on events to anon, authenticated, postgres, service_role;
