-- ─── Le Radar Tech — 3 start-up du moment (fondateurs cités) ───────────

insert into public.radar_articles (slug, title, kicker, category, standfirst, body, cover_url, author, status, featured, published_at) values

('lovable-vibe-coding',
 'Lovable, la licorne suédoise qui fait coder sans coder',
 'Portrait', 'tech',
 'Fondée fin 2024 à Stockholm par Anton Osika et Fabian Hedin, la start-up permet de bâtir une application en la décrivant en français. Sa croissance est l’une des plus rapides de l’histoire du logiciel.',
 '<p>On l’appelle le « vibe coding » : décrire en langage courant l’application dont on rêve, et la voir se construire toute seule. C’est la promesse de Lovable, jeune pousse née fin 2024 à Stockholm, sous l’impulsion de deux Suédois — Anton Osika, physicien passé par le CERN, le grand laboratoire européen de physique des particules, et Fabian Hedin, entrepreneur en série.</p>
<figure style="margin:26px 0"><img src="https://images.unsplash.com/photo-1550439062-609e1531270e?auto=format&fit=crop&w=1200&q=70" alt="Écran de code" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">Avec Lovable, on décrit une application ; la machine l’écrit. — Unsplash</figcaption></figure>
<p>Les chiffres tiennent du prodige. Cent millions de dollars de revenus annualisés atteints en huit mois, puis cinq cents millions moins d’un an après le lancement — le tout avec seulement cent quarante-six salariés et huit millions d’utilisateurs, des bricoleurs du dimanche aux futurs entrepreneurs. Après une levée de 330 millions de dollars fin 2025, ses deux fondateurs sont devenus milliardaires.</p>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">« L’Europe n’a pas un problème de talent, mais un problème de confiance. »<cite style="display:block;font-size:14px;font-style:normal;color:#5c5852;margin-top:8px">— Anton Osika, cofondateur de Lovable (propos rapportés)</cite></blockquote>
<p>Derrière l’exploit, une conviction que son patron aime marteler : le continent regorge d’ingénieurs, mais s’interdit trop souvent de viser le sommet. Lovable veut prouver le contraire, depuis la Suède, face à la Silicon Valley. Le pari n’est pas sans risques — la concurrence est féroce, et la génération automatique de logiciels pose des questions de qualité et de sécurité. Mais l’entreprise a déjà démontré une chose : qu’une idée européenne pouvait, sans quitter son continent, devenir en quelques mois un phénomène mondial.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : Forbes, The Next Web (2026) ; jalons de revenus communiqués par la société.</p>',
 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '4 minutes'),

('elevenlabs-voix-numerique',
 'ElevenLabs, la voix de la machine',
 'Portrait', 'ia',
 'Deux amis d’enfance polonais ont fondé à Londres la référence mondiale de la voix synthétique. Valorisée onze milliards de dollars, la start-up fascine autant qu’elle inquiète.',
 '<p>Fermez les yeux, écoutez : la voix est chaude, nuancée, presque humaine. Elle n’existe pourtant pas. C’est le savoir-faire d’ElevenLabs, fondée en 2022 à Londres par deux amis d’enfance polonais, Mati Staniszewski et Piotr Dąbkowski, partis d’une frustration simple — la médiocrité des doublages automatiques de leur enfance.</p>
<p>En trois ans, la maison est devenue la référence de la voix numérique : synthèse vocale, doublage multilingue, effets sonores, agents conversationnels. Ses modèles équipent aussi bien des studios que des entreprises comme Deutsche Telekom ou Revolut, portant son chiffre d’affaires annualisé au-delà de 330 millions de dollars fin 2025.</p>
<figure style="margin:26px 0"><img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=70" alt="Onde sonore, studio" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">La voix de synthèse est devenue indiscernable de la vraie. — Unsplash</figcaption></figure>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">500 millions de dollars levés début 2026 pour une valorisation de 11 milliards : en douze mois, la start-up a triplé de valeur.</blockquote>
<p>Cette réussite, portée par des investisseurs de premier plan dont Sequoia et Nvidia, a un revers que l’entreprise ne peut ignorer : la même technologie qui donne une voix à un roman audio permet aussi de cloner celle d’un proche pour mieux escroquer. ElevenLabs multiplie les garde-fous — vérification du consentement, marquage des contenus — mais la course entre l’usage et l’abus ne fait que commencer. La voix, ce dernier bastion de l’authenticité humaine, est devenue un terrain de vigilance.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : CNBC, TechCrunch, ElevenLabs (2025-2026).</p>',
 'https://images.unsplash.com/photo-1526378722484-bd91ca387e72?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '8 minutes'),

('black-forest-labs-image-ia',
 'Black Forest Labs, les Allemands qui redessinent l’image',
 'Portrait', 'tech',
 'Les créateurs de Stable Diffusion ont fondé leur propre laboratoire en Forêt-Noire. En moins d’un an, il est devenu la référence européenne de l’image générée — et il joue la carte de l’ouverture.',
 '<p>Ils ont inventé, dans des laboratoires universitaires allemands, la technique qui a rendu possible la génération d’images par l’IA. En 2024, plutôt que de la voir captée par d’autres, Robin Rombach, Andreas Blattmann, Patrick Esser et Dominik Lorenz — figures de la « diffusion latente » et de Stable Diffusion — ont fondé leur propre maison à Fribourg, au pied de la Forêt-Noire.</p>
<p>Black Forest Labs et ses modèles Flux se sont imposés en un temps record comme la référence de l’image de synthèse : photoréalisme, cohérence des personnages, retouche par instructions. En décembre 2025, la jeune pousse levait 300 millions de dollars pour une valorisation de 3,25 milliards, avec le soutien d’Andreessen Horowitz, de Nvidia et de Salesforce. Ses images irriguent déjà les produits d’Adobe ou de Vercel.</p>
<figure style="margin:26px 0"><img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=70" alt="Image générée par ordinateur" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">Flux, la référence européenne de l’image générée. — Unsplash</figcaption></figure>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">Le pari de Black Forest Labs : publier ouvertement ses modèles, à rebours des boîtes noires américaines.</blockquote>
<p>Là est sa singularité. Quand la plupart des géants verrouillent leurs modèles, l’allemand en ouvre une partie, laissant chacun les inspecter, les adapter, les faire tourner chez soi. Un choix philosophique — l’héritage du monde open source dont ses fondateurs sont issus — mais aussi stratégique, dans une Europe qui fait de la transparence un atout. Reste le défi commun à toute l’image générée : préserver la confiance, à l’heure où l’on ne sait plus toujours distinguer le vrai du fabriqué.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : TechCrunch, VentureBeat, Salesforce Ventures (2024-2025).</p>',
 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '12 minutes')

on conflict (slug) do nothing;
