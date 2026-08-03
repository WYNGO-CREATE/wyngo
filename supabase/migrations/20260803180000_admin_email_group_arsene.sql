-- Droits admin du Radar Tech : l'identifiant de connexion passe de
-- contact@wyngo.fr à contact@grouparsene.fr.
--
-- La fonction teste l'email du jeton. Si on change l'identifiant sans
-- l'élargir d'abord, l'accès admin est perdu au moment même du changement.
-- On garde donc les anciennes adresses en plus de la nouvelle : elles ne
-- coûtent rien et évitent tout enfermement dehors.
create or replace function public.is_radar_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') in (
    'contact@grouparsene.fr',
    'contact@wyngo.fr',
    'hugomalet55@gmail.com'
  );
$$;
