-- ─── Un collaborateur ne doit jamais devenir client ──────────────────
--
-- En créant l'espace de démonstration, j'ai rattaché un compte CLIENT à une
-- adresse qui servait déjà de compte COLLABORATEUR. Conséquence immédiate :
-- est_client() devient vrai, et le routeur éjecte cette personne du CRM vers
-- l'espace client. Elle se retrouve enfermée dehors sans comprendre pourquoi.
--
-- Le garde-fou est en base, pas dans l'interface : c'est le seul endroit qui
-- vaut pour tous les chemins d'écriture.

create or replace function public.refuser_client_sur_collaborateur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.user_roles where user_id = new.user_id) then
    raise exception
      'Ce compte est déjà un collaborateur de l''agence : il ne peut pas être client. Utilisez une autre adresse email.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_refuser_client_sur_collaborateur on public.client_comptes;
create trigger trg_refuser_client_sur_collaborateur
  before insert or update on public.client_comptes
  for each row execute function public.refuser_client_sur_collaborateur();

comment on function public.refuser_client_sur_collaborateur() is
  'Empêche qu''un compte du CRM soit rattaché comme client : il serait aussitôt redirigé hors du CRM.';
