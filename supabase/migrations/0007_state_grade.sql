alter table events add column state_grade text check (state_grade in
  ('starter','bronze','silver','gold','platinum','diamond','legend'));
