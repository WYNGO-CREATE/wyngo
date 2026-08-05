-- ─── Podologue : 86.90C → 86.90E ─────────────────────────────────────
--
-- 86.90C ne compte que 169 établissements dans toute la France : ce sont les
-- centres de collecte et banques d'organes. Il y a plus de dix mille
-- pédicures-podologues.
--
-- Le bon code est 86.90E, dont l'intitulé officiel dit « activités des
-- professionnels de la rééducation, de l'appareillage et des
-- PÉDICURES-PODOLOGUES ». Mesuré indépendamment le même jour : une recherche
-- « podologue » restreinte au secteur santé donne 86.90E à 96 %.
--
-- Trouvé en balayant le volume national de chaque code du catalogue : un
-- métier courant qui plafonne à 169 établissements ne peut pas être au bon
-- endroit.

update public.metiers_prospection set naf = '86.90E' where metier_id = 'podologue';
