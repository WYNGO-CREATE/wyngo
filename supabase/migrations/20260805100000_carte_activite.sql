-- ─── La carte doit montrer le travail réel, pas seulement les missions ───
--
-- carte_conquetes() ne connaissait que les secteurs assignés. Or personne ne
-- se limitera aux missions : quelqu'un qui chasse librement à Bayonne, ou qui
-- ajoute des prospects à Albi, ne laissait aucune trace sur la carte. Son
-- travail n'existait pas.
--
-- On réunit donc trois sources :
--   • les missions (secteurs), qui portent déjà leurs coordonnées ;
--   • les vagues de chasse (chasse_vus), dont la zone est du type « Lyon 30km » ;
--   • les prospects entrés au CRM, dont l'adresse se termine par la ville.
--
-- Les deux dernières n'ont pas de coordonnées : on les retrouve par le nom de
-- la commune dans le référentiel des villes.

/** « Lyon 30km » → « Lyon » ; « 6 Rue de Ciron, 81000 Albi » → « Albi ». */
create or replace function public.commune_depuis_zone(z text)
returns text
language sql
immutable
as $$
  select nullif(btrim(regexp_replace(coalesce(z, ''), '\s*\d+\s*km\s*$', '', 'i')), '');
$$;

create or replace function public.commune_depuis_adresse(a text)
returns text
language sql
immutable
as $$
  select nullif(btrim((regexp_match(coalesce(a, ''), '\d{5}\s+(.+)$'))[1]), '');
$$;

/**
 * Tout ce que l'équipe a touché, situé sur la carte.
 *
 * `genre` distingue ce qui est joué : une mission conquise, une mission en
 * cours, ou une simple activité hors mission. `n` donne le volume, pour que la
 * carte puisse grossir les endroits où l'on a beaucoup travaillé.
 */
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
  -- 1. Les missions : coordonnées déjà connues.
  select s.commune, s.lat, s.lng,
         coalesce(nullif(split_part(pr.full_name, ' ', 1), ''), 'équipe'),
         case when s.etat = 'conquise' then 'conquise' else 'en_cours' end,
         s.metier,
         1::bigint
    from public.secteurs s
    left join public.profiles pr on pr.id = s.assignee
   where s.etat in ('en_cours', 'conquise') and s.lat is not null

  union all

  -- 2. Les vagues de chasse, rattachées à leur commune.
  select v.nom, v.lat, v.lng, x.prenom, 'activite', null, x.n
    from (
      select public.commune_depuis_zone(c.zone) as ville,
             coalesce(nullif(split_part(pr.full_name, ' ', 1), ''), 'équipe') as prenom,
             count(*) as n
        from public.chasse_vus c
        left join public.profiles pr on pr.id = c.vu_par
       group by 1, 2
    ) x
    join public.villes_france v on lower(v.nom) = lower(x.ville)
   where x.ville is not null

  union all

  -- 3. Les prospects entrés au CRM, rattachés à leur commune.
  select v.nom, v.lat, v.lng, x.prenom, 'activite', null, x.n
    from (
      select public.commune_depuis_adresse(p.location) as ville,
             coalesce(nullif(split_part(pr.full_name, ' ', 1), ''), 'équipe') as prenom,
             count(*) as n
        from public.prospects p
        left join public.profiles pr on pr.id = p.owner_id
       group by 1, 2
    ) x
    join public.villes_france v on lower(v.nom) = lower(x.ville)
   where x.ville is not null;
$$;

grant execute on function public.carte_activite() to authenticated;
