-- ─── Le Radar Tech — Wyngo discret + 6 nouveaux articles (photos intégrées) ──

-- Wyngo devient discret : on retire la rubrique "wyngo", on reclasse ses 2 articles
update public.radar_articles set category = 'internet' where slug = 'presence-en-ligne-actif';
update public.radar_articles set category = 'enquetes', kicker = 'Reportage' where slug = 'wyngo-fabrique-site';

-- Nouveaux articles (corps étoffés, une image intégrée + citation/exergue + sources)
insert into public.radar_articles (slug, title, kicker, category, standfirst, body, cover_url, author, status, featured, published_at) values

('accessibilite-numerique-obligation',
 'Accessibilité numérique : l’obligation européenne que beaucoup n’ont pas vue venir',
 'Enquête', 'internet',
 'Depuis le 28 juin 2025, une directive impose l’accessibilité des sites et services en ligne à travers les Vingt-Sept. Beaucoup d’entreprises l’ignorent encore.',
 '<p>C’est une échéance passée presque inaperçue, et pourtant elle engage tout un continent. Depuis le 28 juin 2025, l’<em>European Accessibility Act</em> — transposé dans les vingt-sept États membres — impose que les sites de commerce et de services en ligne soient utilisables par les personnes handicapées.</p>
<p>Concrètement, un site doit pouvoir être lu par un lecteur d’écran, navigué au clavier, offrir des contrastes suffisants et des textes alternatifs : les fameuses règles WCAG, reprises par la norme européenne EN 301 549. Les nouveaux contenus sont concernés dès maintenant ; l’existant a jusqu’au 28 juin 2030 pour se mettre en conformité.</p>
<figure style="margin:26px 0"><img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=70" alt="Équipe travaillant sur un site web" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">L’accessibilité n’est pas une couche que l’on ajoute : elle se pense dès la conception. — Unsplash</figcaption></figure>
<p>Toutes les entreprises ne sont pas logées à la même enseigne. Le texte vise les acteurs d’au moins dix salariés réalisant plus de deux millions d’euros de chiffre d’affaires ; les micro-entreprises en sont, pour l’essentiel, exemptées. Mais l’exemption n’est pas une dispense de bon sens.</p>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">Un site accessible n’est pas un site pour « quelques-uns ». C’est un site simplement mieux fait, pour tout le monde.</blockquote>
<p>Car l’accessibilité rejoint les fondamentaux d’un site réussi : clarté, rapidité, structure logique. Ce qui aide un malvoyant aide aussi le référencement, le confort de lecture sur mobile, la conversion. Les studios qui conçoivent des sites soignés, à l’image des cabinets spécialisés dans la présence des artisans, l’intègrent désormais par défaut — non par contrainte, mais parce qu’un site bien bâti l’est de toute façon.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : Commission européenne, <em>European Accessibility Act</em> ; norme EN 301 549 ; WCAG.</p>',
 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '20 minutes'),

('rancongiciels-tpe-cible',
 'Rançongiciels : pourquoi les petites entreprises sont devenues la cible favorite',
 'Enquête', 'enquetes',
 'Longtemps réservés aux grands groupes, les rançongiciels frappent désormais les TPE — précisément parce qu’elles sont les moins protégées.',
 '<p>On imagine les cyberattaques réservées aux multinationales et aux hôpitaux. La réalité est plus cruelle : les criminels ont compris que la petite entreprise, moins protégée et incapable d’encaisser un arrêt, est une proie idéale.</p>
<p>Les chiffres de l’Agence de l’Union européenne pour la cybersécurité (ENISA) donnent le vertige. Interrogées, 90 % des PME estiment qu’un incident aurait des conséquences graves en moins d’une semaine ; 57 % pensent qu’il les mènerait à la faillite. Le rançongiciel arrive en tête des menaces, aux côtés de l’hameçonnage et de la fraude au président.</p>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">57 % des PME estiment qu’une attaque par rançongiciel les conduirait à mettre la clé sous la porte.<cite style="display:block;font-size:14px;font-style:normal;color:#5c5852;margin-top:8px">— Enquête ENISA sur la cybersécurité des PME</cite></blockquote>
<figure style="margin:26px 0"><img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=70" alt="Salle serveur" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">En 2024, la demande moyenne de rançon a dépassé 2,7 millions de dollars. — Unsplash</figcaption></figure>
<p>L’ampleur est mondiale : en 2024, plus de 5 200 victimes ont été recensées sur les sites de fuite des groupes criminels, pour une demande moyenne supérieure à 2,7 millions de dollars et plus de 800 millions de dollars effectivement versés.</p>
<p>La bonne nouvelle, c’est que l’essentiel se joue sur des gestes simples : sauvegardes régulières et déconnectées, mises à jour, mots de passe robustes et double authentification, prudence face aux pièces jointes. La cybersécurité des petites structures n’est pas d’abord une affaire de budget — c’est une affaire d’hygiène et de constance.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : ENISA, <em>Threat Landscape</em> et enquêtes PME ; rapports sectoriels 2024.</p>',
 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '35 minutes'),

