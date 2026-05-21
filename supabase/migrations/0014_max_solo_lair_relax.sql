-- Lair levels in Puzzles & Survival go well past 10 (players regularly solo
-- level 30-60+). Original 1-10 constraint was an incorrect assumption.
alter table signups drop constraint signups_max_solo_lair_check;
alter table signups add constraint signups_max_solo_lair_check
  check (max_solo_lair between 1 and 200);
