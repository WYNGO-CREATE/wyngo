-- ─── Que les missions sortent d'elles-mêmes, partout en France ───────
--
-- Jusqu'ici une mission ne pouvait exister que si quelqu'un avait ouvert un
-- territoire à la main. Résultat : l'équipe tournait indéfiniment autour de
-- Toulouse, et personne ne serait jamais allé à Nancy.
--
-- On donne donc au système de quoi inventer la mission suivante : toutes les
-- villes de France de plus de 20 000 habitants, tous les métiers du catalogue.
-- Le choix n'est pas purement aléatoire — il va vers les régions les moins
-- travaillées, évite d'envoyer deux personnes dans la même région en même
-- temps, et pioche au hasard à l'intérieur de ça pour que deux journées ne se
-- ressemblent pas.

create table if not exists public.villes_france (
  code_insee  text primary key,
  nom         text not null,
  departement text not null,
  region      text not null,
  population  integer not null,
  lat         double precision not null,
  lng         double precision not null
);

create index if not exists villes_region_idx on public.villes_france (region);

create table if not exists public.metiers_prospection (
  naf   text primary key,
  label text not null,
  actif boolean not null default true
);

alter table public.villes_france       enable row level security;
alter table public.metiers_prospection enable row level security;

-- Référentiel public (INSEE, catalogue métiers) : lisible par l'équipe,
-- modifiable par personne depuis l'application.
create policy "villes_lecture"  on public.villes_france       for select to authenticated using (true);
create policy "metiers_lecture" on public.metiers_prospection for select to authenticated using (true);

-- La région d'un secteur, retenue à sa création : les anciens secteurs ont des
-- communes trop petites pour figurer dans le référentiel, on ne peut pas
-- compter sur une jointure.
alter table public.secteurs add column if not exists region text;

update public.secteurs s
   set region = v.region
  from public.villes_france v
 where s.commune_code = v.code_insee and s.region is null;

create index if not exists secteurs_region_idx on public.secteurs (region);

/**
 * Invente la prochaine mission et la renvoie.
 *
 * Trois arbitrages, dans cet ordre :
 *   1. la région — la moins travaillée d'abord, et jamais celle qu'un collègue
 *      a en cours, pour que l'équipe se répartisse sur le pays ;
 *   2. la ville — dans cette région, une ville encore vierge, les plus
 *      peuplées d'abord puisqu'elles contiennent le plus de prospects ;
 *   3. le métier — un métier peu exploité jusqu'ici, tiré au sort parmi ceux
 *      qui n'ont jamais été faits dans cette ville.
 *
 * Renvoie null s'il ne reste rien à proposer (85 000 combinaisons : autant
 * dire jamais).
 */
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
  -- 1. La région. On écarte celles qu'un collègue occupe déjà ; si tout est
  --    occupé, on lève l'exclusion plutôt que de ne rien proposer.
  select v.region into v_region
    from public.villes_france v
    left join public.secteurs s on s.region = v.region
   where v.region not in (
           select coalesce(s2.region, '')
             from public.secteurs s2
            where s2.etat = 'en_cours' and s2.assignee is distinct from p_pour
         )
   group by v.region
   order by count(s.id) asc, random()
   limit 1;

  if v_region is null then
    select v.region into v_region
      from public.villes_france v
      left join public.secteurs s on s.region = v.region
     group by v.region
     order by count(s.id) asc, random()
     limit 1;
  end if;

  -- 2. La ville : une où l'on n'a encore rien fait, la plus peuplée d'abord.
  select v.* into v_ville
    from public.villes_france v
   where v.region = v_region
     and not exists (select 1 from public.secteurs s where s.commune_code = v.code_insee)
   order by v.population desc, random()
   limit 1;

  -- Toutes les villes de la région sont entamées → on en reprend une, et le
  -- métier fera la différence.
  if v_ville is null then
    select v.* into v_ville
      from public.villes_france v
     where v.region = v_region
     order by random()
     limit 1;
  end if;

  if v_ville is null then return null; end if;

  -- 3. Le métier : jamais fait dans cette ville, et rarement fait ailleurs.
  select m.* into v_metier
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

/**
 * Ma mission du moment.
 *
 * Si j'en ai une en cours, elle est renvoyée — et refermée d'office si toutes
 * ses cibles ont été appelées. Sinon je reprends un territoire libre déjà
 * découpé ; et s'il n'y en a pas, le système m'en invente un ailleurs en
 * France. On ne se retrouve donc jamais sans rien à faire.
 */
-- La signature gagne deux colonnes : Postgres refuse un `create or replace`
-- qui change le type de retour, il faut retirer l'ancienne d'abord.
drop function if exists public.mission_courante();

create function public.mission_courante()
returns table (
  id uuid, metier text, commune text, total_connu integer,
  verifies bigint, cibles bigint, appelees bigint, etat text,
  region text, nouvelle boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id       uuid;
  v_av       record;
  v_nouvelle boolean := false;
begin
  select s.id into v_id from public.secteurs s
   where s.assignee = auth.uid() and s.etat = 'en_cours' limit 1;

  if v_id is not null then
    select * into v_av from public.mission_avancement(v_id);
    if v_av.cibles > 0 and v_av.appelees >= v_av.cibles then
      update public.secteurs
         set etat = 'conquise', conquise_le = now()
       where secteurs.id = v_id;
      v_id := null;
    end if;
  end if;

  -- Un territoire déjà découpé, en attente de quelqu'un.
  if v_id is null then
    select s.id into v_id from public.secteurs s
     where s.etat = 'libre' and s.assignee is null
     order by s.total_connu asc nulls last
     limit 1;
    if v_id is not null then
      update public.secteurs
         set assignee = auth.uid(), etat = 'en_cours', ouverte_le = now()
       where secteurs.id = v_id;
    end if;
  end if;

  -- Plus rien de découpé : on part ailleurs en France.
  if v_id is null then
    v_id := public.mission_inventer(auth.uid());
    v_nouvelle := v_id is not null;
  end if;

  if v_id is null then return; end if;

  select * into v_av from public.mission_avancement(v_id);
  return query
    select s.id, s.metier, s.commune, s.total_connu,
           v_av.verifies, v_av.cibles, v_av.appelees, s.etat,
           s.region, v_nouvelle
      from public.secteurs s where s.id = v_id;
end;
$$;

grant execute on function public.mission_courante() to authenticated;

/**
 * Passer son tour.
 *
 * Une mission est une proposition, pas un ordre : si elle ne convient pas
 * (ville trop loin, métier qu'on ne sent pas), on la relâche et la suivante
 * arrive. Le territoire redevient libre pour quelqu'un d'autre.
 */
create or replace function public.mission_passer()
returns void
language sql
security definer
set search_path = public
as $$
  update public.secteurs
     set assignee = null, etat = 'libre', ouverte_le = null
   where assignee = auth.uid() and etat = 'en_cours';
$$;

grant execute on function public.mission_passer() to authenticated;

/** Où en est l'équipe, région par région. */
create or replace function public.conquete_par_region()
returns table (region text, missions bigint, conquises bigint, villes_total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select v.region,
         count(distinct s.id),
         count(distinct s.id) filter (where s.etat = 'conquise'),
         count(distinct v.code_insee)
    from public.villes_france v
    left join public.secteurs s on s.region = v.region
   group by v.region
   order by count(distinct s.id) desc, v.region;
$$;

grant execute on function public.conquete_par_region() to authenticated;
