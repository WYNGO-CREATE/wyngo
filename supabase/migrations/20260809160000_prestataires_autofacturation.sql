-- ─── Facturer les prestataires en autofacturation ─────────────────────
--
-- Lenny, Ilyes et Lucas prospectent ; Nino développe. Tous les quatre sont
-- en entreprise individuelle : ce sont des prestataires, pas des salariés.
-- C'est donc EUX qui doivent émettre une facture à Group Arsène.
--
-- Sauf qu'un commercial en début d'activité n'émet pas sa facture le 3 du
-- mois, et court après le calcul de sa commission. L'article 289, I-2 du CGI
-- prévoit exactement ce cas : le CLIENT peut établir la facture au nom et
-- pour le compte de son fournisseur. C'est l'autofacturation.
--
-- Trois conditions, et elles sont toutes portées par ce schéma :
--   1. un MANDAT DE FACTURATION écrit, signé par le prestataire AVANT la
--      première facture → `mandat_signe_le`, et un déclencheur qui refuse
--      d'émettre sans lui ;
--   2. la facture est émise au nom du prestataire, avec SES mentions à lui
--      (dénomination + « EI », SIRET, régime de TVA) ;
--   3. le prestataire doit pouvoir CONTESTER → statut `contestee` et lien
--      de validation personnel.
--
-- La numérotation est celle du PRESTATAIRE, pas celle de Group Arsène :
-- séquentielle, sans trou, propre à chacun. C'est son chiffre d'affaires
-- qu'elle retrace, pas le nôtre.

