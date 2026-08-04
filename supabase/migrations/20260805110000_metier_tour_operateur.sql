-- ─── Tour-opérateur écarté des propositions ──────────────────────────
--
-- Le système l'a proposé comme mission (« Tour-opérateur à Toulouse »). Ce
-- n'est pas la clientèle visée : ce sont des agences de voyage constituées,
-- pas des artisans ou commerçants de proximité.
--
-- L'interrupteur `actif` retire un métier des propositions automatiques sans
-- le supprimer du catalogue : il reste choisissable à la main dans la chasse.

update public.metiers_prospection set actif = false where metier_id = 'tour_operator';
