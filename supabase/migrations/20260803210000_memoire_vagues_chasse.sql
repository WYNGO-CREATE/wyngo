-- ─── Mémoire des vagues de chasse ────────────────────────────────────
--
-- Deux manques constatés après la première version :
--
-- 1. La mémoire d'équipe comparait des SIRET exacts. Or depuis que la chasse
--    lit l'établissement LOCAL et non le siège, le SIRET d'une entreprise
--    multi-sites a changé : le même cabinet n'était plus reconnu comme déjà
--    suivi. Le SIREN identifie l'entreprise, c'est lui qui doit faire foi.
--
-- 2. Seuls les prospects IMPORTÉS étaient écartés. Relancer « notaires à Lyon »
--    sans rien importer redonnait exactement la même liste. Il faut donc se
--    souvenir de ce qui a déjà été MONTRÉ, pas seulement de ce qui a été gardé.

create table if not exists public.chasse_vus (
  siren        text primary key,
  premiere_vue timestamptz not null default now(),
  derniere_vue timestamptz not null default now(),
  vu_par       uuid references auth.users(id) on delete set null,
  metier       text,
  zone         text
);

create index if not exists chasse_vus_derniere_vue_idx on public.chasse_vus (derniere_vue desc);

alter table public.chasse_vus enable row level security;

-- Volontairement partagé : la mémoire n'a de sens que si elle vaut pour toute
-- l'équipe. Elle ne contient qu'un SIREN et une date — aucune donnée de
-- prospect, aucune coordonnée.
create policy "chasse_vus_lecture_equipe"
  on public.chasse_vus for select to authenticated using (true);

create policy "chasse_vus_ecriture_equipe"
  on public.chasse_vus for insert to authenticated with check (true);

create policy "chasse_vus_maj_equipe"
  on public.chasse_vus for update to authenticated using (true) with check (true);

comment on table public.chasse_vus is
  'SIREN déjà proposés par la chasse, toute l''équipe confondue. Permet que chaque vague ramène des entreprises nouvelles.';

-- ─── La mémoire d'équipe raisonne désormais en SIREN ──────────────────
drop function if exists public.prospection_memoire(text[]);

create or replace function public.prospection_memoire(sirets text[])
returns table (
  siret        text,
  proprietaire text,
  est_moi      boolean,
  statut       text,
  vu_le        timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  -- On rapproche sur les 9 premiers chiffres : un cabinet reste le même
  -- cabinet, qu'on ait retenu le SIRET de son siège ou celui de son antenne.
  with demandes as (
    select distinct s as siret_demande, left(s, 9) as siren
    from unnest(sirets) as s
    where s is not null and length(s) >= 9
  ),
  connus as (
    select distinct on (left(p.siret, 9))
      left(p.siret, 9) as siren,
      coalesce(nullif(split_part(pr.full_name, ' ', 1), ''), 'un collègue') as proprietaire,
      p.owner_id = auth.uid() as est_moi,
      p.status::text          as statut,
      p.created_at            as vu_le
    from public.prospects p
    left join public.profiles pr on pr.id = p.owner_id
    where p.siret is not null
      and left(p.siret, 9) in (select siren from demandes)
    order by left(p.siret, 9), (p.owner_id = auth.uid()) desc, p.created_at asc
  )
  select d.siret_demande, c.proprietaire, c.est_moi, c.statut, c.vu_le
  from demandes d
  join connus c on c.siren = d.siren;
$$;

comment on function public.prospection_memoire(text[]) is
  'Dit si une entreprise est déjà suivie dans le CRM et par qui, en rapprochant sur le SIREN. N''expose aucune donnée du prospect.';

revoke all on function public.prospection_memoire(text[]) from public;
grant execute on function public.prospection_memoire(text[]) to authenticated;
