-- ─── Fuite : l'identité de facturation était encore lisible par tous ──
--
-- Le test de cloisonnement (compte collaborateur jetable) a montré qu'un
-- collaborateur voyait la fiche de facturation de Hugo — donc son SIRET et
-- son IBAN. La politique ouverte `billing_settings_rw` avait bien été
-- supprimée, mais une AUTRE politique héritée restait en place.
--
-- On ne devine pas laquelle : on les supprime TOUTES, puis on n'en recrée
-- qu'une. Énumérer les politiques à la main, c'est exactement comme ça qu'on
-- en oublie une.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'billing_settings'
  loop
    execute format('drop policy if exists %I on public.billing_settings', pol.policyname);
  end loop;
end $$;

alter table public.billing_settings enable row level security;

create policy "mon identite de facturation" on public.billing_settings
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Même traitement pour les compteurs de numéros : ils disent combien de
-- factures chacun a émises, ce qui est déjà une information de chiffre.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'document_counters'
  loop
    execute format('drop policy if exists %I on public.document_counters', pol.policyname);
  end loop;
end $$;

alter table public.document_counters enable row level security;

create policy "mes compteurs" on public.document_counters
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
