-- ─── Chacun renseigne ses propres informations légales ────────────────
--
-- Hugo saisissait à la main le SIRET, l'adresse et l'IBAN de ses quatre
-- prestataires. Ce sont des informations qu'ils sont seuls à connaître
-- exactement — et une faute de frappe sur un IBAN, c'est un virement perdu,
-- sur un SIRET, c'est une facture irrégulière.
--
-- Ils peuvent donc les remplir eux-mêmes. Mais PAS n'importe lesquelles :
-- une politique de mise à jour classique laisserait un collaborateur
-- augmenter son propre pourcentage de commission. On passe par une fonction
-- qui n'écrit QUE les champs d'identité, et rien d'autre.
create or replace function public.maj_mes_infos_prestataire(
  p_denomination text,
  p_siret        text,
  p_adresse      text,
  p_code_postal  text,
  p_ville        text,
  p_iban         text,
  p_bic          text,
  p_regime_tva   text default null,
  p_tva_numero   text default null
)
returns public.prestataires
language plpgsql
security definer
set search_path = public
as $$
declare v_ligne public.prestataires;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié.';
  end if;

  if p_regime_tva is not null and p_regime_tva not in ('franchise', 'reel') then
    raise exception 'Régime de TVA inconnu.';
  end if;

  update public.prestataires p
     set denomination = coalesce(nullif(trim(p_denomination), ''), p.denomination),
         siret        = nullif(trim(p_siret), ''),
         adresse      = nullif(trim(p_adresse), ''),
         code_postal  = nullif(trim(p_code_postal), ''),
         ville        = nullif(trim(p_ville), ''),
         iban         = nullif(replace(upper(trim(p_iban)), ' ', ''), ''),
         bic          = nullif(replace(upper(trim(p_bic)), ' ', ''), ''),
         regime_tva   = coalesce(p_regime_tva, p.regime_tva),
         tva_numero   = nullif(trim(p_tva_numero), ''),
         modifie_le   = now()
   -- Le pourcentage de commission, la nature de la prestation, le compte
   -- rattaché et le mandat ne figurent VOLONTAIREMENT pas dans cette liste :
   -- ils relèvent de l'accord entre les parties, pas d'un formulaire.
   where p.user_id = auth.uid()
  returning p.* into v_ligne;

  if v_ligne.id is null then
    raise exception 'Aucune fiche prestataire n''est rattachée à votre compte.';
  end if;

  return v_ligne;
end;
$$;

grant execute on function public.maj_mes_infos_prestataire(
  text, text, text, text, text, text, text, text, text) to authenticated;

-- `mes_revenus` doit renvoyer ces champs pour que l'écran puisse les afficher
-- et dire ce qui manque encore.
create or replace function public.mes_revenus(p_periode text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_presta   public.prestataires;
  v_mois     numeric := 0;
  v_annee    numeric := 0;
  v_attente  numeric := 0;
  v_affaires jsonb   := '[]'::jsonb;
begin
  select * into v_presta from public.prestataires where user_id = auth.uid();

  if v_presta.id is null then
    return jsonb_build_object('contrat', null);
  end if;

  select coalesce(sum(commission), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'client', client, 'numero', numero,
           'date', date_ref, 'base', montant_ht, 'commission', commission)), '[]'::jsonb)
    into v_mois, v_affaires
    from public.prestataire_commissions(v_presta.id, p_periode);

  select coalesce(sum(total_ttc), 0) into v_annee
    from public.prestataire_factures
   where prestataire_id = v_presta.id
     and statut = 'payee'
     and periode like left(p_periode, 4) || '%';

  select coalesce(sum(total_ttc), 0) into v_attente
    from public.prestataire_factures
   where prestataire_id = v_presta.id
     and statut in ('emise', 'validee');

  return jsonb_build_object(
    'contrat', jsonb_build_object(
      'id', v_presta.id,
      'nom_complet', v_presta.nom_complet,
      'denomination', v_presta.denomination,
      'nature', v_presta.nature,
      'commission_pct', v_presta.commission_pct,
      'base_commission', v_presta.base_commission,
      'mandat_signe_le', v_presta.mandat_signe_le,
      'mandat_token', v_presta.mandat_token,
      'siret', v_presta.siret,
      'adresse', v_presta.adresse,
      'code_postal', v_presta.code_postal,
      'ville', v_presta.ville,
      'iban', v_presta.iban,
      'bic', v_presta.bic,
      'regime_tva', v_presta.regime_tva,
      'tva_numero', v_presta.tva_numero
    ),
    'mois', v_mois,
    'affaires', v_affaires,
    'annee_encaisse', v_annee,
    'en_attente', v_attente
  );
end;
$$;

grant execute on function public.mes_revenus(text) to authenticated;
