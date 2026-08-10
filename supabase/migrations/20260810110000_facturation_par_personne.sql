-- ─── Chacun facture sous son propre nom, avec sa propre série ─────────
--
-- Deux restes de l'époque « un seul utilisateur », trouvés en ouvrant la
-- facturation aux collaborateurs :
--
--   1. la politique `billing_settings_rw` était `using (true)` : tout compte
--      connecté pouvait lire ET modifier l'identité de facturation de tout le
--      monde — SIRET et IBAN compris ;
--
--   2. `document_counters` n'avait pas de propriétaire : les numéros de
--      facture étaient tirés d'un compteur COMMUN. Deux personnes qui
--      facturent le même mois se seraient partagé une seule série, chacune
--      avec des trous dedans. Une série de facturation doit être continue et
--      propre à son émetteur — c'est une exigence fiscale, et c'est ce que
--      l'administration regarde en premier.

-- ══ 1. L'identité de facturation n'appartient qu'à son propriétaire ═══
drop policy if exists "billing_settings_rw" on public.billing_settings;

-- ══ 2. Une série de numéros par personne ══════════════════════════════
alter table public.document_counters
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- Les compteurs existants sont ceux de l'administrateur : c'est lui qui a
-- émis tous les documents jusqu'ici.
update public.document_counters
   set owner_id = (select ur.user_id from public.user_roles ur
                    where ur.role = 'admin' order by ur.created_at limit 1)
 where owner_id is null;

delete from public.document_counters where owner_id is null;

alter table public.document_counters alter column owner_id set not null;

do $$
begin
  if exists (select 1 from pg_constraint
              where conname = 'document_counters_pkey'
                and conrelid = 'public.document_counters'::regclass) then
    alter table public.document_counters drop constraint document_counters_pkey;
  end if;
end $$;

alter table public.document_counters add primary key (owner_id, type, year);

alter table public.document_counters enable row level security;
drop policy if exists "document_counters_rw" on public.document_counters;
drop policy if exists "mes compteurs" on public.document_counters;
create policy "mes compteurs" on public.document_counters
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ══ 3. Le numéro suivant, dans MA série ═══════════════════════════════
--
-- On garde EXACTEMENT la même signature (un seul argument) : l'interface
-- l'appelle déjà ainsi, et créer une surcharge à deux arguments aurait laissé
-- l'ancienne version en place — donc le compteur commun toujours actif.
-- Le format des numéros ne change pas non plus : les documents déjà émis
-- doivent rester cohérents avec ceux qui suivent.
create or replace function public.next_document_number(p_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y      int  := extract(year from now())::int;
  n      int;
  prefix text := case when p_type = 'facture' then 'FAC' else 'DEV' end;
  v_moi  uuid := auth.uid();
begin
  if v_moi is null then
    raise exception 'Non authentifié.';
  end if;

  insert into public.document_counters (owner_id, type, year, last_no)
  values (v_moi, p_type, y, 1)
  on conflict (owner_id, type, year)
    do update set last_no = public.document_counters.last_no + 1
  returning last_no into n;

  return prefix || '-' || y || '-' || lpad(n::text, 4, '0');
end;
$$;

grant execute on function public.next_document_number(text) to authenticated;
