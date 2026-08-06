-- ─── Savoir si le client est déjà venu ───────────────────────────────
--
-- Le Studio annonce « en attente de première connexion » ou « déjà connecté »,
-- mais la colonne premiere_connexion n'était jamais remplie : l'agence lisait
-- donc toujours « en attente », même pour un client venu dix fois.
--
-- mon_site() est appelée à chaque ouverture de l'espace : c'est l'endroit
-- naturel pour horodater le premier passage.

create or replace function public.mon_site()
returns table (
  site_id uuid, titre text, slug text, domaine text, url_publique text,
  etape text, echeance date, publie_le timestamptz, statut text, nom_client text,
  maquette_validee_le timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.client_comptes
     set premiere_connexion = coalesce(premiere_connexion, now())
   where user_id = auth.uid() and actif and premiere_connexion is null;

  return query
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
end;
$$;

grant execute on function public.mon_site() to authenticated;
