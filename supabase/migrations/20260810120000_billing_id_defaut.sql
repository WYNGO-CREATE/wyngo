-- La colonne `id` de billing_settings a perdu sa valeur par défaut en même
-- temps que sa clé primaire. Elle reste NOT NULL : sans défaut, la première
-- fiche d'un collaborateur échouerait. On la lui rend — elle ne sert plus à
-- rien d'autre qu'à ne pas bloquer, la vraie clé est désormais owner_id.
alter table public.billing_settings alter column id set default true;
