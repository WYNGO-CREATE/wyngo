-- Espace Rédaction : accès brouillons + publication, réservé à l'admin (par email).
-- SECURITY DEFINER pour contourner proprement la RLS, mais garde stricte sur l'email.

create or replace function public.radar_is_admin() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email','') in ('contact@wyngo.fr','hugomalet55@gmail.com');
$$;

create or replace function public.radar_admin_drafts()
returns setof public.radar_articles
language plpgsql security definer set search_path = public as $$
begin
  if not public.radar_is_admin() then raise exception 'not authorized'; end if;
  return query select * from public.radar_articles
    where status = 'brouillon' order by published_at desc nulls last, id desc;
end; $$;

create or replace function public.radar_admin_publish(a_slug text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.radar_is_admin() then raise exception 'not authorized'; end if;
  update public.radar_articles
     set status = 'publie', published_at = coalesce(published_at, now())
   where slug = a_slug;
end; $$;

create or replace function public.radar_admin_discard(a_slug text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.radar_is_admin() then raise exception 'not authorized'; end if;
  delete from public.radar_articles where slug = a_slug and status = 'brouillon';
end; $$;

revoke all on function public.radar_admin_drafts() from public, anon;
revoke all on function public.radar_admin_publish(text) from public, anon;
revoke all on function public.radar_admin_discard(text) from public, anon;
grant execute on function public.radar_admin_drafts() to authenticated;
grant execute on function public.radar_admin_publish(text) to authenticated;
grant execute on function public.radar_admin_discard(text) to authenticated;
grant execute on function public.radar_is_admin() to authenticated;
notify pgrst, 'reload schema';
