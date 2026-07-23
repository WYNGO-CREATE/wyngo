-- Multi-pages : pages additionnelles d'un site (la page d'accueil reste
-- client_sites.html). Chaque page a son slug d'URL et son HTML.
create table if not exists public.site_pages (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.client_sites(id) on delete cascade,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  slug       text not null,
  html       text,
  position   int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug)
);
alter table public.site_pages enable row level security;

-- Accès équipe (même politique que le reste du workspace partagé)
do $$ begin
  create policy "site_pages_team_select" on public.site_pages for select to authenticated using (public.is_team_member());
  create policy "site_pages_team_insert" on public.site_pages for insert to authenticated with check (public.is_team_member());
  create policy "site_pages_team_update" on public.site_pages for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
  create policy "site_pages_team_delete" on public.site_pages for delete to authenticated using (public.is_team_member());
exception when duplicate_object then null; end $$;

create index if not exists idx_site_pages_site on public.site_pages(site_id, position);
