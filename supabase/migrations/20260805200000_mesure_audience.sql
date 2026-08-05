-- ─── Mesure d'audience des sites clients ─────────────────────────────
--
-- Jusqu'ici les chiffres envoyés aux clients (visites, visiteurs, contacts)
-- étaient SAISIS À LA MAIN dans le Studio. Rien n'était mesuré.
--
-- On installe une mesure de première partie : le script est servi depuis le
-- même domaine que le site, donc aucun bloqueur de publicité ne l'écarte —
-- contrairement à Google Analytics, qui perd couramment 30 à 40 % du trafic.
--
-- ── Pourquoi il n'y aura pas de bandeau cookies ──
-- On ne pose aucun cookie et on ne stocke aucune adresse IP. Un visiteur est
-- identifié par une empreinte calculée côté serveur à partir de son IP, de son
-- navigateur et d'un SEL QUOTIDIEN qui change chaque nuit : impossible de
-- suivre quelqu'un d'un jour sur l'autre, impossible de remonter à la personne.
-- C'est la condition posée par la CNIL pour être dispensé de consentement.
-- C'est aussi un argument de vente : le site du client reste sans bandeau.

-- Le sel du jour. Régénéré à la première mesure de chaque journée, jamais
-- exposé au navigateur.
create table if not exists public.mesure_sel (
  jour date primary key,
  sel  text not null
);
alter table public.mesure_sel enable row level security;
-- Aucune politique : seul le service_role (l'edge function) y touche.

create or replace function public.sel_du_jour()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare s text;
begin
  select sel into s from public.mesure_sel where jour = current_date;
  if s is null then
    s := encode(gen_random_bytes(32), 'hex');
    insert into public.mesure_sel (jour, sel) values (current_date, s)
      on conflict (jour) do nothing;
    select sel into s from public.mesure_sel where jour = current_date;
    -- On ne garde pas les sels passés : sans eux, les empreintes anciennes
    -- ne peuvent plus être rapprochées de quiconque, même par nous.
    delete from public.mesure_sel where jour < current_date - 2;
  end if;
  return s;
end;
$$;

/**
 * Chaque signal reçu d'un site client.
 *
 * `genre` distingue une vue de page d'une intention de contact. Ce sont ces
 * dernières qui intéressent un commerçant : il se moque du nombre de visites,
 * il veut savoir combien de gens ont cliqué sur son numéro.
 */
create table if not exists public.site_visites (
  id            bigserial primary key,
  site_id       uuid not null references public.client_sites(id) on delete cascade,
  vu_le         timestamptz not null default now(),

  empreinte     text not null,        -- visiteur du jour, non réversible
  session       text not null,        -- visite en cours (généré côté navigateur)

  genre         text not null default 'page'
                check (genre in ('page','telephone','email','itineraire','formulaire',
                                 'whatsapp','lien_sortant','profondeur','sortie')),
  chemin        text not null default '/',
  titre         text,

  -- Provenance
  referent      text,                 -- domaine seulement, jamais l'URL complète
  utm_source    text,
  utm_medium    text,
  utm_campagne  text,

  -- Contexte, déduit de l'en-tête du navigateur et de Cloudflare
  appareil      text,                 -- mobile · tablette · ordinateur
  navigateur    text,
  systeme       text,
  pays          text,
  region        text,
  ville         text,

  duree_s       integer,              -- sur les signaux de sortie
  profondeur    integer,              -- % de page atteint
  detail        jsonb
);

create index if not exists site_visites_site_date_idx on public.site_visites (site_id, vu_le desc);
create index if not exists site_visites_genre_idx     on public.site_visites (site_id, genre, vu_le desc);
create index if not exists site_visites_empreinte_idx on public.site_visites (site_id, empreinte, vu_le);

alter table public.site_visites enable row level security;

-- L'agence voit les sites qu'elle gère. Le client verra les siens via une
-- politique ajoutée avec les comptes clients.
create policy "visites_agence" on public.site_visites
  for select to authenticated
  using (exists (select 1 from public.client_sites s
                  where s.id = site_visites.site_id and s.owner_id = auth.uid()));

comment on table public.site_visites is
  'Mesure d''audience de première partie : sans cookie, sans IP conservée, empreinte visiteur renouvelée chaque nuit.';

/**
 * Purge des données anciennes.
 *
 * Treize mois : de quoi comparer un mois à celui de l'an dernier, pas un jour
 * de plus. Conserver au-delà n'apporterait rien au client et alourdirait la
 * base autant que notre responsabilité.
 */
create or replace function public.mesure_purge()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  delete from public.site_visites where vu_le < now() - interval '13 months';
  get diagnostics n = row_count;
  return n;
end;
$$;
