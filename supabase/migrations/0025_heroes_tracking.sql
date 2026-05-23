-- Optional per-event heroes tracking. Disabled by default; planner toggles
-- it on when the state hits Gold+ and wants to coordinate Nataly / Agent X /
-- Dr. J fragment progress alliance-wide. When disabled the columns sit at 0
-- and the UI hides the inputs/columns entirely.

alter table events
  add column if not exists heroes_enabled boolean not null default false;

alter table signups
  add column if not exists agent_x_frags integer not null default 0,
  add column if not exists dr_j_frags   integer not null default 0,
  add column if not exists nataly_frags integer not null default 0;

alter table signups
  add constraint signups_agent_x_frags_nonneg check (agent_x_frags >= 0),
  add constraint signups_dr_j_frags_nonneg   check (dr_j_frags   >= 0),
  add constraint signups_nataly_frags_nonneg check (nataly_frags >= 0);
