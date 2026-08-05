-- ─── pgcrypto n'est pas dans le schéma public ────────────────────────
--
-- `gen_random_bytes` vit dans le schéma `extensions` sur Supabase. Avec
-- `set search_path = public`, la fonction ne le trouvait pas et le collecteur
-- de mesure répondait 500 à chaque signal reçu.
--
-- Même piège que `crypt` lors de la création des comptes collaborateurs.

create or replace function public.sel_du_jour()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare s text;
begin
  select sel into s from public.mesure_sel where jour = current_date;
  if s is null then
    s := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.mesure_sel (jour, sel) values (current_date, s)
      on conflict (jour) do nothing;
    select sel into s from public.mesure_sel where jour = current_date;
    delete from public.mesure_sel where jour < current_date - 2;
  end if;
  return s;
end;
$$;
