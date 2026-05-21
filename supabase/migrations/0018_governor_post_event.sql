-- Governor's post-event chest tracking.
--   - king_sword_recipient_ign: the single high-rarity King's-Sword Box per
--     event goes to one player (typically the Hit-Squad captain or top scorer);
--     governor decides.
--   - king_sword_grade: state grade at event-time gates the box value
--     (Gold=10, Platinum=16, Diamond=20 Nataly frags). Frozen here so
--     re-grading the state later doesn't rewrite history.
--   - coffer_collected_at: when the governor drained the Coffer tax-stream
--     into state-wide retraining funds. null = not yet drained.
--   - coffer_notes: governor's free-text log of who got Coffer-funded retraining.
alter table events
  add column king_sword_recipient_ign text,
  add column king_sword_grade text check (king_sword_grade in ('gold','platinum','diamond')),
  add column coffer_collected_at timestamptz,
  add column coffer_notes text;
