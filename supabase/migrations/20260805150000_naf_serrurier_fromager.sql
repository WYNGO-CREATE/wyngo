-- ─── Deux métiers trouvés par le volume national ─────────────────────
--
-- Méthode : un métier de proximité qui plafonne à quelques centaines
-- d'établissements dans toute la France ne peut pas être au bon endroit.
--
-- Serrurier - Métallerie  25.71Z → 43.32B
--   25.71Z est la FABRICATION DE COUTELLERIE (1 716 établissements). Le code
--   43.32B s'intitule « travaux de menuiserie métallique et serrurerie » et
--   dépasse les 10 000. Mesuré : 94 % des serruriers y sont.
--
-- Producteur fromager fermier  10.51A → 10.51C
--   10.51A est la fabrication de lait liquide et produits frais (346 ets).
--   10.51C est la fabrication de fromage (1 290).
--
-- Note : 43.32B héberge aussi « Menuisier alu / PVC ». C'est conforme à la
-- nomenclature, et la contrainte d'unicité (naf, commune) empêche que deux
-- personnes reçoivent deux libellés menant aux mêmes appels.

update public.metiers_prospection set naf = '43.32B' where metier_id = 'serrurier';
update public.metiers_prospection set naf = '10.51C' where metier_id = 'producteur_fromager';
