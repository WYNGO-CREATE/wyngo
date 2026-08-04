-- ─── Huit métiers sous un code NAF erroné ───────────────────────────
--
-- Pressing - Blanchisserie : 96.01A → 96.01B
--   96.01A = blanchisserie de GROS, 96.01B = de DÉTAIL (10 000+ ets contre 1 235)
-- Boulangerie - Pâtisserie : 10.71B → 10.71C
--   10.71B = simple cuisson (terminaux, dépôts de pain), 10.71C = boulangerie artisanale
-- Pâtisserie artisanale : 10.71C → 10.71D
--   10.71D est le code pâtisserie ; densité du mot 21 % contre 5 %
-- Carrosserie - Peinture auto : 45.20B → 45.20A
--   45.20B = véhicules LOURDS, 45.20A = véhicules légers (20 % contre 7 %)
-- Terrassement - VRD : 43.12B → 43.12A
--   43.12B = terrassement de grande masse, 43.12A = travaux courants (TPE)
-- Pizzeria : 56.10B → 56.10C
--   56.10B = cafétérias et libres-services, sans rapport
-- Désinsectisation - Nuisibles : 81.29Z → 81.29A
--   81.29Z ne renvoie AUCUN établissement : le code n'existe pas
-- Courtier en crédit / Mortgage : 66.19A → 66.19B
--   densité du métier 29 % contre 1 %
--
-- Vérifié sur 100 sociétés par code (API Recherche d'entreprises), en
-- comptant la présence du métier dans les raisons sociales.

update public.metiers_prospection set naf = '96.01B' where metier_id = 'pressing';
update public.metiers_prospection set naf = '10.71C' where metier_id = 'boulangerie';
update public.metiers_prospection set naf = '10.71D' where metier_id = 'patisserie';
update public.metiers_prospection set naf = '45.20A' where metier_id = 'carrosserie';
update public.metiers_prospection set naf = '43.12A' where metier_id = 'terrassement';
update public.metiers_prospection set naf = '56.10C' where metier_id = 'pizzeria';
update public.metiers_prospection set naf = '81.29A' where metier_id = 'desinsectisation';
update public.metiers_prospection set naf = '66.19B' where metier_id = 'courtier_credit';
