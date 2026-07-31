-- Récap du 1er RDV saisi par le commercial avant de générer la présentation.
-- Conservé sur le deck pour pouvoir régénérer sans tout ressaisir.
alter table public.pitch_decks add column if not exists recap jsonb;

comment on column public.pitch_decks.recap is
  'Récap du 1er rendez-vous (champs guidés + texte libre) ayant servi à générer la présentation.';
