-- ============================================================================
-- SCHEMA FIX (review-pass wave 2): three DB hygiene corrections.
--
-- 1. Per-state Hit-Squad unique constraint. The original UNIQUE
--    (event_id, signup_id, shift) from migration 0001 forbade the same
--    captain landing in both "→ S850" and "→ S612" Hit-Squad buckets in
--    the same shift — which directly contradicts the design intent in
--    migration 0029. The bug was masked because seeded data only ever
--    put one captain per target. Replace with two partial unique indexes
--    that split by building:
--      - non-hit-squad: classic one-row-per-(player, shift) (unchanged)
--      - hit-squad: one row per (player, shift, foreign_target) — so a
--        whale can drive marches to multiple foreign hubs simultaneously
--
-- 2. Missing FK indexes flagged by Supabase advisor.
--    - assignments.signup_id had no index, so signup DELETE did a seq scan
--      of the whole assignments table to find children. Painful at scale.
--    - extraction_log.event_id has the same issue.
--
-- 3. audit_trigger had SECURITY DEFINER with a mutable search_path
--    (advisor flag). A search_path shadowing attack could route the
--    trigger's INSERT into a fake audit_log. Lock it down explicitly.
-- ============================================================================

-- Fix #1: per-state Hit-Squad — split the unique constraint by building.
alter table public.assignments
  drop constraint if exists assignments_event_id_signup_id_shift_key;

create unique index assignments_unique_non_hit_squad
  on public.assignments (event_id, signup_id, shift)
  where building <> 'hit-squad';

-- For Hit-Squad rows: one row per (event, signup, shift, foreign_target).
-- NULLS NOT DISTINCT (PG15+) so multiple untagged rows for the same
-- captain+shift still collide — there should only ever be one untagged
-- bucket entry per captain per shift.
create unique index assignments_unique_hit_squad
  on public.assignments (event_id, signup_id, shift, foreign_target)
  nulls not distinct
  where building = 'hit-squad';

-- Fix #2: FK indexes.
create index if not exists assignments_signup_id_idx
  on public.assignments (signup_id);

create index if not exists extraction_log_event_id_idx
  on public.extraction_log (event_id);

-- Fix #3: lock audit_trigger search_path.
alter function public.audit_trigger() set search_path = public, pg_temp;
