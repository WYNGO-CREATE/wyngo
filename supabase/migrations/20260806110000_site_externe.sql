-- ─── Mesurer un site que l'on n'héberge pas ──────────────────────────
--
-- La mesure s'installait uniquement à la publication depuis le Studio. Un
-- client dont le site existe ailleurs — WordPress, Wix, un site fait par
-- quelqu'un d'autre — ne pouvait donc pas être mesuré, et il n'y avait
-- nulle part où saisir son adresse.
--
-- On ajoute l'adresse du site, et de quoi savoir si la mesure y remonte
-- vraiment. Le code à coller, lui, est le même que celui injecté à la
-- publication : c'est le même collecteur.

alter table public.client_sites
  add column if not exists site_externe_url text;

comment on column public.client_sites.site_externe_url is
  'Adresse du site quand il n''est pas hébergé par nous. Le code de mesure est alors à coller à la main dans ses pages.';

/** La mesure remonte-t-elle ? Et depuis quand. */
create or replace function public.mesure_etat(p_site uuid)
returns table (actif boolean, dernier_signal timestamptz, signaux_7j bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.site_visites
             where site_id = p_site and vu_le > now() - interval '7 days'),
    (select max(vu_le) from public.site_visites where site_id = p_site),
    (select count(*) from public.site_visites
      where site_id = p_site and vu_le > now() - interval '7 days')
  where public.mesure_autorise(p_site);
$$;

grant execute on function public.mesure_etat(uuid) to authenticated;
