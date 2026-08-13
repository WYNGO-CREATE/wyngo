-- ─── Les actualités du site vitrine ───────────────────────────────────
--
-- Un article par jour sur grouparsene.fr : la vie d'un cabinet digital, la
-- méthode, ce qu'on observe chez les commerçants et les artisans.
--
-- Pourquoi une table à part de `radar_articles` : ce ne sont pas les mêmes
-- pièces. Le Radar Tech est un média qui parle de tech en général ; ici on
-- parle du métier de l'agence, à la première personne, et ça se lit sur son
-- site à elle. Les mélanger ferait tôt ou tard publier l'un chez l'autre.
--
-- Le flux : l'IA rédige en `brouillon`, Hugo relit, passe en `publie`, le
-- site est regénéré. Jamais de publication sans relecture — une bêtise sur
-- le site de l'agence coûte plus cher que sur un média.
create table if not exists public.site_articles (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  titre        text not null,
  chapo        text not null,              -- le lede, encadré bleu à gauche
  corps        text not null,              -- HTML : h2, h3, p, ul, .card
  categorie    text not null default 'methode'
                 check (categorie in ('methode', 'metier', 'coulisses', 'reperes')),
  seo_desc     text,
  -- Les questions fréquentes servent le balisage FAQPage, que Google lit pour
  -- ses réponses générées. Format : [{ q, r }].
  faq          jsonb not null default '[]'::jsonb,
  statut       text not null default 'brouillon'
                 check (statut in ('brouillon', 'publie', 'retire')),
  publie_le    timestamptz,
  cree_le      timestamptz not null default now(),
  modifie_le   timestamptz not null default now()
);

create index if not exists site_articles_publies_idx
  on public.site_articles (statut, publie_le desc);

alter table public.site_articles enable row level security;

-- Lecture publique des seuls articles publiés : le site est statique, mais
-- l'écran de relecture, lui, lit la base.
drop policy if exists "articles publies lisibles" on public.site_articles;
create policy "articles publies lisibles" on public.site_articles
  for select to anon, authenticated
  using (statut = 'publie');

drop policy if exists "admin gere les articles" on public.site_articles;
create policy "admin gere les articles" on public.site_articles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.site_articles_touche()
returns trigger language plpgsql as $$
begin
  new.modifie_le := now();
  -- La date de publication se pose une fois, au passage en ligne.
  if new.statut = 'publie' and new.publie_le is null then
    new.publie_le := now();
  end if;
  return new;
end;
$$;

drop trigger if exists site_articles_touche on public.site_articles;
create trigger site_articles_touche
  before insert or update on public.site_articles
  for each row execute function public.site_articles_touche();
