-- Optional per-row foreign-state tag for Hit-Squad assignments.
-- When event.foreign_targets has multiple entries, the planner can split the
-- single Hit-Squad bucket into one bucket per target state (e.g. one captain
-- group tasked with S850's hub, another with S612's hub). For all other
-- buildings this stays null.
alter table assignments
  add column if not exists foreign_target text;

-- No constraint binding it to events.foreign_targets — that's a soft contract
-- enforced at the UI layer, and changing foreign_targets shouldn't cascade-
-- invalidate assignments mid-event.