('cookies-tiers-renoncement-google',
 'Cookies tiers : le grand renoncement de Google',
 'Internet', 'medias',
 'Annoncée en 2020, la fin des cookies tiers n’aura pas lieu. Après six ans de bataille, Google a rangé son projet. Récit d’un revirement à un milliard.',
 '<p>Ce devait être la plus grande transformation de la publicité en ligne depuis vingt ans. En janvier 2020, Google annonçait la fin des cookies tiers dans Chrome « d’ici deux ans ». Six ans plus tard, ils sont toujours là — et le projet est mort.</p>
<p>Entre-temps, l’industrie publicitaire avait investi des milliards pour se préparer à un monde sans cookies : nouvelles mesures d’audience, refonte des stratégies de données. Le 22 juillet 2024, Google a fait volte-face et choisi de conserver les cookies. En avril 2025, l’entreprise confirmait renoncer définitivement. En octobre 2025, son initiative « Privacy Sandbox » était enterrée, après six années de développement.</p>
<figure style="margin:26px 0"><img src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=70" alt="Écran de code" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">La bataille des cookies fut autant technique que politique. — Unsplash</figcaption></figure>
<p>Le régulateur britannique de la concurrence a pesé lourd dans la décision, redoutant que Google ne renforce sa propre position en supprimant les cookies des autres. L’ironie est totale : au nom de la vie privée, le projet risquait de concentrer un peu plus le pouvoir chez celui qui le portait.</p>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">Six ans d’annonces, des milliards investis, et un statu quo. La souveraineté sur ses propres données reste, plus que jamais, l’affaire de chacun.</blockquote>
<p>Pour les petites entreprises, la leçon dépasse la technique : dépendre d’un tiers pour connaître ses clients, c’est s’exposer à ses revirements. La donnée que l’on collecte soi-même — un email, un contact, une relation directe — reste la seule qui ne dépende de personne.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : annonces de Google (2020, 2024, 2025) ; Competition and Markets Authority (Royaume-Uni).</p>',
 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '50 minutes'),

('email-newsletter-reprend-pouvoir',
 'L’e-mail, cette vieille technologie qui reprend le pouvoir',
 'Médias', 'medias',
 'Donné pour mort à chaque nouvelle plateforme, l’e-mail connaît une renaissance. Journalistes, créateurs et commerces y trouvent ce que les réseaux ne donnent pas : la relation directe.',
 '<p>On l’enterre à chaque génération d’applications, et pourtant il survit à toutes. À plus de cinquante ans, l’e-mail vit une seconde jeunesse — sous la forme de la lettre d’information.</p>
<p>Le phénomène est spectaculaire dans le journalisme : des reporters quittent les rédactions pour lancer leur propre newsletter, emmenant leur audience avec eux. Des plateformes entières se sont bâties sur cette promesse. Ce qui les attire n’est pas la technologie, c’est la propriété : une liste d’abonnés appartient à celui qui la constitue, quand une audience sur un réseau social peut s’évaporer au prochain changement d’algorithme.</p>
<figure style="margin:26px 0"><img src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=70" alt="Presse et écriture" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">La newsletter, retour à un lien direct entre l’auteur et son lecteur. — Unsplash</figcaption></figure>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">Une boîte mail est le dernier endroit du web qui appartienne encore à celui qui le lit.</blockquote>
<p>Pour un commerce ou un indépendant, la mécanique est la même que pour un média. Publier sur les réseaux reste utile — mais chaque publication devrait ramener vers un canal que l’on maîtrise : le site, la liste. La visibilité se loue ; la fidélité, elle, s’écrit dans une boîte mail.</p>
<p>Reste à ne pas gâcher ce lien précieux. Une lettre lue est une lettre attendue : régularité, utilité, ton juste. L’e-mail ne pardonne pas le remplissage — et c’est précisément ce qui fait sa valeur.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Analyse — la rédaction du Radar Tech.</p>',
 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '70 minutes'),

