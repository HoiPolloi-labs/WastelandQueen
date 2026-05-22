-- Widen the event-insert policy to authenticated too.
-- Scenario: planner navigates from /plan/:id/:token to /plan/new (via "Klonen"
-- or the nav link). The EventAuthGate cleanup nulls our in-memory JWT, but
-- the supabase JS client may still flag the request as authenticated role
-- (stale Authorization header in a queued request, or expired-JWT timing).
-- Since anyone can create an event in our trust model anyway, broaden the
-- policy to cover both roles.

drop policy if exists "anon create event" on events;
create policy "create event" on events for insert to anon, authenticated
  with check (true);
