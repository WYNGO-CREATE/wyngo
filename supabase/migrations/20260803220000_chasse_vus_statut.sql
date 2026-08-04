-- ─── La mémoire ne doit jamais faire perdre une cible ────────────────
--
-- Défaut de la version précédente : la chasse retenait TOUT ce qu'elle avait
-- montré. Un cabinet sans site web, repéré mais pas encore ajouté au CRM,
-- disparaissait donc des vagues suivantes — exactement la cible qu'il ne faut
-- surtout pas perdre.
--
-- Nouvelle règle : on n'oublie définitivement que ce qui n'est PAS une cible,
-- c'est-à-dire les entreprises dont le site est déjà bon. Tout prospect sans
-- site ou au site obsolète revient tant qu'il n'est pas entré dans le CRM,
-- signalé comme « déjà proposé, jamais retenu ».

alter table public.chasse_vus
  add column if not exists statut_site text;

comment on column public.chasse_vus.statut_site is
  'Verdict du contrôle de site : has_website (écarté définitivement), no_website / outdated (revient tant qu''il n''est pas au CRM), null (pas encore vérifié).';

create index if not exists chasse_vus_statut_idx on public.chasse_vus (statut_site);

-- Le verdict n'est connu qu'APRÈS l'analyse des sites, côté navigateur.
-- Cette fonction permet de le renvoyer en une seule fois.
create or replace function public.chasse_marquer_statuts(lignes jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
begin
  update public.chasse_vus v
     set statut_site = x.statut,
         derniere_vue = now()
    from jsonb_to_recordset(lignes) as x(siren text, statut text)
   where v.siren = x.siren;
  get diagnostics n = row_count;
  return n;
end;
$$;

comment on function public.chasse_marquer_statuts(jsonb) is
  'Enregistre le verdict site de chaque entreprise proposée, pour ne plus jamais reproposer celles qui ont déjà un bon site — et continuer à reproposer les autres.';

revoke all on function public.chasse_marquer_statuts(jsonb) from public;
grant execute on function public.chasse_marquer_statuts(jsonb) to authenticated;
