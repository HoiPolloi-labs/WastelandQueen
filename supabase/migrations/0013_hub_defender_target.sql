alter table events add column hub_defender_target int not null default 4
  check (hub_defender_target between 0 and 20);
