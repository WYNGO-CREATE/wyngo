-- ─── Contrats de prestation (Wyngo) ──────────────────────────────────
-- Deux types distincts : 'creation' (site web, prestation ponctuelle) et
-- 'abonnement' (référencement/maintenance récurrent). Le corps du contrat
-- (clauses) est GELÉ dans `body` à la génération : le texte signé est
-- immuable (valeur probante). Signature électronique via share_token
-- (même mécanique que les devis) OU signature papier (marquée à la main).
create table if not exists public.contracts (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  prospect_id   uuid references public.prospects(id) on delete set null,
  kind          text not null check (kind in ('creation','abonnement')),
  number        text,
  title         text,
  status        text not null default 'brouillon'
    check (status in ('brouillon','envoye','signe','refuse','annule')),

  -- Snapshot client (gelé sur le contrat)
  client_name        text,
  client_address     text,
  client_postal_code text,
  client_city        text,
  client_siret       text,
  client_email       text,
  client_is_pro      boolean not null default true,

  -- Paramètres saisis (prix, acompte, délai, durée, préavis…)
  params        jsonb not null default '{}'::jsonb,
  -- Corps gelé : { title, sections:[{h, p:[...]}] }
  body          jsonb not null default '{}'::jsonb,

  -- Partage / signature (calqué sur documents)
  share_token   uuid not null default gen_random_uuid(),
  viewed_at     timestamptz,
  sent_at       timestamptz,
  signed_at     timestamptz,
  signed_by_name text,
  signer_ip     text,
  refused_at    timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists contracts_owner_idx on public.contracts(owner_id);
create index if not exists contracts_prospect_idx on public.contracts(prospect_id);
create unique index if not exists contracts_share_token_idx on public.contracts(share_token);

alter table public.contracts enable row level security;
do $$ begin
  create policy "contracts_team_select" on public.contracts for select to authenticated using (public.is_team_member());
  create policy "contracts_team_insert" on public.contracts for insert to authenticated with check (public.is_team_member());
  create policy "contracts_team_update" on public.contracts for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
  create policy "contracts_team_delete" on public.contracts for delete to authenticated using (public.is_team_member());
exception when duplicate_object then null; end $$;
