-- shift_pref geht von ('first','second','both') auf comma-separated shift numbers
-- e.g. '1', '2', '1,2', '1,3,4', '1,2,3,4'. Auto-Sort betrachtet die Schnittmenge.

-- 1. Drop old constraint
alter table signups drop constraint signups_shift_pref_check;

-- 2. Migrate existing data
update signups set shift_pref = case shift_pref
  when 'first' then '1'
  when 'second' then '2'
  when 'both' then '1,2'
  else shift_pref
end;

-- 3. New constraint: comma-separated digits 1-4, no duplicates check at SQL level
--    (frontend enforces uniqueness; SQL just validates the format)
alter table signups add constraint signups_shift_pref_check
  check (shift_pref ~ '^[1-4](,[1-4]){0,3}$');

-- 4. Same for assignments.shift — already (1..4), keep as is
