-- ─── Plus de « équipe » sur la carte ─────────────────────────────────
--
-- La légende affichait « équipe » à côté de Hugo et Ilyes, sans que ça veuille
-- dire quoi que ce soit. C'était le repli appliqué aux lignes sans
-- propriétaire — et il y en avait 500, parce que la chasse n'enregistrait
-- jamais qui l'avait lancée (le front ne transmettait pas l'identité).
--
-- La cause est corrigée dans pappers-search, qui lit désormais l'auteur dans
-- le jeton de l'appelant. Restent les 500 lignes historiques, qui n'ont pas
-- d'auteur et n'en auront jamais : une carte de conquête montre qui a conquis
-- quoi, un point que personne ne revendique n'y a pas sa place. On les garde
-- en mémoire de chasse — elles évitent toujours de reproposer ces entreprises
-- — mais on ne les dessine plus.

create or replace function public.carte_activite()
returns table (
  commune text, lat double precision, lng double precision,
  par text, genre text, metier text, n bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select s.commune, s.lat, s.lng,
         coalesce(nullif(split_part(pr.full_name, ' ', 1), ''), 'équipe'),
         case when s.etat = 'conquise' then 'conquise' else 'en_cours' end,
         s.metier, 1::bigint
    from public.secteurs s
    left join public.profiles pr on pr.id = s.assignee
   where s.etat in ('en_cours', 'conquise') and s.lat is not null

  union all

  select v.nom, v.lat, v.lng, x.prenom, 'activite', null, x.n
    from (
      select public.commune_depuis_zone(c.zone) as ville,
             nullif(split_part(pr.full_name, ' ', 1), '') as prenom,
             count(*) as n
        from public.chasse_vus c
        join public.profiles pr on pr.id = c.vu_par   -- jointure stricte : pas d'auteur, pas de point
       group by 1, 2
    ) x
    join public.villes_france v on lower(v.nom) = lower(x.ville)
   where x.ville is not null and x.prenom is not null

  union all

  select v.nom, v.lat, v.lng, x.prenom, 'activite', null, x.n
    from (
      select public.commune_depuis_adresse(p.location) as ville,
             nullif(split_part(pr.full_name, ' ', 1), '') as prenom,
             count(*) as n
        from public.prospects p
        join public.profiles pr on pr.id = p.owner_id
       group by 1, 2
    ) x
    join public.villes_france v on lower(v.nom) = lower(x.ville)
   where x.ville is not null and x.prenom is not null;
$$;

grant execute on function public.carte_activite() to authenticated;
