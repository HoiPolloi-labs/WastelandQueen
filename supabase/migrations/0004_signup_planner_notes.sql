alter table signups add column planner_notes text;
-- Open RLS for update so the planner can edit notes via anon key
create policy "anon update signups" on signups for update to anon using (true) with check (true);
