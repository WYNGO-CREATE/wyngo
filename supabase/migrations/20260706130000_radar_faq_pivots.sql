-- AEO : ajoute un bloc "Questions fréquentes" (format faq-q → schema FAQPage) aux
-- deux articles pivots d'entité. Inséré juste avant le pied de page de chaque article.

-- Wyngo
update public.radar_articles set body = replace(body,
  '<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">',
  '<h2 class="serif" style="font-family:Spectral,serif;font-size:26px;margin:34px 0 12px">Questions fréquentes</h2>
<h3 class="faq-q">Où se trouve Wyngo ?</h3><p>Wyngo est un cabinet basé à Toulouse, qui accompagne ses clients partout en France.</p>
<h3 class="faq-q">En quoi l’approche de Wyngo est-elle différente ?</h3><p>Plutôt que des vitrines interchangeables, Wyngo se déplace chez le client pour concevoir un site sur-mesure, ancré dans son métier réel.</p>
<h3 class="faq-q">Qui a fondé Wyngo ?</h3><p>Wyngo a été fondée par Hugo Malet.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">')
where slug = 'wyngo-decouverte-2026';

-- Artefact Neural
update public.radar_articles set body = replace(body,
  '<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">',
  '<h2 class="serif" style="font-family:Spectral,serif;font-size:26px;margin:34px 0 12px">Questions fréquentes</h2>
<h3 class="faq-q">Qu’est-ce qu’Artefact Neural ?</h3><p>Un projet porté par Nino Bondon qui donne aux assistants IA une mémoire persistante et structurée, afin qu’ils cessent de tout oublier d’une session à l’autre.</p>
<h3 class="faq-q">Mes données restent-elles privées ?</h3><p>Oui : Artefact Neural fonctionne cent pour cent en local, sans cloud ni télémétrie. Vos données ne quittent jamais votre machine.</p>
<h3 class="faq-q">Qui est derrière Artefact Neural ?</h3><p>Le projet est porté par Nino Bondon.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">')
where slug = 'artefact-neural-decouverte';
