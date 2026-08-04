-- ─── Six métiers rangés sous le mauvais code NAF ─────────────────────
--
-- Kinésithérapeute, Psychomotricien, Ergothérapeute et Orthophoniste étaient
-- classés en 86.90F — la case fourre-tout « santé humaine non classée
-- ailleurs ». Ils relèvent de 86.90E (rééducation). Naturopathe et
-- Hypnothérapeute relèvent en pratique de 96.09Z (services personnels).
--
-- Mesuré sur 100 sociétés par métier via l'API Recherche d'entreprises :
--   kinésithérapeute 86.90E 97 % · psychomotricien 93 % · ergothérapeute 97 %
--   orthophoniste 87 % · naturopathe 96.09Z 57 % · hypnothérapeute 67 %
--
-- Conséquence concrète : une chasse « Kinésithérapeute » ne ramenait
-- pratiquement aucun kiné.

update public.metiers_prospection set naf = '86.90E' where metier_id = 'psychomotricien';
update public.metiers_prospection set naf = '86.90E' where metier_id = 'ergotherapeute';
update public.metiers_prospection set naf = '86.90E' where metier_id = 'orthophoniste';
update public.metiers_prospection set naf = '96.09Z' where metier_id = 'naturopathe';
update public.metiers_prospection set naf = '96.09Z' where metier_id = 'hypnotherapeute';

-- L'identifiant du kinésithérapeute est « kine », pas « kinesitherapeute ».
update public.metiers_prospection set naf = '86.90E' where metier_id = 'kine';
