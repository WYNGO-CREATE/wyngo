-- ─── Le rapport mensuel se calcule tout seul ─────────────────────────
--
-- Jusqu'ici les six chiffres du rapport étaient tapés à la main dans le
-- Studio, une fois par mois, par site. Outre le temps perdu, ça créait deux
-- vérités : celle de l'espace client, mesurée, et celle du rapport, saisie.
--
-- Tout ce qui est mesurable est désormais lu depuis site_visites. Une seule
-- fonction renvoie le mois complet, comparé au précédent : le rapport n'a plus
-- qu'à mettre en forme.

create or replace function public.rapport_mensuel(p_site uuid, p_mois date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d0 date; d1 date; p0 date;
  r jsonb;
begin
  if not public.mesure_autorise(p_site) then
    raise exception 'Accès refusé';
  end if;

  d0 := date_trunc('month', coalesce(p_mois, current_date - interval '1 month'))::date;
  d1 := (d0 + interval '1 month')::date;
  p0 := (d0 - interval '1 month')::date;

  with
  mois as (
    select * from public.site_visites
     where site_id = p_site and vu_le >= d0 and vu_le < d1
  ),
  avant as (
    select * from public.site_visites
     where site_id = p_site and vu_le >= p0 and vu_le < d0
  ),
  chiffres as (
    select
      (select count(*) from mois where genre = 'page')                    as visites,
      (select count(distinct empreinte) from mois)                        as visiteurs,
      (select count(*) from mois where genre in
        ('telephone','email','formulaire','whatsapp','itineraire'))       as contacts,
      (select count(*) from avant where genre = 'page')                   as visites_avant,
      (select count(distinct empreinte) from avant)                       as visiteurs_avant,
      (select count(*) from avant where genre in
        ('telephone','email','formulaire','whatsapp','itineraire'))       as contacts_avant,
      (select round(avg(duree_s)) from mois
        where genre = 'sortie' and duree_s between 1 and 3600)            as duree,
      -- Part des visiteurs arrivés par un moteur de recherche : le seul
      -- signal de référencement que l'on puisse mesurer sans dépendre de
      -- Google Search Console.
      (select count(distinct empreinte) from mois
        where genre = 'page' and referent ilike any (array['%google%','%bing%','%qwant%','%ecosia%','%duckduckgo%']))
                                                                          as via_recherche,
      (select count(distinct empreinte) from avant
        where genre = 'page' and referent ilike any (array['%google%','%bing%','%qwant%','%ecosia%','%duckduckgo%']))
                                                                          as via_recherche_avant
  ),
  detail as (
    select coalesce(jsonb_object_agg(g.genre, n), '{}'::jsonb) as j from (
      select genre, count(*) as n from mois
       where genre in ('telephone','email','formulaire','whatsapp','itineraire')
       group by genre
    ) g
  ),
  sources as (
    select coalesce(jsonb_agg(x), '[]'::jsonb) as j from (
      select case
               when referent is null or referent = ''  then 'Accès direct'
               when referent ilike '%google%'    then 'Google'
               when referent ilike '%facebook%'  then 'Facebook'
               when referent ilike '%instagram%' then 'Instagram'
               when referent ilike '%bing%'      then 'Bing'
               else referent end as source,
             count(distinct empreinte) as n
        from mois where genre = 'page'
       group by 1 order by 2 desc limit 5
    ) x
  ),
  pages as (
    select coalesce(jsonb_agg(x), '[]'::jsonb) as j from (
      select coalesce(max(titre), chemin) as titre, chemin, count(*) as n
        from mois where genre = 'page' group by chemin order by 3 desc limit 5
    ) x
  ),
  appareils as (
    select coalesce(jsonb_object_agg(appareil, n), '{}'::jsonb) as j from (
      select coalesce(appareil, 'inconnu') as appareil, count(distinct empreinte) as n
        from mois where genre = 'page' group by 1
    ) a
  ),
  meilleur as (
    select coalesce((select jsonb_build_object('jour', j, 'visites', n) from (
      select vu_le::date as j, count(*) as n from mois where genre = 'page'
       group by 1 order by 2 desc limit 1) b), 'null'::jsonb) as j
  )
  select jsonb_build_object(
    'mois', to_char(d0, 'YYYY-MM'),
    'mois_libelle', trim(to_char(d0, 'TMMonth YYYY')),
    'visites', c.visites, 'visiteurs', c.visiteurs, 'contacts', c.contacts,
    'visites_avant', c.visites_avant, 'visiteurs_avant', c.visiteurs_avant,
    'contacts_avant', c.contacts_avant,
    'duree_moyenne_s', coalesce(c.duree, 0),
    'via_recherche', c.via_recherche, 'via_recherche_avant', c.via_recherche_avant,
    'detail_contacts', d.j, 'sources', s.j, 'pages', p.j, 'appareils', a.j,
    'meilleur_jour', m.j
  ) into r
  from chiffres c, detail d, sources s, pages p, appareils a, meilleur m;

  return r;
end;
$$;

grant execute on function public.rapport_mensuel(uuid, date) to authenticated;

comment on function public.rapport_mensuel(uuid, date) is
  'Tout le rapport mensuel d''un site, mesuré, comparé au mois précédent. Remplace la saisie manuelle de site_metrics.';

-- Les colonnes saisies à la main restent en place pour l'historique déjà
-- envoyé, mais la note et la position Google ne s'inventent plus : la note
-- vient de Google Places, la position n'est pas mesurable sans Search Console
-- et disparaît du rapport.
alter table public.site_metrics
  add column if not exists note_google      numeric(2,1),
  add column if not exists avis_google      integer,
  add column if not exists releve_le        timestamptz;

comment on column public.site_metrics.google_position is
  'OBSOLÈTE : une position Google honnête exige Search Console, site par site. Le rapport affiche désormais la part de visiteurs venus d''un moteur de recherche, qui se mesure.';
