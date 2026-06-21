-- GAP E: per-alliance participation dashboard. alliance_sizes maps an alliance
-- tag to its planner-entered total member count; min_participation_pct is the
-- "minimum line" threshold (their sheet uses 15%). Sign-up counts + % + #-in-
-- towers are derived at render — only these planner-entered values persist.
alter table events
  add column alliance_sizes jsonb not null default '{}'::jsonb,
  add column min_participation_pct int not null default 15
    check (min_participation_pct between 0 and 100);

-- events column-grant gotcha (migrations 0030 + 0034): the table-level SELECT
-- was revoked and re-granted as an explicit per-column allowlist, so NEW
-- columns must be granted explicitly or clients hit "permission denied for
-- column". These two are safe to read by any event role (no token material).
grant select (alliance_sizes, min_participation_pct)
  on events to anon, authenticated, postgres, service_role;
