-- ─── Passer son tour doit vouloir dire quelque chose ─────────────────
--
-- « Passer mon tour » relâchait la mission, puis la reprise cherchait un
-- territoire libre — et retombait immédiatement sur celui qu'on venait de
-- refuser. Le bouton ne servait à rien.
--
-- On garde donc trace du refus. La mission redevient disponible pour les
-- autres, mais plus pour celui qui l'a écartée.

create table if not exists public.missions_refusees (
  secteur_id uuid not null references public.secteurs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  refusee_le timestamptz not null default now(),
  primary key (secteur_id, user_id)
);

alter table public.missions_refusees enable row level security;

create policy "refus_lecture" on public.missions_refusees
  for select to authenticated using (true);
create policy "refus_ecriture" on public.missions_refusees
  for insert to authenticated with check (user_id = auth.uid());

create or replace function public.mission_passer()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.secteurs
   where assignee = auth.uid() and etat = 'en_cours' limit 1;

  if v_id is null then return; end if;

  insert into public.missions_refusees (secteur_id, user_id)
  values (v_id, auth.uid())
  on conflict do nothing;

  update public.secteurs
     set assignee = null, etat = 'libre', ouverte_le = null
   where id = v_id;
end;
$$;

grant execute on function public.mission_passer() to authenticated;

-- La reprise d'un territoire libre doit sauter ceux que j'ai écartés.
create or replace function public.mission_courante()
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

  if v_id is null then
    select s.id into v_id from public.secteurs s
     where s.etat = 'libre' and s.assignee is null
       and not exists (select 1 from public.missions_refusees r
                        where r.secteur_id = s.id and r.user_id = auth.uid())
     order by s.total_connu asc nulls last
     limit 1;
    if v_id is not null then
      update public.secteurs
         set assignee = auth.uid(), etat = 'en_cours', ouverte_le = now()
       where secteurs.id = v_id;
    end if;
  end if;

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

-- Et l'invention ne doit pas recréer une ville×métier déjà écartée : la
-- contrainte d'unicité la bloquerait, laissant la personne sans mission.
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

  -- On exclut les couples déjà existants (donc aussi ceux que j'ai refusés).
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
