-- ─── Relier les articles aux pages de fond ────────────────────────────
--
-- Les trois premiers articles n'avaient qu'UN lien entrant : la page de
-- liste. Une page que rien ne relie ne reçoit aucun crédit et se lit comme un
-- cul-de-sac — le visiteur la termine et s'en va.
--
-- On note explicitement à quelles pages chaque article se rattache. Pas de
-- rapprochement automatique par mots-clés : mieux vaut deux liens justes que
-- cinq approximatifs, et un mauvais lien se voit tout de suite.
alter table public.site_articles
  add column if not exists pages_liees text[] not null default '{}';

comment on column public.site_articles.pages_liees is
  'Chemins des pages de fond à proposer en bas d''article, ex : {/audit-site-internet}.';
