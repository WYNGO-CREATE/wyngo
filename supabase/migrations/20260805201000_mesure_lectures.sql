-- ─── Ce que le tableau de bord sait lire ─────────────────────────────
--
-- Un commerçant ne lit pas un tableau d'analytics. Il veut trois réponses :
-- est-ce que des gens viennent, d'où viennent-ils, et combien ont voulu me
-- joindre. Chaque fonction ci-dessous répond à une de ces questions et à rien
-- d'autre — c'est ce qui rend le tableau de bord modulable : on affiche les
-- cartes que le client veut, sans que les autres pèsent.
--
-- `p_site` est toujours vérifié : soit le site m'appartient (agence), soit
-- j'en suis le client. Personne ne lit l'audience d'un autre.

create or replace function public.mesure_autorise(p_site uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.client_sites s
     where s.id = p_site
       and (s.owner_id = auth.uid()
            or exists (select 1 from public.client_comptes c
                        where c.site_id = s.id and c.user_id = auth.uid()))
  );
$$;

/** Les grands nombres du bandeau, sur une période, comparés à la précédente. */
create or replace function public.mesure_resume(p_site uuid, p_jours integer default 30)
returns table (
  visites bigint, visiteurs bigint, contacts bigint,
  visites_avant bigint, visiteurs_avant bigint, contacts_avant bigint,
  duree_moyenne_s numeric, pages_par_visite numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with bornes as (
    select now() - (p_jours || ' days')::interval as debut,
           now() - (2 * p_jours || ' days')::interval as debut_avant,
           public.mesure_autorise(p_site) as ok
  ),
  actuel as (
    select
      count(*) filter (where v.genre = 'page') as visites,
      count(distinct v.empreinte) as visiteurs,
      count(*) filter (where v.genre in ('telephone','email','formulaire','whatsapp','itineraire')) as contacts,
      avg(v.duree_s) filter (where v.genre = 'sortie' and v.duree_s between 1 and 3600) as duree,
      (count(*) filter (where v.genre = 'page'))::numeric
        / nullif(count(distinct v.session), 0) as pages
    from public.site_visites v, bornes b
    where b.ok and v.site_id = p_site and v.vu_le >= b.debut
  ),
  avant as (
    select
      count(*) filter (where v.genre = 'page') as visites,
      count(distinct v.empreinte) as visiteurs,
      count(*) filter (where v.genre in ('telephone','email','formulaire','whatsapp','itineraire')) as contacts
    from public.site_visites v, bornes b
    where b.ok and v.site_id = p_site and v.vu_le >= b.debut_avant and v.vu_le < b.debut
  )
  select a.visites, a.visiteurs, a.contacts,
         p.visites, p.visiteurs, p.contacts,
         round(coalesce(a.duree, 0), 0), round(coalesce(a.pages, 0), 1)
    from actuel a, avant p;
$$;

/** La courbe jour par jour. */
create or replace function public.mesure_courbe(p_site uuid, p_jours integer default 30)
returns table (jour date, visites bigint, visiteurs bigint, contacts bigint)
language sql
stable
security definer
set search_path = public
as $$
  select d::date,
         count(v.id) filter (where v.genre = 'page'),
         count(distinct v.empreinte),
         count(v.id) filter (where v.genre in ('telephone','email','formulaire','whatsapp','itineraire'))
    from generate_series(current_date - (p_jours - 1), current_date, '1 day') d
    left join public.site_visites v
      on v.site_id = p_site and v.vu_le::date = d::date
     and public.mesure_autorise(p_site)
   group by d order by d;
$$;

/** Les pages les plus vues. */
create or replace function public.mesure_pages(p_site uuid, p_jours integer default 30)
returns table (chemin text, titre text, visites bigint, visiteurs bigint, duree_moyenne_s numeric)
language sql
stable
security definer
set search_path = public
as $$
  select v.chemin, max(v.titre),
         count(*) filter (where v.genre = 'page'),
         count(distinct v.empreinte),
         round(avg(v.duree_s) filter (where v.genre = 'sortie' and v.duree_s between 1 and 3600), 0)
    from public.site_visites v
   where public.mesure_autorise(p_site) and v.site_id = p_site
     and v.vu_le >= now() - (p_jours || ' days')::interval
   group by v.chemin
   having count(*) filter (where v.genre = 'page') > 0
   order by 3 desc limit 25;
$$;

/**
 * D'où viennent les visiteurs.
 *
 * On regroupe en familles compréhensibles : « Google », « Facebook »,
 * « Accès direct » — pas des noms de domaine bruts, que le client ne lira pas.
 */
create or replace function public.mesure_provenance(p_site uuid, p_jours integer default 30)
returns table (source text, visiteurs bigint)
language sql
stable
security definer
set search_path = public
as $$
  select case
           when coalesce(v.utm_source, '') <> '' then initcap(v.utm_source)
           when v.referent is null or v.referent = '' then 'Accès direct'
           when v.referent ilike '%google%'    then 'Google'
           when v.referent ilike '%bing%'      then 'Bing'
           when v.referent ilike '%facebook%'  then 'Facebook'
           when v.referent ilike '%instagram%' then 'Instagram'
           when v.referent ilike '%linkedin%'  then 'LinkedIn'
           when v.referent ilike '%tiktok%'    then 'TikTok'
           when v.referent ilike '%pagesjaunes%' then 'Pages Jaunes'
           else v.referent
         end,
         count(distinct v.empreinte)
    from public.site_visites v
   where public.mesure_autorise(p_site) and v.site_id = p_site
     and v.genre = 'page' and v.vu_le >= now() - (p_jours || ' days')::interval
   group by 1 order by 2 desc limit 12;
$$;

/** Appareils, et villes d'où l'on consulte le site. */
create or replace function public.mesure_public(p_site uuid, p_jours integer default 30)
returns table (categorie text, valeur text, visiteurs bigint)
language sql
stable
security definer
set search_path = public
as $$
  with v as (
    select * from public.site_visites
     where public.mesure_autorise(p_site) and site_id = p_site
       and genre = 'page' and vu_le >= now() - (p_jours || ' days')::interval
  )
  select 'appareil', coalesce(appareil, 'inconnu'), count(distinct empreinte) from v group by 2
  union all
  select 'ville', coalesce(nullif(ville, ''), 'inconnue'), count(distinct empreinte) from v group by 2
  union all
  select 'navigateur', coalesce(navigateur, 'inconnu'), count(distinct empreinte) from v group by 2
  order by 1, 3 desc;
$$;

/**
 * Les intentions de contact, dans le détail.
 *
 * C'est la carte qui vaut l'abonnement : « 34 personnes ont cliqué sur votre
 * numéro ce mois-ci » se comprend sans explication.
 */
create or replace function public.mesure_contacts(p_site uuid, p_jours integer default 30)
returns table (genre text, nombre bigint, avant bigint)
language sql
stable
security definer
set search_path = public
as $$
  with g as (select unnest(array['telephone','email','formulaire','whatsapp','itineraire']) as genre)
  select g.genre,
    (select count(*) from public.site_visites v
      where public.mesure_autorise(p_site) and v.site_id = p_site and v.genre = g.genre
        and v.vu_le >= now() - (p_jours || ' days')::interval),
    (select count(*) from public.site_visites v
      where public.mesure_autorise(p_site) and v.site_id = p_site and v.genre = g.genre
        and v.vu_le >= now() - (2 * p_jours || ' days')::interval
        and v.vu_le <  now() - (p_jours || ' days')::interval)
  from g;
$$;

/** Les heures et jours où l'on consulte le site — utile pour savoir quand publier. */
create or replace function public.mesure_rythme(p_site uuid, p_jours integer default 30)
returns table (jour_semaine integer, heure integer, visites bigint)
language sql
stable
security definer
set search_path = public
as $$
  select extract(isodow from vu_le)::integer, extract(hour from vu_le)::integer, count(*)
    from public.site_visites
   where public.mesure_autorise(p_site) and site_id = p_site and genre = 'page'
     and vu_le >= now() - (p_jours || ' days')::interval
   group by 1, 2;
$$;

grant execute on function public.mesure_autorise(uuid)            to authenticated;
grant execute on function public.mesure_resume(uuid, integer)     to authenticated;
grant execute on function public.mesure_courbe(uuid, integer)     to authenticated;
grant execute on function public.mesure_pages(uuid, integer)      to authenticated;
grant execute on function public.mesure_provenance(uuid, integer) to authenticated;
grant execute on function public.mesure_public(uuid, integer)     to authenticated;
grant execute on function public.mesure_contacts(uuid, integer)   to authenticated;
grant execute on function public.mesure_rythme(uuid, integer)     to authenticated;

-- Le client lit l'audience de son site (l'agence l'a déjà par sa politique).
create policy "visites_client" on public.site_visites
  for select to authenticated
  using (exists (select 1 from public.client_comptes c
                  where c.site_id = site_visites.site_id and c.user_id = auth.uid() and c.actif));
