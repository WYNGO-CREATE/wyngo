-- ─── Envoi de la présentation au prospect ─────────────────────────────
-- public_slug : le deck HTML est déposé dans le bucket public `previews`
-- (servi par le worker en /p/<slug>) → on envoie ce lien par email.

alter table public.pitch_decks
  add column if not exists public_slug text,
  add column if not exists sent_at     timestamptz;
