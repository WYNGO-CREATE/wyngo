-- ─── Comptes clients ─────────────────────────────────────────────────
--
-- Le client se connecte avec son email et son mot de passe, comme un
-- collaborateur — mais il ne voit que son propre site. Un compte = un site.
--
-- Pourquoi pas un simple lien magique : l'espace montre l'audience réelle du
-- commerce, et demain ses accès. Un lien qui traîne dans une boîte mail
-- transférée exposerait tout ça. Un mot de passe est une friction de plus à la
-- première connexion, et une seule fois.

create table if not exists public.client_comptes (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  site_id     uuid not null references public.client_sites(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  nom         text,
  invite_le   timestamptz not null default now(),
  premiere_connexion timestamptz,
  actif       boolean not null default true
);

create index if not exists client_comptes_site_idx on public.client_comptes (site_id);

alter table public.client_comptes enable row level security;

-- Le client lit sa propre ligne. L'agence lit celles de ses sites.
create policy "comptes_client_soi" on public.client_comptes
  for select to authenticated using (user_id = auth.uid());
create policy "comptes_agence" on public.client_comptes
  for all to authenticated
  using (exists (select 1 from public.client_sites s
                  where s.id = client_comptes.site_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.client_sites s
                       where s.id = client_comptes.site_id and s.owner_id = auth.uid()));

comment on table public.client_comptes is
  'Un compte client = un site. Le client ne voit rien du CRM, seulement son espace.';

/** Suis-je un client (et non un collaborateur de l'agence) ? */
create or replace function public.est_client()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.client_comptes
                  where user_id = auth.uid() and actif);
$$;

/** Mon site, pour l'espace client. */
create or replace function public.mon_site()
returns table (
  site_id uuid, titre text, slug text, domaine text, url_publique text,
  etape text, echeance date, publie_le timestamptz, statut text, nom_client text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.title, s.slug, s.custom_domain,
         case when s.custom_domain is not null and s.domain_status = 'live'
              then 'https://' || s.custom_domain
              when s.slug is not null then '/p/' || s.slug end,
         s.production_stage, s.deadline, s.published_at, s.status, c.nom
    from public.client_comptes c
    join public.client_sites s on s.id = c.site_id
   where c.user_id = auth.uid() and c.actif
   limit 1;
$$;

grant execute on function public.est_client() to authenticated;
grant execute on function public.mon_site()   to authenticated;

-- Le client doit pouvoir lire l'avancement de SON site, sans accéder au CRM.
create policy "sites_lecture_client" on public.client_sites
  for select to authenticated
  using (exists (select 1 from public.client_comptes c
                  where c.site_id = client_sites.id and c.user_id = auth.uid() and c.actif));

-- …et le fil de messages avec l'agence.
do $$ begin
  create policy "messages_client" on public.portal_messages
    for all to authenticated
    using (exists (select 1 from public.client_comptes c
                    where c.site_id = portal_messages.site_id and c.user_id = auth.uid() and c.actif))
    with check (exists (select 1 from public.client_comptes c
                         where c.site_id = portal_messages.site_id and c.user_id = auth.uid() and c.actif));
exception when duplicate_object then null; end $$;
