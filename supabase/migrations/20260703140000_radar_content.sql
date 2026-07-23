-- ─── Le Radar Tech — abonnés newsletter + contenu (images + articles) ──

-- Newsletter : inscription publique (anon insert), lecture réservée à l'équipe.
create table if not exists public.radar_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);
alter table public.radar_subscribers enable row level security;
do $$ begin
  create policy "radar_sub_public_insert" on public.radar_subscribers for insert to anon, authenticated with check (true);
  create policy "radar_sub_team_read" on public.radar_subscribers for select to authenticated using (public.is_team_member());
exception when duplicate_object then null; end $$;

-- Images pro (Unsplash CDN) sur les 3 articles existants
update public.radar_articles set cover_url = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=70' where slug = 'europe-outils-numeriques';
update public.radar_articles set cover_url = 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=1200&q=70' where slug = 'cinq-outils-no-code';
update public.radar_articles set cover_url = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=70' where slug = 'presence-en-ligne-actif';

-- Nouveaux articles, toutes rubriques, avec images
insert into public.radar_articles (slug, title, kicker, category, standfirst, body, cover_url, author, status, featured, published_at) values
('assistants-code-ia', 'Les assistants de code réécrivent le métier de développeur', 'IA', 'ia',
 'En deux ans, les copilotes de programmation sont passés du gadget à l''outil de travail quotidien. Enquête sur une transformation silencieuse des ateliers.',
 '<p>Il y a encore peu, écrire du code restait un geste solitaire. Aujourd''hui, une part croissante des développeurs travaille en binôme avec une intelligence artificielle qui suggère, corrige et documente.</p><p>Le métier ne disparaît pas : il se déplace. La valeur se loge désormais dans la capacité à cadrer un problème, à relire, à décider — plus que dans la frappe ligne à ligne.</p><p>Reste une question ouverte : à qui appartient le code produit à quatre mains avec une machine ?</p>',
 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=70', 'La rédaction', 'publie', false, now() - interval '1 hour'),
('souverainete-donnees-europe', 'Souveraineté numérique : héberger ses données en Europe, mode d''emploi', 'Tech', 'tech',
 'Reprendre la main sur son infrastructure n''est plus réservé aux grands groupes. Guide pratique pour les indépendants et les PME.',
 '<p>La dépendance aux plateformes américaines a un coût : juridique, financier, stratégique. De plus en plus d''entreprises cherchent à rapatrier leurs données sur des serveurs européens.</p><p>Hébergeurs certifiés, chiffrement, réversibilité : nous passons en revue les critères qui comptent vraiment avant de choisir.</p>',
 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?auto=format&fit=crop&w=1200&q=70', 'La rédaction', 'publie', false, now() - interval '2 hours'),
('presse-locale-algorithme', 'La presse locale à l''épreuve de l''algorithme', 'Médias', 'medias',
 'Comment les titres régionaux réinventent leur audience à l''heure des réseaux et des moteurs de recherche.',
 '<p>Longtemps portée par le papier, la presse locale joue désormais sa survie dans les flux. Les rédactions apprennent un nouveau métier : capter l''attention là où elle se trouve.</p><p>Certains titres y gagnent une audience inédite. D''autres s''y perdent. Analyse d''une mutation à haut risque.</p>',
 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=70', 'La rédaction', 'publie', false, now() - interval '3 hours'),
('referencement-local-google', 'Référencement local : ce que Google récompense vraiment', 'Enquête', 'enquetes',
 'Nous avons décortiqué les signaux qui font la différence pour un commerce de quartier.',
 '<p>Apparaître en tête des résultats quand un client cherche « près de chez moi » : voilà l''enjeu du référencement local. Derrière la magie apparente, des règles concrètes.</p><p>Fiche à jour, avis authentiques, site rapide et clair : les fondamentaux comptent souvent plus que les astuces.</p>',
 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=70', 'La rédaction', 'publie', false, now() - interval '4 hours'),
('ia-generative-metiers-creatifs', 'L''IA générative bouscule les métiers créatifs', 'IA', 'ia',
 'Image, texte, son : les outils génératifs s''installent dans les ateliers. Menace ou nouvel instrument ?',
 '<p>Pour beaucoup de créatifs, l''IA générative est d''abord un outil de plus — puissant, imparfait, à apprivoiser. Elle accélère les ébauches, libère du temps pour l''essentiel.</p><p>Mais elle pose aussi des questions de droits, d''originalité et de valeur. Le débat ne fait que commencer.</p>',
 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=70', 'La rédaction', 'publie', false, now() - interval '5 hours'),
('reseaux-sociaux-audience', 'Bâtir une audience sans dépendre d''une seule plateforme', 'Médias', 'medias',
 'Newsletter, site, communauté : la stratégie des créateurs qui reprennent le contrôle.',
 '<p>Construire son audience sur une plateforme, c''est bâtir sur un terrain qu''on ne possède pas. Un changement d''algorithme, et tout s''effondre.</p><p>D''où le retour en grâce du site et de la newsletter : des canaux qu''on maîtrise vraiment.</p>',
 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=70', 'La rédaction', 'publie', false, now() - interval '6 hours'),
('heberger-donnees-europe-guide', 'Internet : reprendre le contrôle de son nom de domaine', 'Internet', 'internet',
 'Le nom de domaine est le socle de toute présence en ligne. Encore faut-il en rester propriétaire.',
 '<p>Trop d''entreprises découvrent, le jour où ça tourne mal, que leur nom de domaine appartient à leur prestataire. Un actif stratégique laissé sans surveillance.</p><p>Nos conseils pour vérifier, sécuriser et garder la main sur cette brique essentielle.</p>',
 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=70', 'La rédaction', 'publie', false, now() - interval '7 hours'),
('javascript-frameworks-2026', 'Développement web : la fin de la course aux frameworks ?', 'Tech', 'tech',
 'Après des années de nouveautés incessantes, l''écosystème web cherche la stabilité. Bonne nouvelle pour les artisans du code.',
 '<p>Chaque année apportait son lot de frameworks « révolutionnaires ». En 2026, la tendance s''inverse : on valorise la sobriété, la maintenabilité, la performance.</p><p>Pour les studios qui livrent des sites durables, c''est une excellente nouvelle.</p>',
 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=70', 'La rédaction', 'publie', false, now() - interval '8 hours'),
('wyngo-fabrique-site', 'Dans la fabrique d''un site qui convertit', 'Le carnet', 'wyngo',
 'Immersion chez Wyngo, cabinet qui conçoit des sites pour les artisans et commerçants. Méthode, choix, coulisses.',
 '<p>Concevoir un site qui « marche » ne tient pas au hasard. Chez <a href="https://wyngo.fr">Wyngo</a>, tout part du terrain : comprendre le métier, ses clients, ses mots.</p><p>Vient ensuite l''essentiel — un message clair, une preuve immédiate, un chemin simple vers le contact. Le design suit, il ne précède pas.</p>',
 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=70', 'La rédaction', 'publie', false, now() - interval '9 hours')
on conflict (slug) do nothing;
