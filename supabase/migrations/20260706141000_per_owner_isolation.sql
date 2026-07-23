-- ─────────────────────────────────────────────────────────────────────
-- Cloisonnement par propriétaire (avec admin qui voit tout).
--
-- Objectif : un collaborateur (ex. Ilyes) démarre avec un espace VIDE et ne
-- voit que ce qu'il crée ; l'admin (Hugo) voit TOUT (le sien + celui des
-- collaborateurs). EXCEPTION : la table `messages` (inbox) reste PARTAGÉE
-- pour que tout le monde ait accès à la boîte commune.
--
-- Réversible : ré-appliquer 20260627100000_shared_team_workspace.sql restaure
-- l'espace 100% partagé.
-- ─────────────────────────────────────────────────────────────────────
do $$
declare t text; p record;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'owner_id'
      and table_name <> 'messages'          -- inbox : reste partagée (accès équipe)
  loop
    -- purge des policies existantes
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    -- filet de sécurité : à la création, owner_id = l'utilisateur courant
    execute format('alter table public.%I alter column owner_id set default auth.uid()', t);
    -- SELECT / UPDATE / DELETE : admin voit tout, sinon uniquement ses lignes
    execute format('create policy %I on public.%I for select to authenticated using (public.has_role(auth.uid(), ''admin'') or owner_id = auth.uid())', t || '_own_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_team_member())', t || '_own_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_role(auth.uid(), ''admin'') or owner_id = auth.uid()) with check (public.has_role(auth.uid(), ''admin'') or owner_id = auth.uid())', t || '_own_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_role(auth.uid(), ''admin'') or owner_id = auth.uid())', t || '_own_delete', t);
  end loop;
end $$;
