-- TEMP : prospect de test pour reproduire le diagnostic (sera supprimé juste après).
insert into public.prospects (id, owner_id, first_name, last_name, company, location, website, phone, status, source)
values (
  '11111111-1111-1111-1111-111111111111',
  (select id from auth.users order by created_at limit 1),
  'Test', 'Diagnostic', 'Boulangerie Test', 'Toulouse', 'https://www.google.com', '0561000000', 'nouveau', 'demo'
)
on conflict (id) do nothing;
