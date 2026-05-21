-- T13 is now the top tier per Marcel's state — extend cap from 12 to 13.
alter table signups drop constraint signups_tier_check;
alter table signups add constraint signups_tier_check check (tier between 1 and 13);
