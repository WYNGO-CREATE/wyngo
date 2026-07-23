-- ─────────────────────────────────────────────────────────────────────
-- Studio : pipeline de production + portail client + rapport mensuel
--   #4  client_sites : étape de production, échéance, point bloquant
--   #5  portail client : token public + fil de messages
--   #3  rapport mensuel : métriques par site + lien public partageable
-- ─────────────────────────────────────────────────────────────────────

-- #4 — Pipeline de production sur les sites clients
alter table public.client_sites
  add column if not exists production_stage text not null default 'brief',
  add column if not exists deadline date,
  add column if not exists blocker text,
  add column if not exists maquette_validated_at timestamptz,
  -- #5 — jeton public du portail client (un par site)
  add column if not exists portal_token text unique;

-- Étapes autorisées (CHECK ajouté à part pour rester idempotent)
do $$ begin
  alter table public.client_sites
    add constraint client_sites_production_stage_chk
    check (production_stage in ('brief','design','review','live','care'));
exception when duplicate_object then null; end $$;

-- Backfill : un jeton portail pour chaque site existant
update public.client_sites
  set portal_token = md5(random()::text || clock_timestamp()::text || id::text)
  where portal_token is null;

-- #5 — Fil de messages du portail client (client ⇄ agence)
create table if not exists public.portal_messages (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.client_sites(id) on delete cascade,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  author     text not null check (author in ('client','agency')),
  body       text not null,
  read_by_agency boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.portal_messages enable row level security;
do $$ begin
  create policy "own portal messages" on public.portal_messages
    for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception when duplicate_object then null; end $$;
create index if not exists idx_portal_messages_site on public.portal_messages(site_id, created_at);

-- #3 — Métriques mensuelles par site (source du rapport)
create table if not exists public.site_metrics (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references public.client_sites(id) on delete cascade,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  period          date not null,                 -- 1er jour du mois concerné
  visits          int default 0,
  unique_visitors int default 0,
  leads           int default 0,                 -- demandes reçues (form + appels)
  google_rating   numeric(2,1),
  google_position int,
  notes           text,
  -- lien public du rapport (généré à l'envoi)
  report_token    text unique,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (site_id, period)
);
alter table public.site_metrics enable row level security;
do $$ begin
  create policy "own site metrics" on public.site_metrics
    for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception when duplicate_object then null; end $$;
create index if not exists idx_site_metrics_site on public.site_metrics(site_id, period desc);
