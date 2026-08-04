-- ─── Deux métiers tranchés par recoupement Google/Sirene ─────────────
--
-- Ces deux-là ne mettent pas leur métier dans leur raison sociale : compter
-- les mots ne donnait rien. On a donc demandé à Google la liste des vrais
-- établissements dans 16 villes, puis lu leur code NAF déclaré.
--
-- Soutien scolaire  85.60Z → 85.59B   85.59B ressort à 53 % (7 sur 13)
--   85.60Z = « activités de soutien À L'ENSEIGNEMENT » (orientation,
--   inspection) — ce n'est pas donner des cours. 85.59B = autres
--   enseignements, où sont les organismes de cours particuliers.
--
-- Boxe / arts martiaux  93.13Z → 93.12Z   93.12Z ressort à 46 % (7 sur 15)
--   93.13Z = centres de culture physique (salles de fitness). Un club de boxe
--   est un club de sport : 93.12Z.

update public.metiers_prospection set naf = '85.59B' where metier_id = 'soutien_scolaire';
update public.metiers_prospection set naf = '93.12Z' where metier_id = 'boxe_arts_martiaux';
