-- ─── Répartir à la densité, pas au compte brut ───────────────────────
--
-- La première version choisissait « la région où l'on a fait le moins de
-- missions ». En valeur absolue, c'était toujours la Corse : trois villes de
-- plus de 20 000 habitants, donc un compteur qui ne monte jamais. En
-- simulation, elle raflait 12 missions sur 42 — l'équipe aurait passé un quart
-- de son temps sur 0,5 % de la population.
--
-- On raisonne donc en proportion : missions déjà faites RAPPORTÉES au nombre
-- de villes de la région. Une région pleinement travaillée sort du haut du
-- classement, quelle que soit sa taille.

create or replace function public.mission_inventer(p_pour uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_region  text;
  v_ville   record;
  v_metier  record;
  v_id      uuid;
begin
  -- 1. La région la moins entamée EN PROPORTION de ce qu'elle contient,
  --    en écartant celles qu'un collègue occupe déjà.
  select x.region into v_region from (
    select v.region,
           count(distinct s.id)::numeric
             / greatest(count(distinct v.code_insee), 1) as densite
      from public.villes_france v
      left join public.secteurs s on s.region = v.region
     where v.region not in (
             select coalesce(s2.region, '')
               from public.secteurs s2
              where s2.etat = 'en_cours' and s2.assignee is distinct from p_pour
           )
     group by v.region
  ) x
   order by x.densite asc, random()
   limit 1;

  -- Toutes les régions sont occupées : on lève l'exclusion plutôt que de
  -- laisser quelqu'un sans mission.
  if v_region is null then
    select x.region into v_region from (
      select v.region,
             count(distinct s.id)::numeric
               / greatest(count(distinct v.code_insee), 1) as densite
        from public.villes_france v
        left join public.secteurs s on s.region = v.region
       group by v.region
    ) x
     order by x.densite asc, random()
     limit 1;
  end if;

  -- 2. Une ville encore vierge de la région, les plus peuplées d'abord :
  --    c'est là qu'il y a le plus de prospects à trouver.
  select v.* into v_ville
    from public.villes_france v
   where v.region = v_region
     and not exists (select 1 from public.secteurs s where s.commune_code = v.code_insee)
   order by v.population desc, random()
   limit 1;

  if v_ville is null then
    select v.* into v_ville
      from public.villes_france v
     where v.region = v_region
     order by random()
     limit 1;
  end if;

  if v_ville is null then return null; end if;

  -- 3. Un métier jamais fait dans cette ville, et peu exploité ailleurs.
  select m.naf, m.label into v_metier
    from public.metiers_prospection m
    left join public.secteurs s on s.naf = m.naf
   where m.actif
     and not exists (
           select 1 from public.secteurs s2
            where s2.commune_code = v_ville.code_insee and s2.naf = m.naf)
   group by m.naf, m.label
   order by count(s.id) asc, random()
   limit 1;

  if v_metier is null then return null; end if;

  insert into public.secteurs
    (naf, metier, commune_code, commune, region, lat, lng, assignee, etat, ouverte_le)
  values
    (v_metier.naf, v_metier.label, v_ville.code_insee, v_ville.nom, v_ville.region,
     v_ville.lat, v_ville.lng, p_pour, 'en_cours', now())
  on conflict (naf, commune_code) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.mission_inventer(uuid) to authenticated;
