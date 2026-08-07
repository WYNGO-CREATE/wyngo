-- ─── Un client n'est pas un collaborateur du CRM ─────────────────────
--
-- handle_new_user() donne le rôle « collaborator » à TOUT nouveau compte —
-- c'était juste tant que seuls des collaborateurs existaient. Depuis l'espace
-- client, chaque client invité recevait donc aussi un rôle dans le CRM.
--
-- Conséquences réelles :
--   • un client figurait dans user_roles, donc dans l'équipe ;
--   • et le garde-fou ajouté juste avant bloquait toute nouvelle invitation,
--     puisque le compte venait d'obtenir un rôle une milliseconde plus tôt.
--
-- On distingue les deux à la création : l'espace client marque ses comptes
-- d'un `espace_client` dans les métadonnées, posé par client-inviter.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count integer;
  assigned_role app_role;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email);

  -- Un compte d'espace client n'entre pas dans l'équipe.
  if coalesce((new.raw_user_meta_data->>'espace_client')::boolean, false) then
    return new;
  end if;

  select count(*) into user_count from public.user_roles;
  assigned_role := case when user_count = 0 then 'admin' else 'collaborator' end;
  insert into public.user_roles (user_id, role) values (new.id, assigned_role);
  return new;
end;
$$;

-- Réparation des comptes clients déjà créés : on leur retire le rôle CRM.
delete from public.user_roles r
 where exists (select 1 from public.client_comptes c where c.user_id = r.user_id);

delete from public.user_roles r
 where exists (
   select 1 from auth.users u
    where u.id = r.user_id
      and coalesce((u.raw_user_meta_data->>'espace_client')::boolean, false)
 );

comment on function public.handle_new_user() is
  'Crée le profil, et le rôle CRM SAUF pour les comptes d''espace client (métadonnée espace_client).';
