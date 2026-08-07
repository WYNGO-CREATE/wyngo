-- ─── Ce qui se passe en ce moment sur le site ────────────────────────
--
-- Un tableau de bord mensuel, on le consulte une fois. Ce qui donne envie de
-- revenir, c'est de voir son commerce vivre : quelqu'un est là maintenant,
-- quelqu'un vient de cliquer sur le numéro.
--
-- Rien d'inventé ici : ce sont les mêmes signaux, lus sur les dernières
-- minutes plutôt que sur le mois.
--
-- Au passage, la carte « De quelles villes » est retirée du catalogue : le
-- collecteur ne reçoit aucune donnée de localisation (vérifié — pays et ville
-- sont nuls sur 100 % des lignes), elle affichait donc « inconnue » à 100 %.

/** Qui est sur le site en ce moment, et les derniers gestes. */
create or replace function public.mesure_direct(p_site uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.mesure_autorise(p_site) then '{}'::jsonb else
    jsonb_build_object(
      -- « En ce moment » = les 5 dernières minutes. Au-delà, on ne peut plus
      -- affirmer que la personne est encore là.
      'maintenant', (select count(distinct empreinte) from public.site_visites
                      where site_id = p_site and vu_le > now() - interval '5 minutes'),
      'aujourdhui', (select count(distinct empreinte) from public.site_visites
                      where site_id = p_site and vu_le::date = current_date),
      'contacts_aujourdhui', (select count(*) from public.site_visites
                      where site_id = p_site and vu_le::date = current_date
                        and genre in ('telephone','email','formulaire','whatsapp','itineraire')),
      'derniers', coalesce((
        select jsonb_agg(x) from (
          select genre, chemin, titre, appareil,
                 extract(epoch from (now() - vu_le))::bigint as il_y_a_s
            from public.site_visites
           where site_id = p_site
             and genre in ('telephone','email','formulaire','whatsapp','itineraire','page')
             and vu_le > now() - interval '48 hours'
           order by vu_le desc limit 12
        ) x), '[]'::jsonb)
    )
  end;
$$;

grant execute on function public.mesure_direct(uuid) to authenticated;

/**
 * Le fait marquant du mois, en une phrase.
 *
 * Un commerçant retient une phrase, pas un tableau. On choisit le fait le plus
 * parlant qu'on puisse affirmer sans rien inventer, et on ne renvoie rien s'il
 * n'y a rien à dire — mieux vaut le silence qu'une phrase creuse.
 */
create or replace function public.mesure_fait_marquant(p_site uuid, p_jours integer default 30)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n_tel integer; n_vis integer; n_avant integer; meilleur record; part_mobile integer;
begin
  if not public.mesure_autorise(p_site) then return null; end if;

  select count(*) into n_tel from public.site_visites
   where site_id = p_site and genre = 'telephone'
     and vu_le > now() - (p_jours || ' days')::interval;

  if n_tel >= 3 then
    return n_tel || ' personnes ont cliqué sur votre numéro depuis votre site.';
  end if;

  select count(distinct empreinte) into n_vis from public.site_visites
   where site_id = p_site and genre = 'page' and vu_le > now() - (p_jours || ' days')::interval;
  select count(distinct empreinte) into n_avant from public.site_visites
   where site_id = p_site and genre = 'page'
     and vu_le > now() - (2 * p_jours || ' days')::interval
     and vu_le <= now() - (p_jours || ' days')::interval;

  if n_avant > 0 and n_vis > n_avant * 1.2 then
    return 'Vous avez reçu ' || round(((n_vis - n_avant)::numeric / n_avant) * 100)
           || ' % de visiteurs de plus que le mois précédent.';
  end if;

  select vu_le::date as j, count(*) as n into meilleur
    from public.site_visites
   where site_id = p_site and genre = 'page' and vu_le > now() - (p_jours || ' days')::interval
   group by 1 order by 2 desc limit 1;

  if meilleur.n >= 5 then
    return 'Votre meilleure journée : ' || to_char(meilleur.j, 'DD/MM') || ', avec '
           || meilleur.n || ' pages consultées.';
  end if;

  select round(100.0 * count(*) filter (where appareil = 'mobile') / nullif(count(*), 0))
    into part_mobile from public.site_visites
   where site_id = p_site and genre = 'page' and vu_le > now() - (p_jours || ' days')::interval;

  if part_mobile >= 60 then
    return part_mobile || ' % de vos visiteurs vous consultent depuis leur téléphone.';
  end if;

  return null;
end;
$$;

grant execute on function public.mesure_fait_marquant(uuid, integer) to authenticated;
