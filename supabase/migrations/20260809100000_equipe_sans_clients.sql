-- ─── Un client n'apparaît plus jamais dans l'équipe ──────────────────
--
-- Le rôle « collaborator » n'était déjà plus donné aux comptes clients. Mais
-- l'écran Équipe listait la table `profiles` SANS REGARDER LES RÔLES — et le
-- déclencheur crée un profil pour tout nouveau compte, client compris. Les
-- clients s'affichaient donc bien comme des collaborateurs.
--
-- On ne supprime aucun profil : l'application en a besoin pour l'utilisateur
-- connecté, y compris côté client. On corrige la DÉFINITION de l'équipe, et
-- on la met à un seul endroit pour qu'aucun écran ne puisse s'en écarter.
--
-- Trois verrous, déjà deux en place :
--   1. handle_new_user ne donne pas de rôle à un compte d'espace client ;
--   2. client_comptes refuse de rattacher un compte qui a un rôle CRM ;
--   3. (ici) l'équipe se lit par une fonction, jamais par la table.

/**
 * Les membres de l'agence. Un compte en fait partie s'il a un rôle CRM ET
 * qu'il n'est rattaché à aucun espace client.
 */
create or replace function public.equipe()
returns table (
  id uuid, full_name text, email text, role text,
  created_at timestamptz, is_active boolean, archived_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.email, r.role::text,
         p.created_at, p.is_active, p.archived_at
    from public.profiles p
    join public.user_roles r on r.user_id = p.id
   where not exists (select 1 from public.client_comptes c where c.user_id = p.id)
     -- Seuls les membres de l'agence voient l'équipe.
     and not public.est_client()
   order by p.created_at;
$$;

grant execute on function public.equipe() to authenticated;

comment on function public.equipe() is
  'La liste des membres de l''agence. Source unique : un rôle CRM et aucun rattachement client. Les écrans ne doivent jamais lire profiles directement pour lister l''équipe.';

-- Filet supplémentaire : un compte marqué « espace client » ne doit pas
-- pouvoir recevoir un rôle CRM, même par une insertion manuelle.
create or replace function public.refuser_role_sur_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.client_comptes c where c.user_id = new.user_id)
     or exists (select 1 from auth.users u
                 where u.id = new.user_id
                   and coalesce((u.raw_user_meta_data->>'espace_client')::boolean, false)) then
    raise exception
      'Ce compte est un espace client : il ne peut pas recevoir de rôle dans le CRM.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_refuser_role_sur_client on public.user_roles;
create trigger trg_refuser_role_sur_client
  before insert or update on public.user_roles
  for each row execute function public.refuser_role_sur_client();

-- Réparation : on retire les rôles qui traînent encore sur des comptes clients.
delete from public.user_roles r
 where exists (select 1 from public.client_comptes c where c.user_id = r.user_id);
