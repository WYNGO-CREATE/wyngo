-- ─── Un client n'est pas un collaborateur ────────────────────────────
--
-- Défaut introduit en ouvrant les comptes clients : ils vivent dans le même
-- annuaire d'authentification que l'équipe. Or plusieurs tables portaient une
-- politique « visible par tout utilisateur authentifié » — pensée pour une
-- équipe de cinq, elle s'est ouverte aux clients du jour au lendemain.
--
-- Constaté en test : un compte client lisait `secteurs`, c'est-à-dire les
-- missions de prospection de l'agence — quels métiers on démarche, dans
-- quelles villes, et où l'on en est.
--
-- On restreint donc chaque politique d'équipe aux non-clients. `est_client()`
-- est SECURITY DEFINER : un client ne peut pas mentir sur sa nature.

-- ── Secteurs : les missions de prospection ──
drop policy if exists "secteurs_lecture_equipe"  on public.secteurs;
drop policy if exists "secteurs_ecriture_equipe" on public.secteurs;
create policy "secteurs_equipe" on public.secteurs
  for all to authenticated
  using (not public.est_client()) with check (not public.est_client());

-- ── Présence sur une fiche prospect ──
drop policy if exists "presences_lecture_equipe" on public.presences;
drop policy if exists "presences_maj"            on public.presences;
create policy "presences_lecture_equipe" on public.presences
  for select to authenticated using (not public.est_client());
create policy "presences_maj" on public.presences
  for update to authenticated
  using (not public.est_client()) with check (user_id = auth.uid());

-- ── Mémoire de chasse ──
drop policy if exists "chasse_vus_lecture" on public.chasse_vus;
drop policy if exists "chasse_vus_maj"     on public.chasse_vus;
do $$ begin
  create policy "chasse_vus_lecture" on public.chasse_vus
    for select to authenticated using (not public.est_client());
  create policy "chasse_vus_maj" on public.chasse_vus
    for update to authenticated
    using (not public.est_client()) with check (not public.est_client());
exception when duplicate_object then null; end $$;

-- ── Missions refusées ──
drop policy if exists "refus_lecture" on public.missions_refusees;
create policy "refus_lecture" on public.missions_refusees
  for select to authenticated using (not public.est_client());

-- ── Facturation ──
-- Une politique « for all using (true) » sur les données de facturation de
-- l'agence : un client y aurait lu les devis et contrats de tous les autres.
do $$
declare t text;
begin
  foreach t in array array['invoices','quotes','billing_settings','billing_documents'] loop
    if exists (select 1 from information_schema.tables
                where table_schema = 'public' and table_name = t) then
      execute format(
        'drop policy if exists %I on public.%I', t || '_equipe', t);
      execute format(
        'create policy %I on public.%I for all to authenticated
           using (not public.est_client()) with check (not public.est_client())',
        t || '_equipe', t);
    end if;
  end loop;
end $$;

-- Le référentiel des villes et des métiers reste lisible par tous : ce sont
-- des données publiques de l'État, sans intérêt concurrentiel, et les
-- restreindre compliquerait pour rien.

comment on function public.est_client() is
  'Vrai si le compte connecté est un client (espace client), pas un collaborateur. Sert à cloisonner les politiques d''équipe.';
