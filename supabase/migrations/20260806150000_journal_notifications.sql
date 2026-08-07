-- ─── Savoir pourquoi une notification n'est pas partie ───────────────
--
-- Le déclencheur appelle la fonction en arrière-plan : personne ne voit sa
-- réponse. Quand un client dit « je n'ai rien reçu », on n'a rien à regarder.
--
-- La fonction consigne donc chaque tentative et son issue.

create table if not exists public.notifications_journal (
  id          bigserial primary key,
  site_id     uuid references public.client_sites(id) on delete set null,
  genre       text not null default 'reponse',
  destinataire text,
  envoye      boolean not null default false,
  raison      text,
  le          timestamptz not null default now()
);

create index if not exists notif_journal_date_idx on public.notifications_journal (le desc);

alter table public.notifications_journal enable row level security;

-- L'agence lit le journal de ses propres sites : c'est elle qui doit pouvoir
-- répondre à « il n'a rien reçu ».
create policy "journal_agence" on public.notifications_journal
  for select to authenticated
  using (not public.est_client()
         and exists (select 1 from public.client_sites s
                      where s.id = notifications_journal.site_id and s.owner_id = auth.uid()));
