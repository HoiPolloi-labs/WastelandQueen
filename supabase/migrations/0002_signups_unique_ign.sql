-- One signup per (event, IGN). Re-submits update the existing row.
-- Case-insensitive so 'WhalerKing' and 'whalerking' collide.
create unique index signups_event_ign_unique
  on signups (event_id, lower(ign));
