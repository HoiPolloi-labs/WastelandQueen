alter table signups add column attended boolean;
alter table signups add column kill_points int not null default 0 check (kill_points >= 0);
alter table signups add column death_points int not null default 0 check (death_points >= 0);
alter table signups add column occupation_points int not null default 0 check (occupation_points >= 0);
alter table signups add column might_lost bigint not null default 0 check (might_lost >= 0);
alter table signups add column box_tier text check (box_tier in ('king','rulers','loyalty','contribution'));
