-- ─── Les liens envoyés aux clients pointent sur leur vraie adresse ───
--
-- Le déclencheur de notification portait l'adresse workers.dev en dur. Un
-- client recevait donc « wyngoworkspace.bold-unit-739e.workers.dev » — un nom
-- qui n'inspire pas confiance et qui ne veut plus rien dire depuis Group
-- Arsène.

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

  select exists (
    select 1 from public.notifications_envoyees
     where site_id = new.site_id and dernier_le > now() - interval '10 minutes'
  ) into recent;
  if recent then return new; end if;

  select decrypted_secret into base   from vault.decrypted_secrets where name = 'supabase_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if base is null or secret is null then return new; end if;

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
      'base_url', 'https://espace.grouparsene.fr'
    ),
    timeout_milliseconds := 10000
  );

  return new;
exception when others then
  return new;
end;
$$;
