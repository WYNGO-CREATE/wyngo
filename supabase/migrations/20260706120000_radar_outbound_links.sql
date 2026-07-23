-- Liens sortants (renfort d'entité) : les articles Découverte pointent vers les sites officiels.

-- Wyngo : lien sur la 1re mention + dans le pied de page.
update public.radar_articles set body = replace(
  replace(body,
    'contre-pied. Wyngo ne conçoit pas',
    'contre-pied. <a href="https://wyngo.fr" target="_blank" rel="noopener">Wyngo</a> ne conçoit pas'),
  'Rencontre — la rédaction du Radar Tech.',
  'Rencontre — la rédaction du Radar Tech. Site officiel : <a href="https://wyngo.fr" target="_blank" rel="noopener">wyngo.fr</a>.')
where slug = 'wyngo-decouverte-2026';

-- Artefact Neural : lien sur la 1re mention + source cliquable.
update public.radar_articles set body = replace(
  replace(body,
    'qu’attaque Artefact Neural, le projet',
    'qu’attaque <a href="https://artefactneural.com" target="_blank" rel="noopener">Artefact Neural</a>, le projet'),
  'Source : artefactneural.com.',
  'Source : <a href="https://artefactneural.com" target="_blank" rel="noopener">artefactneural.com</a>.')
where slug = 'artefact-neural-decouverte';
