-- ============================================================================
-- SECURITY FIX (review-pass): close two critical findings.
--
-- 1. Orphan policy "anon update signups" (from migration 0004) was missed
--    during the per-event-token RLS rewrite in 0019. Anyone with the public
--    anon publishable key could UPDATE any signups row across any event.
--
-- 2. The "auth read own event" SELECT policy + `useEvent`'s `select('*')`
--    leaked `events.planner_token` to anyone holding a signup or board JWT.
--    Since signup/board URLs are widely shared, this was a path from
--    "viewer" to "full admin". Fix is column-level: revoke SELECT on the
--    three token columns from anon + authenticated. Token columns are now
--    only readable via SECURITY DEFINER RPCs that role-check before
--    returning. signup/board tokens are returned by `create_event` and
--    `rotate_event_tokens` already (those are the public-shareable ones);
--    planner_token is the admin secret, never exposed to non-planner.
-- ============================================================================

-- Fix #1: drop the orphan anon-update policy.
drop policy if exists "anon update signups" on public.signups;

-- Fix #2: column-level access control on events tokens.
--
-- `anon` is the role for unauthenticated callers using the publishable key
-- (e.g. EventSetupPage before token-exchange runs).
-- `authenticated` is the role for any per-event-JWT (signup, board, planner).
-- All three token columns are revoked from BOTH roles, because:
--   - Even anon shouldn't see existing event tokens (create_event RPC
--     returns them in its response, which is the only legitimate path).
--   - planner JWTs shouldn't depend on reading their own planner_token back —
--     they already have it (it was the URL they came in on); reading it from
--     a row open to row-level RLS just widens the blast radius if the
--     `event_id_claim()` ever has a bug.
--
-- SECURITY DEFINER functions (create_event, rotate_event_tokens) bypass
-- column grants because they run as the function owner (postgres), so the
-- intentional surfacing of tokens via those entry points keeps working.
--
-- Scope: only `planner_token` is the admin secret. signup_token + board_token
-- are broadcast-shareable by design (QR codes, /s/ + /b/ short URLs, Discord
-- embeds) so they stay readable; leaking them between roles is privacy not
-- escalation. planner_token is the one that flips a viewer into an admin.
revoke select (planner_token) on public.events from anon, authenticated;
revoke select (planner_token) on public.events from public;

-- The `auth read own event` policy stays in place — non-token columns are
-- still readable for any role with a valid JWT matching the event_id_claim().
-- This is needed for Realtime delivery + the SignupPage/BoardPage config
-- fields (turret_mode, foreign_targets, heroes_enabled, etc).
