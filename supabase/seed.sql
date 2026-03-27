insert into public.branches (id, name, code, city, region, phone)
values
  ('11111111-1111-1111-1111-111111111111', 'Bamenda Central', 'BAM', 'Bamenda', 'Northwest', '+237670000001'),
  ('22222222-2222-2222-2222-222222222222', 'Douala North', 'DOU', 'Douala', 'Littoral', '+237670000002'),
  ('33333333-3333-3333-3333-333333333333', 'Buea Main', 'BUE', 'Buea', 'Southwest', '+237670000003')
on conflict do nothing;

-- Apply real auth-backed profile inserts after auth users are provisioned.
