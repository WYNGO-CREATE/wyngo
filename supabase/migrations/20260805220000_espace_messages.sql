-- ─── Le client écrit sans connaître la structure ─────────────────────
--
-- portal_messages exige un `owner_id` — celui de l'agence — que le client ne
-- peut pas lire, et un `author` qu'il ne doit pas pouvoir falsifier. On passe
-- donc par deux fonctions : il n'écrit jamais dans la table directement.

create or replace function public.espace_messages()
returns table (id uuid, author text, body text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.author, m.body, m.created_at
    from public.portal_messages m
    join public.client_comptes c on c.site_id = m.site_id
   where c.user_id = auth.uid() and c.actif
   order by m.created_at;
$$;

create or replace function public.espace_ecrire(p_texte text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site uuid; v_owner uuid; v_id uuid;
begin
  if coalesce(btrim(p_texte), '') = '' then
    raise exception 'Message vide';
  end if;

  select s.id, s.owner_id into v_site, v_owner
    from public.client_comptes c
    join public.client_sites s on s.id = c.site_id
   where c.user_id = auth.uid() and c.actif
   limit 1;

  if v_site is null then raise exception 'Aucun espace rattaché à ce compte'; end if;

  insert into public.portal_messages (site_id, owner_id, author, body)
  values (v_site, v_owner, 'client', left(btrim(p_texte), 4000))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.espace_messages()    to authenticated;
grant execute on function public.espace_ecrire(text)  to authenticated;
