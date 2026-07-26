-- Corrige les URLs d'images pointant vers l'ancien domaine vercel.app
-- (photo de Hugo cassée sur l'article Wyngo) → chemins relatifs servis par le site.
update public.radar_articles
set body = replace(body, 'https://le-radar-tech.vercel.app/', '/')
where body like '%le-radar-tech.vercel.app/%';
