-- ─── Chacun son périmètre ─────────────────────────────────────────────
--
-- Le CRM a été construit pour une personne, puis ouvert à une équipe. Il
-- restait des endroits qui raisonnaient encore « une seule maison » :
--
--   • le classement listait TOUS les profils actifs — donc aussi les comptes
--     d'espace client et les comptes d'essai. Romain y figurait deux fois et
--     Sylvain n'a jamais prospecté ;
--   • l'identité de facturation était UNIQUE pour tout le monde. Un
--     collaborateur qui émet une facture le faisait sous le SIRET de Hugo ;
--   • n'importe qui pouvait demander le calcul de commission d'un autre.
--
-- On répare les trois.

-- ══ 1. Le classement ne concerne que l'équipe ═════════════════════════
--
-- Un compte d'espace client n'est pas un commercial. Un compte sans rôle non
-- plus. La règle devient explicite : on part de `user_roles`, pas de
-- `profiles` — c'est le rôle qui fait le membre de l'équipe.
create or replace function public.leaderboard_month()
returns table (owner_id uuid, owner_name text, converted_count bigint,
               calls_count bigint, prospects_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select pf.id as owner_id, coalesce(pf.full_name, pf.email) as owner_name
      from public.profiles pf
      join public.user_roles ur on ur.user_id = pf.id
     where pf.is_active
       and ur.role in ('admin', 'collaborator')
       -- Ceinture et bretelles : un compte rattaché à un espace client ne
       -- peut jamais apparaître, même si un rôle lui était donné par erreur.
       and not exists (select 1 from public.client_comptes cc where cc.user_id = pf.id)
  )
  select b.owner_id, b.owner_name,
    (select count(*) from public.prospect_events e
      where e.owner_id = b.owner_id and e.event_type = 'status_changed'
        and (e.payload->>'to') = 'converti'
        and e.created_at >= date_trunc('month', now())),
    (select count(*) from public.call_logs c
      where c.owner_id = b.owner_id and c.called_at >= date_trunc('month', now())),
    (select count(*) from public.prospects p
      where p.owner_id = b.owner_id and p.created_at >= date_trunc('month', now()))
  from base b
  order by 3 desc, 4 desc;
$$;

grant execute on function public.leaderboard_month() to authenticated;

-- ══ 2. La carte de conquête ne montre que l'équipe ════════════════════
-- Un secteur avait été ouvert au nom d'un compte d'essai.
delete from public.secteurs s
 where s.assignee is not null
   and not exists (select 1 from public.user_roles ur
                    where ur.user_id = s.assignee
                      and ur.role in ('admin', 'collaborator'));

-- Et on empêche que ça recommence : on n'invente pas de mission pour
-- quelqu'un qui n'est pas de l'équipe.
create or replace function public.secteur_membre_equipe()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.assignee is not null
     and not exists (select 1 from public.user_roles ur
                      where ur.user_id = new.assignee
                        and ur.role in ('admin', 'collaborator')) then
    raise exception 'Ce compte ne fait pas partie de l''équipe : aucune mission ne peut lui être attribuée.';
  end if;
  return new;
end;
$$;

drop trigger if exists secteur_membre_equipe on public.secteurs;
create trigger secteur_membre_equipe
  before insert or update of assignee on public.secteurs
  for each row execute function public.secteur_membre_equipe();

-- ══ 3. Une identité de facturation PAR personne ═══════════════════════
--
-- `billing_settings` avait une clé primaire booléenne : une seule ligne pour
-- tout le monde. Un collaborateur qui facture Group Arsène — ou n'importe
-- quel autre client — doit le faire sous SES propres nom, SIRET et IBAN.
-- Émettre sous ceux d'un autre n'est pas une facture, c'est un faux.
alter table public.billing_settings
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- La ligne existante est celle de l'administrateur : c'est lui qui l'a
-- remplie et elle porte son SIRET.
update public.billing_settings b
   set owner_id = (select ur.user_id from public.user_roles ur
                    where ur.role = 'admin' order by ur.created_at limit 1)
 where b.owner_id is null;

