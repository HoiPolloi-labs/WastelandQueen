-- ============================================================================
-- SECURITY FIX (review-pass wave 2 — REGRESSION on 0030):
-- The column-level `REVOKE SELECT (planner_token) ON events FROM anon,
-- authenticated` in migration 0030 was a no-op because the table-level
-- `GRANT SELECT ON events` to anon + authenticated covers ALL columns,
-- and column-level revokes only remove explicit column-grants. A signup
-- or board JWT could still call `select('planner_token')` and escalate.
--
-- The correct pattern: revoke the table-level SELECT, then re-grant
-- explicit per-column SELECT on every safe column. New columns added to
-- events in the future must be added to this list — or they'll be
-- unreadable by clients (which is the safer failure mode).
-- ============================================================================

revoke select on public.events from anon, authenticated, public;

-- Re-grant SELECT on every column EXCEPT planner_token.
-- signup_token + board_token stay readable (broadcast-shareable by design;
-- create_event RPC + rotate_event_tokens RPC also return them).
grant select (
  id,
  starts_at_utc,
  shift_count,
  turret_mode,
  home_server,
  notes,
  created_at,
  state_grade,
  governor_ign,
  assessor_ign,
  negotiator_ign,
  foreign_targets,
  hub_defender_target,
  king_sword_recipient_ign,
  king_sword_grade,
  coffer_collected_at,
  coffer_notes,
  signup_token,
  board_token,
  heroes_enabled
) on public.events to anon, authenticated;

-- Verify: a select('*') from anon should now fail because '*' expands
-- to include planner_token which is not granted. Clients are expected
-- to use explicit column lists (see use-event.ts).
