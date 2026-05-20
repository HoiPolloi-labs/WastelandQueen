-- Per-signup edit-token. Client stores per (event_id, ign) in localStorage.
-- Currently used only to gate the Withdraw button UI — full server-side enforcement
-- would need custom RLS policies referencing request headers; URL-obscurity remains
-- the documented trust model.
alter table signups add column edit_token uuid not null default gen_random_uuid();

-- Audit-log for post-mortem debugging. Append-only, anon SELECT off
-- (keep the audit trail off the wire — it can still be inspected via Supabase
-- dashboard if needed).
create table audit_log (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  table_name text not null,
  row_id text not null,
  op text not null check (op in ('INSERT','UPDATE','DELETE')),
  before jsonb,
  after jsonb
);
create index audit_log_table_row_idx on audit_log (table_name, row_id);
create index audit_log_occurred_at_idx on audit_log (occurred_at desc);

alter table audit_log enable row level security;
-- no policies → no anon access. Service-role / dashboard only.

create or replace function audit_trigger() returns trigger as $$
declare
  rid text;
begin
  if (tg_op = 'DELETE') then
    rid := coalesce(old.id::text, '');
    insert into audit_log (table_name, row_id, op, before)
      values (tg_table_name, rid, tg_op, to_jsonb(old));
    return old;
  end if;
  rid := coalesce(new.id::text, '');
  if (tg_op = 'UPDATE') then
    insert into audit_log (table_name, row_id, op, before, after)
      values (tg_table_name, rid, tg_op, to_jsonb(old), to_jsonb(new));
  else
    insert into audit_log (table_name, row_id, op, after)
      values (tg_table_name, rid, tg_op, to_jsonb(new));
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger signups_audit
  after insert or update or delete on signups
  for each row execute function audit_trigger();

create trigger assignments_audit
  after insert or update or delete on assignments
  for each row execute function audit_trigger();

create trigger nap_terms_audit
  after insert or update or delete on nap_terms
  for each row execute function audit_trigger();

create trigger events_audit
  after insert or update or delete on events
  for each row execute function audit_trigger();
