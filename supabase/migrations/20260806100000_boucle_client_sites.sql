-- ─── Rompre la boucle entre client_sites et client_comptes ───────────
--
-- En ouvrant les comptes clients, j'ai posé deux politiques qui se renvoient
-- l'une à l'autre :
--
--   client_sites   → « visible si j'ai un compte client sur ce site »
--                     …ce qui lit client_comptes
--   client_comptes → « visible si le site m'appartient »
--                     …ce qui lit client_sites
--
-- Postgres évalue les politiques de chaque table consultée : chacune rappelle
-- l'autre indéfiniment. D'où « infinite recursion detected in policy for
-- relation client_sites », qui bloquait le Studio entier — création d'un
-- chantier, lancement de production, tout.
--
-- On casse la boucle d'un côté : le client passe par une fonction SECURITY
-- DEFINER, qui lit client_comptes sans déclencher ses politiques.

create or replace function public.site_de_mon_compte()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select site_id from public.client_comptes
   where user_id = auth.uid() and actif
   limit 1;
$$;

grant execute on function public.site_de_mon_compte() to authenticated;

comment on function public.site_de_mon_compte() is
  'Le site du client connecté, lu hors RLS. Existe pour que la politique de client_sites n''ait pas à interroger client_comptes — ce qui créait une récursion infinie entre les deux tables.';

drop policy if exists "sites_lecture_client" on public.client_sites;
create policy "sites_lecture_client" on public.client_sites
  for select to authenticated
  using (id = public.site_de_mon_compte());

-- Même précaution sur le fil de messages, qui empruntait le même chemin.
drop policy if exists "messages_client" on public.portal_messages;
create policy "messages_client" on public.portal_messages
  for all to authenticated
  using (site_id = public.site_de_mon_compte())
  with check (site_id = public.site_de_mon_compte());

-- Et sur les visites : la politique client lisait client_comptes elle aussi.
drop policy if exists "visites_client" on public.site_visites;
create policy "visites_client" on public.site_visites
  for select to authenticated
  using (site_id = public.site_de_mon_compte());
