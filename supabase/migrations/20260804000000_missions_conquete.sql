-- ─── Missions de prospection & carte de conquête ─────────────────────
--
-- La version précédente proposait une liste de secteurs à réserver à la main.
-- C'était redondant : la réservation se fait déjà toute seule (ce qui entre au
-- CRM devient inaccessible aux autres, et la mémoire de chasse les écarte).
--
-- Ce qu'il faut, c'est l'inverse : que le système ATTRIBUE. Une mission par
-- personne — « vétérinaires à Toulouse » pour l'un, « notaires à Lyon » pour
-- l'autre — qui se ferme quand toutes les cibles ont été appelées, et laisse
-- place à la suivante. Les territoires conquis s'affichent sur une carte.

-- La colonne d'assignation portait un nom de « suggestion ». Une mission est
-- attribuée, pas proposée : on renomme d'abord, les fonctions s'en servent.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'secteurs'
                and column_name = 'suggere_a') then
    alter table public.secteurs rename column suggere_a to assignee;
  end if;
end $$;

alter table public.secteurs
  add column if not exists lat         double precision,
  add column if not exists lng         double precision,
  add column if not exists etat        text not null default 'libre',
  add column if not exists ouverte_le  timestamptz,
  add column if not exists conquise_le timestamptz;

comment on column public.secteurs.etat is
  'libre = disponible · en_cours = attribuée à quelqu''un · conquise = toutes les cibles appelées';

create index if not exists secteurs_etat_idx on public.secteurs (etat);

/**
 * Avancement réel d'une mission, calculé depuis les données existantes.
 *
 * « Cibles » = entreprises sans site ou au site obsolète révélées par la chasse.
 * « Appelées » = celles pour lesquelles un appel a été journalisé.
 * Une mission est conquise quand tout le secteur a été vérifié ET que toutes
 * les cibles ont été appelées.
 */
create or replace function public.mission_avancement(p_secteur uuid)
returns table (verifies bigint, cibles bigint, appelees bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.chasse_vus v
      join public.secteurs s on s.id = p_secteur
      where v.metier = s.naf and v.zone ilike s.commune || '%' and v.statut_site is not null),
    (select count(*) from public.chasse_vus v
      join public.secteurs s on s.id = p_secteur
      where v.metier = s.naf and v.zone ilike s.commune || '%'
        and v.statut_site in ('no_website','outdated')),
    (select count(distinct p.id) from public.prospects p
      join public.secteurs s on s.id = p_secteur
      join public.call_logs c on c.prospect_id = p.id
      where p.industry = s.metier and p.location ilike '%' || s.commune || '%');
$$;

grant execute on function public.mission_avancement(uuid) to authenticated;

/**
 * Ma mission du moment.
 *
 * Si j'en ai déjà une en cours, elle est renvoyée — et refermée d'office si
 * toutes ses cibles ont été appelées. Sinon on m'en attribue une nouvelle,
 * jamais celle d'un collègue, en commençant par les plus petites : un
 * territoire qui se boucle donne envie d'en prendre un autre.
 */
create or replace function public.mission_courante()
returns table (
  id uuid, metier text, commune text, total_connu integer,
  verifies bigint, cibles bigint, appelees bigint, etat text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_av record;
begin
  select s.id into v_id from public.secteurs s
   where s.assignee = auth.uid() and s.etat = 'en_cours' limit 1;

  if v_id is not null then
    select * into v_av from public.mission_avancement(v_id);
    -- Fermeture automatique : plus rien à vérifier, plus rien à appeler.
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
     order by s.total_connu asc nulls last
     limit 1;
    if v_id is not null then
      update public.secteurs
         set assignee = auth.uid(), etat = 'en_cours', ouverte_le = now()
       where secteurs.id = v_id;
    end if;
  end if;

  if v_id is null then return; end if;

  select * into v_av from public.mission_avancement(v_id);
  return query
    select s.id, s.metier, s.commune, s.total_connu,
           v_av.verifies, v_av.cibles, v_av.appelees, s.etat
      from public.secteurs s where s.id = v_id;
end;
$$;

grant execute on function public.mission_courante() to authenticated;

/** Territoires conquis, pour la carte de France. */
create or replace function public.carte_conquetes()
returns table (
  commune text, metier text, lat double precision, lng double precision,
  par text, conquise_le timestamptz, etat text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.commune, s.metier, s.lat, s.lng,
         coalesce(nullif(split_part(pr.full_name, ' ', 1), ''), 'équipe'),
         s.conquise_le, s.etat
    from public.secteurs s
    left join public.profiles pr on pr.id = s.assignee
   where s.etat in ('en_cours', 'conquise') and s.lat is not null
   order by s.conquise_le desc nulls last;
$$;

grant execute on function public.carte_conquetes() to authenticated;
