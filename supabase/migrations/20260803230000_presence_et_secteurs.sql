-- ─── 1. Verrou de présence ───────────────────────────────────────────
--
-- La mémoire de prospection empêche deux collaborateurs de travailler la même
-- entreprise à des jours différents. Elle n'empêche pas qu'ils ouvrent la même
-- fiche à la même minute. À quatre, ça arrivera — et ça se voit côté client.
--
-- Chaque fiche ouverte pose une présence, rafraîchie tant qu'elle reste
-- ouverte. Au-delà de 2 minutes sans signe de vie, elle est considérée comme
-- périmée : pas de verrou fantôme si quelqu'un ferme brutalement son onglet.

create table if not exists public.presences (
  prospect_id uuid primary key references public.prospects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  prenom      text,
  depuis      timestamptz not null default now(),
  vu_le       timestamptz not null default now()
);

create index if not exists presences_vu_le_idx on public.presences (vu_le desc);

alter table public.presences enable row level security;

-- Volontairement visible par toute l'équipe : c'est tout l'intérêt.
-- Ne contient qu'un identifiant de fiche, un prénom et une heure.
create policy "presences_lecture_equipe" on public.presences
  for select to authenticated using (true);
create policy "presences_ecriture" on public.presences
  for insert to authenticated with check (user_id = auth.uid());
create policy "presences_maj" on public.presences
  for update to authenticated using (true) with check (user_id = auth.uid());
create policy "presences_suppression" on public.presences
  for delete to authenticated using (user_id = auth.uid());

/** Signale que je travaille cette fiche, et me dit si quelqu'un y était déjà. */
create or replace function public.presence_signaler(p_prospect uuid)
returns table (occupe_par text, depuis timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prenom text;
begin
  select coalesce(nullif(split_part(full_name, ' ', 1), ''), 'un collègue')
    into v_prenom from public.profiles where id = auth.uid();

  -- Une présence de plus de 2 minutes sans rafraîchissement est morte.
  delete from public.presences where vu_le < now() - interval '2 minutes';

  return query
  select coalesce(nullif(split_part(pr.full_name, ' ', 1), ''), 'un collègue'), p.depuis
    from public.presences p
    left join public.profiles pr on pr.id = p.user_id
   where p.prospect_id = p_prospect and p.user_id <> auth.uid();

  insert into public.presences (prospect_id, user_id, prenom, depuis, vu_le)
  values (p_prospect, auth.uid(), v_prenom, now(), now())
  on conflict (prospect_id) do update
    set vu_le = now(),
        user_id = case when public.presences.user_id = auth.uid()
                       then public.presences.user_id else excluded.user_id end,
        depuis  = case when public.presences.user_id = auth.uid()
                       then public.presences.depuis else now() end;
end;
$$;

grant execute on function public.presence_signaler(uuid) to authenticated;

-- ─── 2. Secteurs de prospection ──────────────────────────────────────
--
-- Un secteur = un métier × une commune. L'API de l'État donne le total réel
-- (99 kinés à Blagnac, 2 365 à Toulouse) : on peut donc afficher une vraie
-- progression, et surtout dire quand un secteur est ÉPUISÉ pour en proposer
-- un autre. La prospection cesse d'être un puits sans fond.

create table if not exists public.secteurs (
  id            uuid primary key default gen_random_uuid(),
  naf           text not null,
  metier        text not null,
  commune_code  text not null,
  commune       text not null,
  total_connu   integer,               -- taille réelle, donnée par l'API
  suggere_a     uuid references auth.users(id) on delete set null,
  cree_le       timestamptz not null default now(),
  unique (naf, commune_code)
);

create index if not exists secteurs_suggere_idx on public.secteurs (suggere_a);

alter table public.secteurs enable row level security;
create policy "secteurs_lecture_equipe" on public.secteurs
  for select to authenticated using (true);
create policy "secteurs_ecriture_equipe" on public.secteurs
  for all to authenticated using (true) with check (true);

comment on table public.secteurs is
  'Territoires de prospection (métier × commune). Suggérés à un collaborateur, jamais imposés.';

/** Avancement d'un secteur, calculé depuis les données déjà présentes. */
create or replace function public.secteurs_avancement()
returns table (
  id           uuid,
  metier       text,
  commune      text,
  suggere_a    uuid,
  suggere_nom  text,
  total_connu  integer,
  verifies     bigint,
  cibles       bigint,
  au_crm       bigint,
  appeles      bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id, s.metier, s.commune, s.suggere_a,
    coalesce(nullif(split_part(pr.full_name, ' ', 1), ''), null) as suggere_nom,
    s.total_connu,
    (select count(*) from public.chasse_vus v
      where v.metier = s.naf and v.zone like s.commune || '%' and v.statut_site is not null),
    (select count(*) from public.chasse_vus v
      where v.metier = s.naf and v.zone like s.commune || '%'
        and v.statut_site in ('no_website', 'outdated')),
    (select count(*) from public.prospects p
      where p.industry = s.metier and p.location ilike '%' || s.commune || '%'),
    (select count(distinct c.prospect_id) from public.call_logs c
      join public.prospects p on p.id = c.prospect_id
      where p.industry = s.metier and p.location ilike '%' || s.commune || '%')
  from public.secteurs s
  left join public.profiles pr on pr.id = s.suggere_a
  order by s.commune, s.metier;
$$;

grant execute on function public.secteurs_avancement() to authenticated;
