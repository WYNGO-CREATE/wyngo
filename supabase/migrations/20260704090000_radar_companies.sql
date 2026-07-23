-- ─── Le Radar Tech — doublons corrigés + 5 articles majeurs ────────────

-- Corrige les couvertures en doublon (images distinctes, vérifiées)
update public.radar_articles set cover_url='https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=70' where slug='accessibilite-numerique-obligation';
update public.radar_articles set cover_url='https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=70' where slug='rancongiciels-tpe-cible';
update public.radar_articles set cover_url='https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=1200&q=70' where slug='email-newsletter-reprend-pouvoir';
update public.radar_articles set cover_url='https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=1200&q=70' where slug='avis-en-ligne-economie-reputation';
update public.radar_articles set cover_url='https://images.unsplash.com/photo-1591453089816-0fbb971b454c?auto=format&fit=crop&w=1200&q=70' where slug='open-source-securite-financement';

insert into public.radar_articles (slug, title, kicker, category, standfirst, body, cover_url, author, status, featured, published_at) values

('openai-startup-plus-chere-monde',
 'OpenAI, la start-up devenue la plus chère du monde',
 'Portrait', 'ia',
 'Née laboratoire à but non lucratif, l’entreprise de Sam Altman est aujourd’hui valorisée près de 850 milliards de dollars. Anatomie d’une ascension sans précédent.',
 '<p>En une décennie, OpenAI est passée d’un laboratoire de recherche à but non lucratif à l’entreprise privée la plus chère de la planète. Au printemps 2026, sa valorisation frôlait les 850 milliards de dollars, après la plus grande levée de fonds privée jamais réalisée : 122 milliards de dollars en un seul tour, avec le renfort de Nvidia, Amazon et SoftBank.</p>
<figure style="margin:26px 0"><img src="https://commons.wikimedia.org/wiki/Special:FilePath/Meeting_with_Masayoshi_Son_and_Sam_Altman_(February_3,_2025)_(3x4_cropped_on_Altman).jpg?width=900" alt="Sam Altman" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">Sam Altman, cofondateur et directeur général d’OpenAI. — Wikimedia Commons</figcaption></figure>
<p>Derrière ces chiffres vertigineux, un produit devenu nom commun : ChatGPT. En moins de trois ans, l’assistant a fait basculer le grand public dans l’ère de l’IA générative et bâti une machine à revenus qui, au printemps 2026, tournait à environ deux milliards de dollars par mois — près de vingt-quatre milliards annualisés.</p>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">Environ 2 milliards de dollars de revenus par mois : OpenAI encaisse désormais en un trimestre ce que bien des géants du logiciel mettent une année à générer.</blockquote>
<p>La trajectoire n’a pourtant rien d’un long fleuve tranquille. Fin 2023, son conseil d’administration écarte brutalement Sam Altman, avant de le rappeler cinq jours plus tard sous la pression des salariés et des investisseurs — un psychodrame qui a révélé la tension fondatrice de la maison : concilier une mission d’intérêt général et des besoins de capitaux colossaux.</p>
<p>Car la course coûte une fortune. Entraîner et faire tourner des modèles toujours plus grands exige des puces, de l’énergie et des centres de données à une échelle industrielle. À cela s’ajoutent les procès sur les droits d’auteur, la pression des régulateurs et une concurrence féroce. La question n’est plus de savoir si l’IA générative changera l’économie, mais qui en captera la valeur — et à quel prix pour le reste du monde.</p>
<p>Pour l’Europe, cette domination pose une question de dépendance. C’est précisément le pari d’acteurs comme Mistral AI : prouver que le continent peut jouer sa propre partition.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : levées de fonds OpenAI 2026 ; estimations de revenus (avril 2026). Photo : Wikimedia Commons.</p>',
 'https://images.unsplash.com/photo-1712002641088-9d76f9080889?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '5 minutes'),

('anthropic-prudence-comme-arme',
 'Anthropic, le rival qui a fait de la prudence une arme',
 'Portrait', 'ia',
 'Fondée par d’anciens d’OpenAI, Anthropic est valorisée 380 milliards de dollars et affiche la plus forte montée en revenus du secteur. Sa singularité : la sécurité comme argument commercial.',
 '<p>Dans la course à l’intelligence artificielle, Anthropic avance à contre-courant. Fondée en 2021 par un groupe de chercheurs partis d’OpenAI, autour de Dario Amodei et de sa sœur Daniela, l’entreprise a fait d’un sujet réputé austère — la sécurité de l’IA — son principal argument. Le pari paie : au début 2026, elle bouclait une série G de 30 milliards de dollars, portant sa valorisation à 380 milliards.</p>
<figure style="margin:26px 0"><img src="https://commons.wikimedia.org/wiki/Special:FilePath/Dario_Amodei_at_TechCrunch_Disrupt_2023_01_(cropped).jpg?width=900" alt="Dario Amodei" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">Dario Amodei, cofondateur et directeur général d’Anthropic. — TechCrunch, via Wikimedia Commons (CC BY 2.0)</figcaption></figure>
<p>Son assistant, Claude, s’est imposé chez les entreprises et les développeurs, portant un revenu annualisé estimé autour de 14 milliards de dollars — la plus forte accélération jamais vue dans le secteur. Là où d’autres promettent la puissance, Anthropic vend la confiance : des modèles conçus pour être plus prévisibles, plus contrôlables, moins enclins à déraper.</p>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">Le pari d’Anthropic : dans un marché grisé par la puissance, la prudence devient un avantage concurrentiel.</blockquote>
<p>La démarche a ses paradoxes. Prêcher la prudence tout en construisant des systèmes de plus en plus puissants, lever des dizaines de milliards au nom de la sécurité : les critiques y voient une contradiction, les partisans une lucidité. Chez les entreprises, en tout cas, l’argument fait mouche — car nul ne veut confier ses données à une machine imprévisible.</p>
<p>Reste l’essentiel : à ce niveau de valorisation, il faudra, tôt ou tard, transformer la promesse en profits durables. L’IA a trouvé ses champions ; il lui reste à prouver qu’elle est un modèle économique, et pas seulement une prouesse.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : levée série G d’Anthropic (février 2026) ; estimations de revenus 2026. Photo : TechCrunch / Wikimedia Commons (CC BY 2.0).</p>',
 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '9 minutes'),

('mistral-ai-pari-francais',
 'Mistral AI, le pari français qui tient tête aux géants',
 'Portrait', 'tech',
 'Valorisée autour de 12 milliards d’euros et en discussion pour bien davantage, la jeune pousse parisienne veut prouver que l’Europe peut bâtir ses propres modèles — et son infrastructure.',
 '<p>Dans une industrie écrasée par les milliards américains, une entreprise parisienne refuse de jouer les figurants. Fondée en 2023 par Arthur Mensch, Guillaume Lample et Timothée Lacroix, Mistral AI s’est imposée en un temps record comme le porte-drapeau européen de l’intelligence artificielle — au point d’en faire des milliardaires.</p>
<figure style="margin:26px 0"><img src="https://commons.wikimedia.org/wiki/Special:FilePath/Arthur_Mensch.png?width=900" alt="Arthur Mensch" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">Arthur Mensch, cofondateur et directeur général de Mistral AI. — Wikimedia Commons</figcaption></figure>
<p>Sa force : des modèles « à poids ouverts », que chacun peut télécharger, inspecter et faire tourner chez soi — l’exact opposé des boîtes noires américaines. À l’automne 2025, la société levait deux milliards d’euros pour une valorisation de douze milliards ; début 2026, elle discutait déjà d’un tour à vingt milliards.</p>
<p>Mais la vraie ambition est ailleurs. Mistral a annoncé un plan à quatre milliards d’euros pour bâtir ses propres centres de données, en France et en Suède, et explore même la conception de ses puces. Une manière de s’affranchir de la dépendance au matériel et à l’énergie qui décide, en coulisses, de la course à l’IA.</p>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">« L’Europe est en retard sur la construction d’infrastructures ; nous investissons pour combler ce fossé. »<cite style="display:block;font-size:14px;font-style:normal;color:#5c5852;margin-top:8px">— Arthur Mensch, PDG de Mistral AI (propos rapportés)</cite></blockquote>
<p>Le défi reste immense. Face à des rivaux valorisés cinquante fois plus, Mistral joue l’agilité, l’ouverture et la souveraineté. C’est peu, et c’est beaucoup : car si un modèle européen crédible existe, alors la dépendance n’est plus une fatalité. Le continent tient enfin, avec cette maison, la preuve qu’il peut encore écrire une page de l’histoire technologique.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : levées de fonds Mistral AI (2025-2026) ; plan d’infrastructure ; déclarations d’Arthur Mensch (CNBC). Photo : Wikimedia Commons.</p>',
 'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', true, now() - interval '2 minutes'),

('comment-fonctionne-vraiment-ia',
 'Comment fonctionne vraiment l’intelligence artificielle',
 'Décryptage', 'ia',
 'Derrière la magie apparente des assistants qui « comprennent » et « répondent », une mécanique étonnamment simple dans son principe — et pleine d’angles morts.',
 '<p>On les dit intelligents, on les croit conscients. Pourtant, les grands modèles de langage — ceux qui font tourner ChatGPT, Claude ou Mistral — ne « comprennent » rien au sens humain. Leur principe tient en une phrase : prédire le mot suivant.</p>
<p>Entraînés sur des quantités colossales de textes, ces modèles apprennent des régularités statistiques : quels mots ont tendance à suivre quels autres, dans quels contextes. Interrogés, ils ne récitent pas une base de connaissances ; ils calculent, un fragment après l’autre, la suite la plus probable. De cette simple mécanique de prédiction émergent des phrases cohérentes, parfois brillantes.</p>
<figure style="margin:26px 0"><img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=70" alt="Réseau de neurones, illustration" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">Un modèle ne « sait » pas : il estime, mot après mot, la suite la plus probable. — Unsplash</figcaption></figure>
<p>Le moteur de cette prouesse s’appelle le « transformer », une architecture de réseau de neurones apparue en 2017, capable de peser l’importance relative de chaque mot d’un texte. Plus le modèle est grand, plus il a lu, plus ses prédictions sont fines. Mais la taille a un coût : des puces, de l’énergie et des données à une échelle industrielle.</p>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">Des chercheuses ont forgé une image devenue célèbre : ces modèles seraient des « perroquets stochastiques » — capables de répéter avec brio, sans comprendre.<cite style="display:block;font-size:14px;font-style:normal;color:#5c5852;margin-top:8px">— d’après Emily Bender et ses coauteurs (2021)</cite></blockquote>
<p>Cette nature explique leurs travers. Un modèle peut « halluciner » — inventer une source, une date, un fait — avec le même aplomb qu’une vérité, parce qu’il ne distingue pas le vrai du plausible. Il n’a ni mémoire des faits, ni conscience, ni intention : seulement une extraordinaire capacité à imiter.</p>
<p>Comprendre cela, c’est mieux s’en servir. L’IA générative est un outil puissant pour dégrossir, reformuler, explorer — à condition de garder la main sur la vérification et le jugement. La machine imite ; c’est encore à l’humain de savoir.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : littérature sur les modèles de langage ; Bender et al., « On the Dangers of Stochastic Parrots » (2021).</p>',
 'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '14 minutes'),

('rachats-tech-annee-records',
 'Rachats tech : l’année de tous les records',
 'Enquête', 'enquetes',
 'Cursor racheté 60 milliards, Wiz avalé par Google pour 32 milliards : jamais l’industrie n’avait connu une telle frénésie de fusions. Décryptage d’une consolidation historique.',
 '<p>Le 16 juin 2026, une nouvelle a sidéré la Silicon Valley : SpaceX rachetait Anysphere, l’éditeur de l’assistant de code Cursor, pour 60 milliards de dollars en actions. Fondée en 2022, la jeune pousse était devenue l’un des logiciels à la croissance la plus fulgurante de l’histoire, dépassant le milliard de dollars de revenus annualisés et le million de développeurs fin 2025.</p>
<p>Ce n’est pas un cas isolé, mais le sommet d’une vague. Quelques mois plus tôt, Google finalisait le rachat de la start-up de cybersécurité Wiz pour 32 milliards de dollars — la plus grosse acquisition de l’histoire d’Alphabet. Palo Alto Networks s’offrait CyberArk pour 25 milliards, Synopsys avalait Ansys pour 35 milliards, IBM mettait onze milliards sur Confluent.</p>
<figure style="margin:26px 0"><img src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=70" alt="Marchés et data" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">En 2025, la valeur totale des fusions-acquisitions a bondi de près de 40 %, à un record. — Unsplash</figcaption></figure>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">Les géants n’ont pas racheté des modèles d’IA. Ils ont racheté l’infrastructure qui fera tourner les agents autonomes de la prochaine décennie.</blockquote>
<p>Car derrière ces montants, une logique claire : la course à l’IA ne se gagne pas seulement avec des algorithmes, mais avec des outils, de la sécurité, des données et de la puissance de calcul. Les acheteurs consolident les briques qui feront tourner les « agents » de demain — ces logiciels censés agir seuls.</p>
<p>Cette frénésie a un revers. Chaque méga-rachat concentre un peu plus le pouvoir chez une poignée d’acteurs, et fragilise la diversité qui fait la vitalité de la tech. Les régulateurs, en Europe comme aux États-Unis, scrutent ces opérations — mais peinent à suivre le rythme. Pour les indépendants et les petites structures, la leçon est ancienne : ne jamais dépendre entièrement d’un outil qu’un géant peut racheter, fermer ou transformer du jour au lendemain.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : opérations 2025-2026 (SpaceX-Anysphere, Google-Wiz, Palo Alto-CyberArk, Synopsys-Ansys, IBM-Confluent) ; bilans M&A du secteur.</p>',
 'https://images.unsplash.com/photo-1555255707-c07966088b7b?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '18 minutes')

on conflict (slug) do nothing;
