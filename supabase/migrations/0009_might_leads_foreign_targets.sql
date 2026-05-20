alter table signups add column true_might bigint check (true_might >= 0);

alter table events add column governor_ign text;
alter table events add column assessor_ign text;
alter table events add column negotiator_ign text;
alter table events add column foreign_targets text[];
