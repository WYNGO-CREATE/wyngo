-- ─── Le filigrane des sites déjà générés ──────────────────────────────
--
-- Le générateur produit désormais « Aperçu généré par Group Arsène », mais
-- les deux sites déjà en base gardaient l'ancien filigrane — visible en bas
-- à droite de chaque page, et cliquable vers l'ancien domaine.
--
-- Comme dans le générateur, on retire le lien : grouparsene.fr ne répond pas
-- encore, et un lien mort sur une page montrée à un prospect est pire qu'un
-- simple libellé.

update public.client_sites
   set html = regexp_replace(
                replace(
                  replace(html, 'wyngo-watermark', 'ga-watermark'),
                  'Aperçu généré par Wyngo', 'Aperçu généré par Group Arsène'),
                '<a href="https://wyngo\.fr"[^>]*class="ga-watermark">',
                '<span class="ga-watermark">', 'g')
 where html ilike '%wyngo%';

-- La balise fermante du filigrane suit le changement de <a> vers <span>.
update public.client_sites
   set html = regexp_replace(html,
                '(Aperçu généré par Group Arsène\s*)</a>',
                '\1</span>', 'g')
 where html like '%Aperçu généré par Group Arsène%';

-- Le commentaire CSS qui nommait l'ancien site comme référence de style.
update public.client_sites
   set html = replace(html, 'style Swiss / wyngo.fr', 'style Swiss')
 where html like '%style Swiss / wyngo.fr%';

-- La fiche de démonstration du Studio portait une adresse à l'ancien domaine.
update public.prospects
   set email = 'demo@grouparsene.fr'
 where email = 'demo@wyngo.fr';
