-- Déclarations mensuelles : trace qu'un mois a été déclaré (URSSAF/impôts).
-- Le CA se calcule à la volée depuis les factures ; cette table ne stocke
-- que le "marqué comme déclaré" + un instantané des montants.
create table if not exists public.monthly_declarations (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  period      date not null unique,           -- 1er jour du mois concerné
  declared_at timestamptz not null default now(),
  ca_facture  numeric,
  ca_encaisse numeric,
  tva         numeric,
  notes       text
);
alter table public.monthly_declarations enable row level security;
do $$ begin
  create policy "monthly_decl_team_select" on public.monthly_declarations for select to authenticated using (public.is_team_member());
  create policy "monthly_decl_team_insert" on public.monthly_declarations for insert to authenticated with check (public.is_team_member());
  create policy "monthly_decl_team_update" on public.monthly_declarations for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
  create policy "monthly_decl_team_delete" on public.monthly_declarations for delete to authenticated using (public.is_team_member());
exception when duplicate_object then null; end $$;
