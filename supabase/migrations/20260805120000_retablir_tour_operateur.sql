-- ─── Aucun métier n'est écarté ───────────────────────────────────────
--
-- Tour-opérateur avait été retiré des propositions automatiques : c'était une
-- erreur d'interprétation de ma part. C'est bien un corps de métier, et la
-- règle est qu'on n'en écarte aucun.

update public.metiers_prospection set actif = true where actif = false;
