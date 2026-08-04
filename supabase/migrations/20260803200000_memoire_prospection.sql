-- ─── Mémoire de prospection partagée ─────────────────────────────────
--
-- Le problème : les collaborateurs sont cloisonnés par owner_id. Ilyes ne
-- voit pas les prospects de Hugo, donc rien ne l'empêche d'appeler
-- quelqu'un que Hugo travaille déjà. Sur une même ville et un même métier,
-- c'est systématique.
--
-- Cette fonction répond à UNE seule question, pour toute l'équipe :
-- « ce SIRET est-il déjà dans le CRM de quelqu'un, et de qui ? »
--
-- Elle est SECURITY DEFINER pour traverser le cloisonnement, mais elle ne
-- renvoie QUE le strict nécessaire : le SIRET, le prénom du collègue et le
-- statut. Aucune coordonnée, aucune note, aucun montant — le cloisonnement
-- des données reste entier.

create or replace function public.prospection_memoire(sirets text[])
returns table (
  siret        text,
  proprietaire text,
  est_moi      boolean,
  statut       text,
  vu_le        timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (p.siret)
    p.siret,
    coalesce(nullif(split_part(pr.full_name, ' ', 1), ''), 'un collègue') as proprietaire,
    p.owner_id = auth.uid()                                              as est_moi,
    p.status::text                                                       as statut,
    p.created_at                                                         as vu_le
  from public.prospects p
  left join public.profiles pr on pr.id = p.owner_id
  where p.siret = any(sirets)
    and p.siret is not null
  order by p.siret, (p.owner_id = auth.uid()) desc, p.created_at asc;
$$;

comment on function public.prospection_memoire(text[]) is
  'Dit si un SIRET est déjà suivi dans le CRM, par qui, sans exposer les données du prospect. Évite que deux collaborateurs appellent la même personne.';

revoke all on function public.prospection_memoire(text[]) from public;
grant execute on function public.prospection_memoire(text[]) to authenticated;
