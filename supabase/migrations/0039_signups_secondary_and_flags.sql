-- GAP A: secondary troop type (multi, ≤3 of the troop enum) + secondary tier.
-- GAP B/C: two availability booleans the old Google Form captured but the app
-- never did. defend_at_start = "ready at WLK start to defend home hub if hit";
-- willing_foreign_hub = "willing to take a foreign state hub" (hit-squad consent).
alter table signups
  add column secondary_troop_types text[] null,
  add column secondary_tier int null,
  add column defend_at_start boolean not null default false,
  add column willing_foreign_hub boolean not null default false;

alter table signups
  add constraint signups_secondary_types_check
    check (
      secondary_troop_types is null
      or (
        secondary_troop_types <@ array['fighter','shooter','rider']::text[]
        and coalesce(array_length(secondary_troop_types, 1), 0) <= 3
      )
    ),
  add constraint signups_secondary_tier_check
    check (secondary_tier is null or (secondary_tier between 1 and 13));
