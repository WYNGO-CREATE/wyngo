-- ─── Provenance des RDV (Wyngo vs Calendly) + dédoublonnage ───────────
-- Permet d'importer les réservations Calendly sans créer de doublons
-- (external_ref = URI de l'événement Calendly).

alter table public.appointments
  add column if not exists source       text not null default 'wyngo',
  add column if not exists external_ref text;

create unique index if not exists appointments_external_ref_idx
  on public.appointments(external_ref) where external_ref is not null;