-- ── Qui sont-ils ──
create table if not exists public.prestataires (
  id              uuid primary key default gen_random_uuid(),
  -- Lien vers le compte CRM quand il existe : c'est ce qui permet de
  -- retrouver les affaires qu'il a apportées. Nullable : on peut facturer
  -- quelqu'un qui n'a pas de compte.
  user_id         uuid unique references auth.users(id) on delete set null,

  nom_complet     text not null,
  -- Depuis le 15 mai 2022, la dénomination d'un entrepreneur individuel
  -- doit comporter « EI » ou « Entrepreneur Individuel ». Sans ça, la
  -- facture est irrégulière.
  denomination    text not null,
  siret           text,
  adresse         text,
  code_postal     text,
  ville           text,
  email           text not null,
  iban            text,
  bic             text,

  -- « franchise » = TVA non applicable, art. 293 B du CGI (le cas des quatre
  -- aujourd'hui). « reel » = TVA facturée, numéro intracommunautaire requis.
  regime_tva      text not null default 'franchise'
                    check (regime_tva in ('franchise', 'reel')),
  taux_tva        numeric not null default 20,
  tva_numero      text,

  nature          text not null default 'prospection'
                    check (nature in ('prospection', 'developpement')),

  -- Prospection : un pourcentage du montant HT des affaires apportées.
  commission_pct  numeric check (commission_pct >= 0 and commission_pct <= 100),
  -- On commissionne sur ce qui est ENCAISSÉ par défaut : on ne paie pas une
  -- commission sur une facture client qui ne sera jamais réglée.
  base_commission text not null default 'facture_payee'
                    check (base_commission in ('facture_payee', 'facture_emise')),

  -- Le mandat de facturation. Tant qu'il n'est pas signé, aucune facture
  -- ne peut être émise (cf. déclencheur plus bas).
  mandat_token     text unique default encode(extensions.gen_random_bytes(16), 'hex'),
  mandat_signe_le  timestamptz,
  mandat_signe_par text,
  mandat_ip        text,

  actif      boolean not null default true,
  cree_le    timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

comment on column public.prestataires.denomination is
  'Doit contenir « EI » ou « Entrepreneur Individuel » — obligation légale depuis le 15/05/2022.';

-- ── Leur numérotation, une série par personne et par année ──
create table if not exists public.prestataire_compteurs (
  prestataire_id uuid not null references public.prestataires(id) on delete cascade,
  annee          int  not null,
  dernier_no     int  not null default 0,
  primary key (prestataire_id, annee)
);

-- ── Les factures ──
create table if not exists public.prestataire_factures (
  id             uuid primary key default gen_random_uuid(),
  prestataire_id uuid not null references public.prestataires(id) on delete cascade,

  -- Attribué seulement à l'émission : un brouillon qui consommerait un
  -- numéro laisserait un trou dans la série s'il était supprimé.
  numero    text,
  periode   text not null,               -- '2026-08'

  statut    text not null default 'brouillon'
              check (statut in ('brouillon', 'emise', 'validee', 'contestee', 'payee')),

  lignes    jsonb not null default '[]'::jsonb,
  total_ht  numeric not null default 0,
  total_tva numeric not null default 0,
  total_ttc numeric not null default 0,

  emise_le            timestamptz,
  vue_le              timestamptz,
  validee_le          timestamptz,
  contestee_le        timestamptz,
  motif_contestation  text,
  payee_le            timestamptz,
  ip_reponse          text,

  -- Le lien personnel envoyé au prestataire pour valider ou contester.
  token   text unique not null default encode(extensions.gen_random_bytes(16), 'hex'),

  cree_le    timestamptz not null default now(),
  modifie_le timestamptz not null default now(),

  -- Un mois ne se facture qu'une fois par personne.
  unique (prestataire_id, periode)
);

create index if not exists prestataire_factures_statut_idx
  on public.prestataire_factures (prestataire_id, periode desc);

-- ── Le numéro suivant, sans trou ──
create or replace function public.prestataire_numero_suivant(p_prestataire uuid, p_annee int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_no int;
begin
  insert into public.prestataire_compteurs (prestataire_id, annee, dernier_no)
  values (p_prestataire, p_annee, 1)
  on conflict (prestataire_id, annee)
    do update set dernier_no = public.prestataire_compteurs.dernier_no + 1
  returning dernier_no into v_no;

  return p_annee::text || '-' || lpad(v_no::text, 4, '0');
end;
$$;

-- ── Le garde-fou : pas de mandat, pas de facture ──
--
-- C'est LA condition qui rend l'autofacturation régulière. Elle ne doit pas
-- dépendre du fait que l'interface pense à la vérifier : émettre une facture
-- au nom de quelqu'un sans son mandat, c'est une facture de complaisance.
create or replace function public.prestataire_facture_garde_fou()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_mandat timestamptz; v_denom text;
begin
  if new.statut = 'brouillon' then
    return new;                       -- un brouillon n'engage rien
  end if;

  select mandat_signe_le, denomination into v_mandat, v_denom
    from public.prestataires where id = new.prestataire_id;

  if v_mandat is null then
    raise exception
      'Mandat de facturation non signé : impossible d''émettre une facture au nom de ce prestataire (art. 289, I-2 du CGI).';
  end if;

  if v_denom !~* '(\mEI\M|entrepreneur individuel)' then
    raise exception
      'La dénomination « % » doit comporter « EI » ou « Entrepreneur Individuel » (obligatoire depuis le 15/05/2022).', v_denom;
  end if;

  -- Le numéro s'attribue au moment exact de l'émission.
  if new.numero is null then
    new.numero := public.prestataire_numero_suivant(
                    new.prestataire_id,
                    extract(year from coalesce(new.emise_le, now()))::int);
  end if;
  if new.emise_le is null then
    new.emise_le := now();
  end if;

  return new;
end;
$$;

drop trigger if exists prestataire_facture_garde_fou on public.prestataire_factures;
create trigger prestataire_facture_garde_fou
  before insert or update of statut on public.prestataire_factures
  for each row execute function public.prestataire_facture_garde_fou();

-- ── Une facture émise ne se réécrit plus ──
-- Les montants et le numéro d'une facture émise sont figés : c'est une pièce
-- comptable. Seul le suivi (vue, validée, contestée, payée) continue de bouger.
create or replace function public.prestataire_facture_figee()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.statut <> 'brouillon' then
    if new.lignes is distinct from old.lignes
       or new.total_ht is distinct from old.total_ht
       or new.numero  is distinct from old.numero
       or new.periode is distinct from old.periode then
      raise exception 'Facture % déjà émise : ses montants et son numéro ne peuvent plus changer.',
                      coalesce(old.numero, '(sans numéro)');
    end if;
  end if;
  new.modifie_le := now();
  return new;
end;
$$;

drop trigger if exists prestataire_facture_figee on public.prestataire_factures;
create trigger prestataire_facture_figee
  before update on public.prestataire_factures
  for each row execute function public.prestataire_facture_figee();

-- ── Ce que le prestataire a apporté sur la période ──
--
-- La chaîne d'attribution : la facture client porte un prospect, et ce
-- prospect appartient à celui qui l'a trouvé. C'est lui qu'on commissionne.
create or replace function public.prestataire_commissions(p_prestataire uuid, p_periode text)
returns table (
  document_id uuid,
  client      text,
  numero      text,
  date_ref    date,
  montant_ht  numeric,
  commission  numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with p as (
    select user_id, commission_pct, base_commission
      from public.prestataires where id = p_prestataire
  )
  select d.id,
         coalesce(d.client_name, pr.company, '—'),
         d.number,
         (case when p.base_commission = 'facture_payee'
               then d.paid_at else d.issue_date::timestamptz end)::date,
         d.total_ht,
         round(d.total_ht * coalesce(p.commission_pct, 0) / 100, 2)
    from public.documents d
    join p on true
    join public.prospects pr on pr.id = d.prospect_id
   where d.type = 'facture'
     and pr.owner_id = p.user_id
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
$$;

-- ── Qui voit quoi ──
alter table public.prestataires           enable row level security;
alter table public.prestataire_factures   enable row level security;
alter table public.prestataire_compteurs  enable row level security;

-- Seul l'administrateur gère les prestataires. Un collaborateur n'a pas à
-- voir le SIRET, l'IBAN ni la commission de ses collègues — et surtout pas
-- la sienne sous une forme modifiable.
drop policy if exists "admin gere les prestataires" on public.prestataires;
create policy "admin gere les prestataires" on public.prestataires
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin gere les factures prestataires" on public.prestataire_factures;
create policy "admin gere les factures prestataires" on public.prestataire_factures
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin lit les compteurs" on public.prestataire_compteurs;
create policy "admin lit les compteurs" on public.prestataire_compteurs
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Chacun peut lire SA propre fiche (pour vérifier ce qui est enregistré),
-- sans jamais pouvoir la modifier.
drop policy if exists "je lis ma fiche prestataire" on public.prestataires;
create policy "je lis ma fiche prestataire" on public.prestataires
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "je lis mes factures" on public.prestataire_factures;
create policy "je lis mes factures" on public.prestataire_factures
  for select to authenticated
  using (exists (select 1 from public.prestataires p
                  where p.id = prestataire_id and p.user_id = auth.uid()));