delete from public.billing_settings where owner_id is null;

alter table public.billing_settings alter column owner_id set not null;

do $$
begin
  if exists (select 1 from pg_constraint
              where conname = 'billing_settings_pkey' and conrelid = 'public.billing_settings'::regclass) then
    alter table public.billing_settings drop constraint billing_settings_pkey;
  end if;
end $$;

alter table public.billing_settings alter column id drop default;
alter table public.billing_settings add primary key (owner_id);

-- Chacun ne voit et ne modifie que la sienne.
drop policy if exists "billing_settings_admin_all"  on public.billing_settings;
drop policy if exists "billing_settings_owner_all"  on public.billing_settings;
drop policy if exists "billing_settings_read"       on public.billing_settings;
drop policy if exists "billing_settings_all"        on public.billing_settings;
create policy "mon identite de facturation" on public.billing_settings
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ══ 4. Personne ne calcule la commission d'un autre ═══════════════════
--
-- `prestataire_commissions` est SECURITY DEFINER : sans garde, un
-- collaborateur pouvait passer l'identifiant d'un collègue et lire son
-- chiffre d'affaires.
create or replace function public.prestataire_commissions(p_prestataire uuid, p_periode text)
returns table (
  document_id uuid, client text, numero text,
  date_ref date, montant_ht numeric, commission numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.prestataires p
                where p.id = p_prestataire and p.user_id = auth.uid())
  ) then
    raise exception 'Accès refusé.';
  end if;

  return query
  with p as (
    select pr.user_id, pr.commission_pct, pr.base_commission
      from public.prestataires pr where pr.id = p_prestataire
  )
  select d.id,
         coalesce(d.client_name, pros.company, '—'),
         d.number,
         (case when p.base_commission = 'facture_payee'
               then d.paid_at else d.issue_date::timestamptz end)::date,
         d.total_ht,
         round(d.total_ht * coalesce(p.commission_pct, 0) / 100, 2)
    from public.documents d
    join p on true
    join public.prospects pros on pros.id = d.prospect_id
   where d.type = 'facture'
     and pros.owner_id = p.user_id
     and p.user_id is not null
     and (
          (p.base_commission = 'facture_payee'
             and d.status = 'paye' and d.paid_at is not null
             and to_char(d.paid_at, 'YYYY-MM') = p_periode)
       or (p.base_commission = 'facture_emise'
             and d.status in ('envoye', 'paye')
             and to_char(d.issue_date, 'YYYY-MM') = p_periode)
     )
   order by 4;
end;
$$;

grant execute on function public.prestataire_commissions(uuid, text) to authenticated;

-- ══ 5. Ce qu'un collaborateur gagne, vu de son côté ═══════════════════
--
-- Il ne pilote pas l'entreprise : il gagne sa vie. Cet écran remplace le
-- Pilotage chez lui — le mois en cours, l'année, et d'où vient l'argent.
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

  -- Ce que rapporte le mois en cours, d'après le contrat de prestation.
  select coalesce(sum(commission), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'client', client, 'numero', numero,
           'date', date_ref, 'base', montant_ht, 'commission', commission)), '[]'::jsonb)
    into v_mois, v_affaires
    from public.prestataire_commissions(v_presta.id, p_periode);

  -- Ce qui a déjà été facturé et réglé sur l'année.
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
      'denomination', v_presta.denomination,
      'nature', v_presta.nature,
      'commission_pct', v_presta.commission_pct,
      'base_commission', v_presta.base_commission,
      'mandat_signe_le', v_presta.mandat_signe_le,
      'mandat_token', v_presta.mandat_token
    ),
    'mois', v_mois,
    'affaires', v_affaires,
    'annee_encaisse', v_annee,
    'en_attente', v_attente
  );
end;
$$;

grant execute on function public.mes_revenus(text) to authenticated;
