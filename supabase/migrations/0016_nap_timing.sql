-- NAP-Terms get optional start/end window so the planner and board can show
-- "vs S850 · agreed · 2026-06-06 18:00 → 2026-06-08 18:00 UTC". Both nullable —
-- some NAPs are open-ended ("until further notice"), some have hard expiry.
alter table nap_terms add column starts_at_utc timestamptz;
alter table nap_terms add column ends_at_utc timestamptz;
