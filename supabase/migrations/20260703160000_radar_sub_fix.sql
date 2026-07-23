-- Recrée proprement la policy d'inscription publique + recharge le cache PostgREST
alter table public.radar_subscribers enable row level security;
drop policy if exists "radar_sub_public_insert" on public.radar_subscribers;
create policy "radar_sub_public_insert" on public.radar_subscribers
  for insert to anon, authenticated with check (true);
grant insert on public.radar_subscribers to anon, authenticated;
notify pgrst, 'reload schema';
