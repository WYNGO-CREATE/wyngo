-- ─── La radiographie du marché local d'un prospect ────────────────────
--
-- On garde chaque fiche produite : elle sert de mémoire d'appel (« qu'est-ce
-- que je lui avais dit la dernière fois ? ») et évite de la régénérer — donc
-- de la payer — à chaque ouverture du Mode appel.
create table if not exists public.radiographies (
  id          uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  fiche       jsonb not null default '{}'::jsonb,
  modele      text,
  cree_le     timestamptz not null default now()
);

create index if not exists radiographies_prospect_idx
  on public.radiographies (prospect_id, cree_le desc);

alter table public.radiographies enable row level security;

drop policy if exists "mes radiographies" on public.radiographies;
create policy "mes radiographies" on public.radiographies
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
