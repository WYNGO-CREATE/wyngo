-- TEMP : prospect de test (vrai site) pour vérifier les nouveaux critères. Supprimé juste après.
insert into public.prospects (id, owner_id, first_name, last_name, company, location, website, phone, status, source)
values (
  '22222222-2222-2222-2222-222222222222',
  (select id from auth.users order by created_at limit 1),
  'Test', 'Audit2', 'Poilâne', 'Paris', 'https://www.poilane.com', '0145480759', 'nouveau', 'demo'
)
on conflict (id) do nothing;
