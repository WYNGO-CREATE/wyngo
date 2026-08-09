-- ─── Préparation du 3e appel : celui de la décision ──────────────────
--
-- Le 2e rendez-vous présente. Le 3e décide. Ce n'est pas la même conversation
-- et ça ne se prépare pas pareil.
--
-- Différence essentielle avec le deck du 2e : celui-ci est PARTAGÉ À L'ÉCRAN,
-- donc il ne peut jamais mentionner les hésitations du prospect. La fiche du
-- 3e appel est PRIVÉE — elle sert à Hugo pendant qu'il téléphone. Elle peut
-- donc nommer franchement ce qui bloque, ce qui est exactement ce qu'il faut
-- pour lever un blocage.
--
-- Elle repart du récap du 2e (objectif, objections, budget, décideur, prix
-- annoncé) : on ne redemande jamais ce qu'on sait déjà.

create table if not exists public.closing_preps (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid not null references public.prospects(id) on delete cascade,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  deck_id      uuid references public.pitch_decks(id) on delete set null,

  -- Ce qui s'est passé depuis le 2e rendez-vous. C'est la seule source des
  -- objections : l'IA n'a pas le droit d'en inventer une.
  situation    jsonb not null default '{}'::jsonb,

  -- La fiche produite.
  fiche        jsonb,
  modele       text,
  cree_le      timestamptz not null default now(),
  utilise_le   timestamptz,
  -- Ce qu'il s'est réellement passé au 3e appel, saisi après coup.
  issue        text check (issue in ('signe','a_relancer','refus','reporte')),
  issue_note   text
);

create index if not exists closing_preps_prospect_idx on public.closing_preps (prospect_id, cree_le desc);

alter table public.closing_preps enable row level security;

create policy "closing_preps_proprietaire" on public.closing_preps
  for all to authenticated
  using (owner_id = auth.uid() and not public.est_client())
  with check (owner_id = auth.uid() and not public.est_client());

comment on table public.closing_preps is
  'Fiche privée de préparation du 3e appel (décision). Jamais montrée au prospect.';

/** Ce que l'on sait déjà du prospect et de son 2e rendez-vous. */
create or replace function public.contexte_closing(p_prospect uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'prospect', (select to_jsonb(x) from (
        select p.company, p.first_name, p.last_name, p.industry, p.location,
               p.status, p.notes, p.website
          from public.prospects p where p.id = p_prospect and p.owner_id = auth.uid()
      ) x),
    'deck', (select jsonb_build_object('id', d.id, 'recap', d.recap, 'cree_le', d.created_at,
                                       'envoye_le', d.sent_at)
               from public.pitch_decks d
              where d.prospect_id = p_prospect and d.owner_id = auth.uid()
              order by d.created_at desc limit 1),
    'appels', (select coalesce(jsonb_agg(jsonb_build_object(
                        'le', c.called_at, 'issue', c.outcome, 'note', c.summary)
                        order by c.called_at desc), '[]'::jsonb)
                 from public.call_logs c
                where c.prospect_id = p_prospect limit 6),
    'derniere_prep', (select jsonb_build_object('situation', cp.situation, 'issue', cp.issue)
                        from public.closing_preps cp
                       where cp.prospect_id = p_prospect and cp.owner_id = auth.uid()
                       order by cp.cree_le desc limit 1)
  );
$$;

grant execute on function public.contexte_closing(uuid) to authenticated;
