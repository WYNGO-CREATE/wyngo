-- ─────────────────────────────────────────────────────────────────────
-- Espace de travail PARTAGÉ pour l'équipe
--
-- Avant : chaque collaborateur ne voyait que SES données (owner_id), seul
--         l'admin voyait tout → incohérent (équipe commerciale = pipeline
--         commun).
-- Après : tout membre invité (présent dans user_roles) voit et agit sur
--         TOUT (prospects, sites, devis, RDV…), exactement comme l'admin.
--         owner_id reste posé à la création (attribution "créé par").
--
-- Les tables sans owner_id (user_roles, profiles, auth) ne sont PAS touchées.
-- ─────────────────────────────────────────────────────────────────────

-- Membre de l'équipe = possède au moins un rôle (invité par l'admin)
create or replace function public.is_team_member(_uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid);
$$;

-- Applique des policies d'équipe uniformes à TOUTE table possédant owner_id
do $$
declare t text; p record;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'owner_id'
  loop
    -- 1. on retire les policies existantes (cloisonnement par owner)
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;
    -- 2. RLS activée
    execute format('alter table public.%I enable row level security', t);
    -- 3. policies d'équipe : tout membre invité a accès complet
    execute format('create policy %I on public.%I for select to authenticated using (public.is_team_member())', t || '_team_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_team_member())', t || '_team_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_team_member()) with check (public.is_team_member())', t || '_team_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_team_member())', t || '_team_delete', t);
  end loop;
end $$;
