-- Live event tracking: governor/R5 can mark a captain as present/absent during
-- the event window. null = unknown (default), true = at post, false = no-show.
-- A "false" surfaces "Super Reinforcement broken" so reinforcers retarget.
alter table assignments add column captain_present boolean;
