-- Add events to the supabase_realtime publication so planner toggles
-- (heroes_enabled, coffer state, governor changes, foreign_targets etc.)
-- propagate to other open tabs and the read-only Board page without F5.
--
-- Note: `if not exists` isn't supported for alter publication add table.
-- Wrap in a do-block so re-running is safe.
do $$
begin
  alter publication supabase_realtime add table events;
exception when duplicate_object then
  null;
end $$;
