-- ─── Rendez-vous (2e RDV) synchronisés Google Agenda ──────────────────
-- L'utilisateur planifie un RDV avec un prospect → un événement est créé
-- dans son Google Agenda, le client est invité par email (sendUpdates=all),
-- et un rappel apparaît dans le cockpit « À faire ».

create table if not exists public.appointments (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users(id) on delete cascade,
  prospect_id        uuid references public.prospects(id) on delete set null,
  title              text not null,
  client_email       text,
  scheduled_at       timestamptz not null,
  duration_min       int  not null default 30,
  location           text,                    -- adresse physique (si présentiel)
  is_video           boolean not null default false,
  meet_link          text,                    -- lien Google Meet (si visio)
  notes              text,
  google_event_id    text,
  google_event_link  text,                    -- htmlLink Google Agenda
  status             text not null default 'planifie' check (status in ('planifie','annule','termine')),
  created_at         timestamptz not null default now()
);

create index if not exists appointments_owner_idx on public.appointments(owner_id, scheduled_at);
create index if not exists appointments_prospect_idx on public.appointments(prospect_id);

alter table public.appointments enable row level security;
drop policy if exists "appointments_owner_all" on public.appointments;
create policy "appointments_owner_all" on public.appointments
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
