-- ─── Le Radar Tech — média/blog (articles) ───────────────────────────
-- Lecture publique des articles publiés (SEO). Écriture réservée à l'équipe.
create table if not exists public.radar_articles (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  kicker       text,                       -- surtitre / genre (Enquête, Outils…)
  category     text default 'tech'
    check (category in ('tech','outils','ia','medias','internet','enquetes','wyngo')),
  standfirst   text,                        -- chapô
  body         text,                        -- corps HTML
  cover_url    text,
  author       text not null default 'La rédaction',
  status       text not null default 'brouillon' check (status in ('brouillon','publie')),
  featured     boolean not null default false,   -- article de une
  seo_description text,
  views        integer not null default 0,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists radar_articles_pub_idx on public.radar_articles(status, published_at desc);
create index if not exists radar_articles_cat_idx on public.radar_articles(category, published_at desc);

alter table public.radar_articles enable row level security;
do $$ begin
  -- Lecture publique (anon + authenticated) des articles publiés uniquement
  create policy "radar_public_read" on public.radar_articles for select
    to anon, authenticated using (status = 'publie');
  -- L'équipe voit tout et gère tout
  create policy "radar_team_read" on public.radar_articles for select
    to authenticated using (public.is_team_member());
  create policy "radar_team_insert" on public.radar_articles for insert
    to authenticated with check (public.is_team_member());
  create policy "radar_team_update" on public.radar_articles for update
    to authenticated using (public.is_team_member()) with check (public.is_team_member());
  create policy "radar_team_delete" on public.radar_articles for delete
    to authenticated using (public.is_team_member());
exception when duplicate_object then null; end $$;

-- Incrément atomique des vues (appelé côté public)
create or replace function public.radar_bump_views(a_slug text)
returns void language sql security definer set search_path = public as $$
  update public.radar_articles set views = views + 1 where slug = a_slug and status = 'publie';
$$;

-- Seed : quelques articles de démarrage (dont un "carnet Wyngo" naturel)
insert into public.radar_articles (slug, title, kicker, category, standfirst, body, author, status, featured, published_at)
values
 ('europe-outils-numeriques', 'L''Europe peut-elle encore bâtir ses propres outils numériques ?', 'Enquête', 'enquetes',
  'Face aux géants américains, une génération de studios et d''éditeurs indépendants mise sur la proximité et la souveraineté.',
  '<p>Longtemps, la question a semblé tranchée. Puis une génération de studios indépendants a commencé à reprendre la main…</p><p>De Toulouse à Berlin, ces ateliers misent sur la proximité, la lisibilité du code et la souveraineté des données.</p>',
  'La rédaction', 'publie', true, now()),
 ('cinq-outils-no-code', 'Cinq outils no-code pour lancer un site en un week-end', 'Outils', 'outils',
  'Notre sélection testée pour les indépendants et les petites structures.',
  '<p>Le no-code a mûri. Voici cinq outils qui permettent de publier vite, sans sacrifier la qualité.</p>',
  'La rédaction', 'publie', false, now()),
 ('presence-en-ligne-actif', 'Petites entreprises : la présence en ligne, nouvel actif', 'Internet', 'wyngo',
  'Pourquoi un site soigné devient décisif pour les artisans et commerçants.',
  '<p>Pour un artisan, un site n''est plus une vitrine décorative : c''est un actif qui travaille.</p><p>Des cabinets comme <a href="https://wyngo.fr">Wyngo</a> en ont fait leur métier — concevoir des sites pensés pour être trouvés sur Google et convertir.</p>',
  'La rédaction', 'publie', false, now())
on conflict (slug) do nothing;
