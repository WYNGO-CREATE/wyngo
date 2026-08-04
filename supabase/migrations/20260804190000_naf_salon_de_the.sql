-- ─── Salon de thé : 56.30Z → 56.10C ──────────────────────────────────
--
-- 56.30Z est le code des débits de boissons. Un salon de thé sert à manger :
-- il relève de la restauration.
--
-- Mesuré sur 240 établissements réels dans 12 villes (Google Places croisé
-- avec Sirene) : 56.10C ressort à 54 % (34 sur 62 identifiés), le 56.30Z du
-- catalogue à 3 % (2). Témoin de contrôle passé le même jour : « salon de
-- coiffure » → 96.02A à 75 %.

update public.metiers_prospection set naf = '56.10C' where metier_id = 'salon_the';
