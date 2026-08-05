-- ─── chasse_vus : les bons noms de politiques ────────────────────────
--
-- Le correctif précédent visait « chasse_vus_lecture » et « chasse_vus_maj ».
-- Les politiques réelles s'appellent « ..._equipe » : rien n'a donc été
-- remplacé, et un compte client lisait encore la mémoire de chasse — les SIREN
-- des entreprises démarchées par l'agence.
--
-- Vérifié après coup, cette fois, plutôt que supposé.

drop policy if exists "chasse_vus_lecture_equipe"  on public.chasse_vus;
drop policy if exists "chasse_vus_ecriture_equipe" on public.chasse_vus;
drop policy if exists "chasse_vus_maj_equipe"      on public.chasse_vus;
drop policy if exists "chasse_vus_lecture"         on public.chasse_vus;
drop policy if exists "chasse_vus_maj"             on public.chasse_vus;

create policy "chasse_vus_lecture_equipe" on public.chasse_vus
  for select to authenticated using (not public.est_client());
create policy "chasse_vus_ecriture_equipe" on public.chasse_vus
  for insert to authenticated with check (not public.est_client());
create policy "chasse_vus_maj_equipe" on public.chasse_vus
  for update to authenticated
  using (not public.est_client()) with check (not public.est_client());
