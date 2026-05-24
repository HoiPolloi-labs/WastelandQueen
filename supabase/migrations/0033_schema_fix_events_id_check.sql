-- DoS hardening: events.id is the PK that cascades to every child table.
-- Without a length cap, a malicious create_event RPC could stash a 1MB
-- string and bloat every join. Constrain to the format the app actually
-- produces: wk-YYYY-MM-DD or wk-YYYY-MM-DD-xxxx (4-char base32 salt).
alter table public.events
  add constraint events_id_format_check
  check (
    char_length(id) <= 32
    and id ~ '^wk-[0-9]{4}-[0-9]{2}-[0-9]{2}(-[a-z2-9]{3,8})?$'
  );
