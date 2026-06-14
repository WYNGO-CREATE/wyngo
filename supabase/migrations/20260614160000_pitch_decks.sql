-- ─── Présentations de vente (2e RDV) ──────────────────────────────────
-- Deck de 3-4 diapos adapté au prospect, chiffres sourcés (jamais inventés),
-- mockup de son futur site inclus.

create table if not exists public.pitch_decks (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  prospect_id  uuid not null references public.prospects(id) on delete cascade,
  headline     text,
  slides       jsonb not null default '[]'::jsonb,
  preview_slug text,                  -- slug de l'aperçu du site (mockup)
  model        text,
  created_at   timestamptz not null default now()
);

create index if not exists pitch_decks_prospect_idx on public.pitch_decks(prospect_id, created_at desc);

alter table public.pitch_decks enable row level security;
drop policy if exists "pitch_decks_owner_all" on public.pitch_decks;
create policy "pitch_decks_owner_all" on public.pitch_decks
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