('avis-en-ligne-economie-reputation',
 'L’économie des avis en ligne : la réputation, nouvelle monnaie',
 'Enquête', 'internet',
 'Étoiles, commentaires, notes : la réputation numérique décide aujourd’hui du sort d’un commerce. Enquête sur un marché de la confiance, et sur ses dérives.',
 '<p>Avant de pousser la porte d’un restaurant, d’appeler un artisan ou de réserver chez un coiffeur, un geste s’est imposé : lire les avis. En quelques années, la note en ligne est devenue le premier filtre du commerce de proximité — un capital aussi décisif que l’emplacement.</p>
<p>Les enquêtes consommateurs le confirment année après année : la quasi-totalité des clients consultent les avis avant de choisir un commerce local, et une poignée de commentaires négatifs suffit à détourner une part importante de la clientèle. La réputation n’est plus une impression diffuse : c’est une donnée, mesurée, comparée, classée.</p>
<figure style="margin:26px 0"><img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=70" alt="Devanture de commerce" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">Pour un commerce, la note en ligne pèse désormais autant que la vitrine. — Unsplash</figcaption></figure>
<p>Ce marché de la confiance a ses dérives : faux avis achetés, campagnes de dénigrement, chantage à la mauvaise note. Les plateformes multiplient les garde-fous, sans jamais tout endiguer. Le meilleur rempart reste, paradoxalement, le plus ancien : un travail bien fait et une réponse honnête aux clients mécontents.</p>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">On ne fabrique pas une bonne réputation. On la mérite, un client à la fois — et on la rend visible.</blockquote>
<p>Car l’enjeu n’est pas seulement d’avoir de bons avis : c’est de les donner à voir. Une fiche à jour, un site qui met en avant les vraies recommandations, une invitation naturelle à témoigner : c’est là que se joue, concrètement, la réputation numérique d’un petit commerce.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : enquêtes consommateurs sur les avis en ligne (secteur).</p>',
 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '90 minutes'),

('open-source-securite-financement',
 'Open source : qui protège les logiciels que le monde entier utilise ?',
 'Enquête', 'tech',
 'Une porte dérobée découverte par hasard en 2024 a révélé une vérité dérangeante : des pans entiers d’Internet reposent sur des logiciels entretenus par une poignée de bénévoles.',
 '<p>En mars 2024, un ingénieur de Microsoft, Andres Freund, enquête sur une lenteur anormale lors de connexions à distance. Au bout du fil, il met au jour l’une des attaques les plus sophistiquées de l’histoire récente : une porte dérobée dissimulée dans <em>xz Utils</em>, une modeste bibliothèque de compression présente sur d’innombrables serveurs Linux.</p>
<p>Le plus glaçant n’est pas la technique, mais la méthode : pendant des mois, un contributeur s’était patiemment rendu indispensable au projet pour en prendre le contrôle et y glisser son piège. Sans la curiosité d’un seul homme, la faille aurait pu compromettre une part majeure de l’Internet mondial.</p>
<figure style="margin:26px 0"><img src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=70" alt="Lignes de code" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">Des briques invisibles font tourner la moitié du web — souvent sans financement. — Unsplash</figcaption></figure>
<p>L’affaire a rouvert une plaie déjà béante depuis la faille Log4j de 2021 : ces logiciels libres, socles de toute l’économie numérique, sont bien souvent maintenus par une ou deux personnes, sur leur temps libre, sans rémunération. On y bâtit des empires ; on n’y finance pas les fondations.</p>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">La moitié d’Internet repose sur des briques que presque personne ne paie — et que presque personne ne surveille.</blockquote>
<p>Des initiatives émergent pour financer ces mainteneurs, en Europe comme ailleurs. Mais le sujet dépasse la charité : c’est une question de souveraineté et de sécurité collective. Savoir de quoi son site est fait — quelles briques, entretenues par qui — n’est plus un luxe d’ingénieur. C’est une exigence.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : découverte d’Andres Freund (Microsoft), mars 2024 ; retour sur la faille Log4j (2021).</p>',
 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '110 minutes')

on conflict (slug) do nothing;
