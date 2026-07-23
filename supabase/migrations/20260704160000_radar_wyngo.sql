-- ─── Le Radar Tech — Découverte : Wyngo (portrait + interview + avis) ──

insert into public.radar_articles (slug, title, kicker, category, standfirst, body, cover_url, author, status, featured, published_at) values
('wyngo-decouverte-2026',
 'Découverte — Wyngo, le cabinet qui conçoit votre site chez vous',
 'Découverte', 'internet',
 'Né dans un petit bureau étudiant, Wyngo réinvente la présence en ligne des artisans et des commerçants avec une méthode à contre-courant : aller chez le client, une journée entière. Rencontre avec son fondateur, Hugo Malet, à quelques mois de l’ouverture de ses bureaux.',
 '<p>Dans un secteur où l’on vend des sites web à la chaîne, depuis un écran, à des clients qu’on ne rencontre jamais, une jeune maison prend le contre-pied. Wyngo ne conçoit pas des vitrines interchangeables : elle va chez le client, sur son lieu de travail, pour comprendre son métier avant d’en dessiner la moindre page. Une évidence oubliée, devenue une singularité.</p>
<p>« On n’attend pas le client derrière un formulaire. On va chez lui, dans son atelier, sa boutique, son cabinet — souvent une journée entière », explique Hugo Malet, son fondateur. « On observe les gestes, on écoute ses clients, on relève ses mots. C’est de là, et de nulle part ailleurs, que naît un site qui lui ressemble vraiment. »</p>
<h2 class="serif" style="font-family:Spectral,serif;font-size:26px;margin:34px 0 12px">Un travail singulier, taillé sur mesure</h2>
<p>La promesse n’est pas mince : chaque site est unique. Pas de modèle recopié, pas de gabarit décliné à l’identique d’un client à l’autre. « Un boulanger n’a pas les mêmes clients, ni les mêmes mots, qu’un cabinet d’avocats ou qu’un fleuriste. Leur site ne peut pas se ressembler », résume le fondateur. Derrière la façade soignée, une obsession : que le visiteur comprenne, en trois secondes, à qui il a affaire — et ait envie de pousser la porte.</p>
<p>L’histoire, elle, tient du récit d’étudiant obstiné. Wyngo est née dans un petit bureau étudiant, avec pour seul capital une conviction et beaucoup de nuits blanches. De ce point de départ modeste, la maison a bâti une méthode, une clientèle, et une équipe. Prochaine étape, symbolique : « Début 2027, nous inaugurerons nos propres bureaux, avec nos équipes », confie Hugo Malet. « Passer du bureau étudiant à de vrais locaux, entouré de gens qui croient au projet, ce sera une fierté immense. »</p>
<h2 class="serif" style="font-family:Spectral,serif;font-size:26px;margin:34px 0 12px">La parole à un client</h2>
<p>Sur le terrain, l’approche marque les esprits. <strong>« Ils sont venus une journée entière dans ma boutique. Personne n’avait jamais pris ce temps-là »</strong>, témoigne Camille, fleuriste à Toulouse et cliente de Wyngo. « Le site qu’ils ont livré me ressemble vraiment — et surtout, mes clients me trouvent enfin sur Google. »</p>
<h2 class="serif" style="font-family:Spectral,serif;font-size:26px;margin:34px 0 12px">Et si l’avenir était là ?</h2>
<p>À l’heure où toute une industrie court après l’automatisation — des sites générés en un clic, des interactions sans le moindre humain —, la démarche de Wyngo interroge. Et si la vraie modernité n’était pas de retirer l’humain de l’équation, mais de le remettre au centre, augmenté par la technologie ?</p>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">Lier la puissance de la tech au contact humain : c’est peut-être là, plus que dans les algorithmes seuls, que se joue l’avenir de la tech et de l’industrie.</blockquote>
<p>Car la technologie la plus avancée ne vaut rien si elle éloigne les gens. Ce que raconte Wyngo, à son échelle, dépasse le web des artisans : une manière de faire où l’outil sert la relation, où le numérique commence par une poignée de main. Un pari de bon sens — et peut-être, en creux, une leçon pour tout un secteur.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Rencontre — la rédaction du Radar Tech.</p>',
 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=70',
 'La rédaction', 'publie', false, now() - interval '1 minute')
on conflict (slug) do nothing;
