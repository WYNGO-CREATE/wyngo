-- ─── Prévenir le client quand l'agence lui répond ────────────────────
--
-- Jusqu'ici le client devait rouvrir son espace « au cas où ». Autant dire
-- qu'il ne le faisait pas : une réponse pouvait dormir une semaine.
--
-- Le déclencheur est posé sur la TABLE, pas dans l'interface. L'email part
-- donc quel que soit l'endroit d'où la réponse a été écrite — le Studio
-- aujourd'hui, autre chose demain — sans qu'on ait à y repenser.
--
-- Deux garde-fous :
--   • on ne notifie que les messages de l'AGENCE (pas ceux du client) ;
--   • pas plus d'un email toutes les 10 minutes par site : répondre en trois
--     messages d'affilée ne doit pas déclencher trois emails.

create table if not exists public.notifications_envoyees (
  site_id    uuid primary key references public.client_sites(id) on delete cascade,
  dernier_le timestamptz not null default now()
);

alter table public.notifications_envoyees enable row level security;
-- Aucune politique : table technique, seul le service_role y touche.

create or replace function public.notifier_reponse_client()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  base    text;
  secret  text;
  recent  boolean;
begin
  if new.author is distinct from 'agency' then
    return new;
  end if;

  -- Anti-rafale : si l'on a déjà prévenu ce client il y a moins de 10 min,
  -- on ne le prévient pas une deuxième fois. Il verra tout d'un coup.
  select exists (
    select 1 from public.notifications_envoyees
     where site_id = new.site_id and dernier_le > now() - interval '10 minutes'
  ) into recent;
  if recent then return new; end if;

  select decrypted_secret into base   from vault.decrypted_secrets where name = 'supabase_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if base is null or secret is null then
    -- Sans secret, on n'envoie rien — mais on ne fait surtout pas échouer
    -- l'écriture du message : la réponse doit être enregistrée quoi qu'il
    -- arrive.
    return new;
  end if;

  insert into public.notifications_envoyees (site_id, dernier_le)
  values (new.site_id, now())
  on conflict (site_id) do update set dernier_le = now();

  perform net.http_post(
    url := base || '/functions/v1/client-notifier',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', secret
    ),
    body := jsonb_build_object(
      'site_id', new.site_id,
      'base_url', 'https://wyngoworkspace.bold-unit-739e.workers.dev'
    ),
    timeout_milliseconds := 10000
  );

  return new;
exception when others then
  -- Une notification qui échoue ne doit jamais empêcher d'écrire un message.
  return new;
end;
$$;

drop trigger if exists trg_notifier_reponse_client on public.portal_messages;
create trigger trg_notifier_reponse_client
  after insert on public.portal_messages
  for each row execute function public.notifier_reponse_client();

comment on function public.notifier_reponse_client() is
  'Envoie au client un email quand l''agence répond. Posé sur la table pour être insensible à l''endroit d''où le message est écrit.';
