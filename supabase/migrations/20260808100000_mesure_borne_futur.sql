-- ─── « En ce moment » ne doit jamais compter le futur ────────────────
--
-- mesure_direct() ne posait qu'une borne basse : vu_le > now() - 5 minutes.
-- Une seule ligne horodatée dans le futur — horloge décalée, import de test,
-- reprise de données — et le client lisait « 28 personnes consultent votre
-- site » alors qu'il n'y avait personne. Un chiffre faux affiché en gros est
-- pire qu'un chiffre absent.
--
-- On borne des deux côtés, ici et sur le fil d'activité.

create or replace function public.mesure_direct(p_site uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.mesure_autorise(p_site) then '{}'::jsonb else
    jsonb_build_object(
      'maintenant', (select count(distinct empreinte) from public.site_visites
                      where site_id = p_site
                        and vu_le between now() - interval '5 minutes' and now()),
      'aujourdhui', (select count(distinct empreinte) from public.site_visites
                      where site_id = p_site and vu_le::date = current_date and vu_le <= now()),
      'contacts_aujourdhui', (select count(*) from public.site_visites
                      where site_id = p_site and vu_le::date = current_date and vu_le <= now()
                        and genre in ('telephone','email','formulaire','whatsapp','itineraire')),
      'derniers', coalesce((
        select jsonb_agg(x) from (
          select genre, chemin, titre, appareil,
                 extract(epoch from (now() - vu_le))::bigint as il_y_a_s
            from public.site_visites
           where site_id = p_site
             and genre in ('telephone','email','formulaire','whatsapp','itineraire','page')
             and vu_le between now() - interval '48 hours' and now()
           order by vu_le desc limit 12
        ) x), '[]'::jsonb)
    )
  end;
$$;

grant execute on function public.mesure_direct(uuid) to authenticated;
