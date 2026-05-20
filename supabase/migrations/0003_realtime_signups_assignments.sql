-- Enable Postgres-Changes broadcast on the two tables the planner watches.
alter publication supabase_realtime add table signups;
alter publication supabase_realtime add table assignments;
