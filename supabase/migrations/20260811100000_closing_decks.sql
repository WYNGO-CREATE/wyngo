-- ─── Les diapositives du 3e appel ─────────────────────────────────────
--
-- Le 2e rendez-vous présente, le 3e décide — et jusqu'ici le 3e n'avait
-- qu'une fiche PRIVÉE. Il lui manquait ce qu'on met à l'écran.
--
-- Table distincte de `pitch_decks` volontairement : ce n'est pas la même
-- pièce, elle ne se régénère pas au même moment, et surtout elle n'a pas le
-- même risque. Les mélanger, c'est prendre le risque d'afficher un jour la
-- mauvaise au mauvais rendez-vous.
create table if not exists public.closing_decks (
  id          uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,

  -- Le contenu des diapos. Les prix et les délais n'y sont PAS écrits par le
  -- modèle : ils sont recopiés depuis `_shared/offre.ts` après coup.
  diapos            jsonb not null default '{}'::jsonb,
  options_retenues  text[] not null default '{}',

  modele    text,
  cree_le   timestamptz not null default now(),
  montre_le timestamptz,
  issue     text check (issue in ('signe', 'a_relancer', 'reporte', 'refus'))
);

create index if not exists closing_decks_prospect_idx
  on public.closing_decks (prospect_id, cree_le desc);

alter table public.closing_decks enable row level security;

drop policy if exists "mes decks de closing" on public.closing_decks;
create policy "mes decks de closing" on public.closing_decks
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
