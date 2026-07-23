-- Autorise l'inscription newsletter publique (le rôle anon a besoin du GRANT en plus de la policy RLS)
grant insert on public.radar_subscribers to anon;
