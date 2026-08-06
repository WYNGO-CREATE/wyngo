-- ─── La validation de maquette passe dans l'espace client ────────────
--
-- Le portail public savait faire une chose que l'espace ne savait pas : le
-- client y validait sa maquette d'un bouton, à l'étape « Validation ». C'est
-- un jalon du chantier, pas un détail — sans lui, on ne sait pas si le client
-- a dit oui.
--
-- On le déplace dans l'espace avant de retirer le portail.

drop function if exists public.mon_site();

create function public.mon_site()
returns table (
  site_id uuid, titre text, slug text, domaine text, url_publique text,
  etape text, echeance date, publie_le timestamptz, statut text, nom_client text,
  maquette_validee_le timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.title, s.slug, s.custom_domain,
         coalesce(
           nullif(s.site_externe_url, ''),
           case when s.custom_domain is not null and s.domain_status = 'live'
                then 'https://' || s.custom_domain
                when s.slug is not null then '/p/' || s.slug end),
         s.production_stage, s.deadline, s.published_at, s.status, c.nom,
         s.maquette_validated_at
    from public.client_comptes c
    join public.client_sites s on s.id = c.site_id
   where c.user_id = auth.uid() and c.actif
   limit 1;
$$;

grant execute on function public.mon_site() to authenticated;

/** Le client valide sa maquette. Irréversible de son côté : c'est un accord. */
create or replace function public.espace_valider_maquette()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site uuid; v_owner uuid; v_quand timestamptz;
begin
  select s.id, s.owner_id into v_site, v_owner
    from public.client_comptes c
    join public.client_sites s on s.id = c.site_id
   where c.user_id = auth.uid() and c.actif
   limit 1;

  if v_site is null then raise exception 'Aucun espace rattaché à ce compte'; end if;

  update public.client_sites
     set maquette_validated_at = coalesce(maquette_validated_at, now())
   where id = v_site
   returning maquette_validated_at into v_quand;

  -- L'agence doit le voir sans avoir à surveiller : on l'écrit dans le fil.
  insert into public.portal_messages (site_id, owner_id, author, body)
  values (v_site, v_owner, 'client', 'J''ai validé la maquette. ✅');

  return v_quand;
end;
$$;

grant execute on function public.espace_valider_maquette() to authenticated;
