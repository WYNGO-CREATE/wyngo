-- L'identifiant du kinésithérapeute au catalogue est « kine » : la correction
-- précédente visait « kinesitherapeute » et n'a donc touché personne.
update public.metiers_prospection set naf = '86.90E' where metier_id = 'kine';
