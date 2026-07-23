-- ─── Le Radar Tech — suppression des redites (ré-angulage, titres inchangés) ──
-- 1) "europe-outils-numeriques" recadré sur les LOGICIELS européens (plus de
--    doublon avec l'article cloud/souveraineté qui garde Klaba + les 180 M€).
-- 2) "presence-en-ligne-actif" recadré sur la bascule annuaire→numérique (ne
--    reprend plus les stats du référencement local).
-- 3) "email-newsletter" recentré sur le phénomène média (n'empiète plus sur
--    l'article "audience/plateformes").

update public.radar_articles set body =
'<p>Longtemps, la question a semblé rhétorique : dans le logiciel grand public, l’Europe consommerait ce que la Silicon Valley concevrait. Puis une génération de créateurs européens a décidé de proposer, pour chaque outil du quotidien, une alternative née sur le continent.</p>
<p>La messagerie chiffrée a son champion suisse, Proton ; la recherche, son acteur français, Qwant ; l’intelligence artificielle, sa pépite parisienne, Mistral. Pour la bureautique et le stockage, l’allemand Nextcloud propose de tout héberger chez soi, quand les français de CryptPad chiffrent les documents de bout en bout et qu’Anytype rejoue Notion à la sauce vie privée. Jusqu’au matériel : Framework et ses ordinateurs réparables incarnent la même philosophie.</p>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">Pour presque chaque géant américain, il existe désormais une alternative européenne — souvent plus respectueuse, rarement plus connue.</blockquote>
<p>Ce que ces maisons mettent en avant n’est pas la démesure, mais ce que les géants négligent : la confidentialité, le respect du règlement européen sur les données, la proximité, parfois l’ouverture du code. Des annuaires entiers recensent aujourd’hui ces alternatives, signe d’une demande réelle.</p>
<p>Le vrai défi n’est pas technique, il est culturel. Changer d’outil, c’est bousculer une habitude ; préférer une solution européenne suppose d’en connaître l’existence et d’accepter, parfois, un léger inconfort. C’est là, plus que dans les laboratoires, que se jouera la prochaine décennie : dans la capacité du continent à faire de la souveraineté non un slogan, mais un réflexe d’usage.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Sources : éditeurs cités (Proton, Qwant, Mistral, Nextcloud, CryptPad, Anytype, Framework) ; annuaires d’alternatives européennes.</p>'
where slug = 'europe-outils-numeriques';

update public.radar_articles set body =
'<p>Il n’y a pas si longtemps, trouver un plombier ou une bonne table tenait à deux gestes : feuilleter l’annuaire papier, ou demander au voisin. En une décennie, ce réflexe s’est effacé. La découverte d’un commerce local s’est entièrement déplacée en ligne — sur une carte, dans une recherche, au fil des avis.</p>
<p>Pour l’artisan et le commerçant, le bouleversement est profond. Le client ne se déplace plus pour comparer ; il tranche depuis son téléphone, avant même d’avoir poussé une porte. Celui qu’on ne trouve pas en ligne n’existe tout simplement pas pour lui — quelle que soit la qualité de son travail.</p>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">Une page sur un réseau social, on la loue ; un site, on le possède. La nuance décide, à terme, de qui contrôle sa clientèle.</blockquote>
<p>Beaucoup se contentent d’une page sur un réseau social. C’est mieux que rien, mais c’est bâtir sur un terrain d’autrui : règles qui changent, portée qui s’effondre, compte que l’on peut perdre. Le site que l’on possède, lui, reste — trouvable sur Google, relié à une adresse que l’on maîtrise, nourri de ses propres contenus.</p>
<p>C’est précisément ce que conçoivent des cabinets comme <a href="https://wyngo.fr">Wyngo</a> pour les artisans : non pas une vitrine décorative, mais un actif durable, pensé pour être trouvé et pour inspirer confiance. Car dans le commerce de proximité, la présence en ligne n’a pas remplacé le bouche-à-oreille : elle en est devenue le prolongement naturel.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Analyse — la rédaction du Radar Tech.</p>'
where slug = 'presence-en-ligne-actif';

update public.radar_articles set body =
'<p>On l’enterre à chaque génération d’applications, et pourtant il survit à toutes. À plus de cinquante ans, l’e-mail vit une seconde jeunesse dans les médias — sous la forme de la lettre d’information.</p>
<p>Le phénomène est spectaculaire dans le journalisme. Des reporters quittent les rédactions pour lancer leur propre newsletter, emmenant leur audience avec eux ; des plateformes entières se sont bâties sur cette promesse. Ce qui les attire n’est pas la technologie, c’est la relation directe : une lettre arrive dans une boîte mail, sans intermédiaire, sans algorithme pour décider qui la verra.</p>
<figure style="margin:26px 0"><img src="https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=1200&q=70" alt="Écriture et presse" style="width:100%;border-radius:3px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">La newsletter, retour à un lien direct entre l’auteur et son lecteur. — Unsplash</figcaption></figure>
<blockquote style="font-family:Spectral,serif;font-size:22px;line-height:1.4;font-style:italic;border-left:3px solid #9a2a2a;padding-left:18px;margin:28px 0;color:#2c2823">Une boîte mail est l’un des derniers endroits du web où l’auteur parle à son lecteur sans qu’un tiers s’interpose.</blockquote>
<p>Ce retour en grâce raconte une lassitude : celle des flux saturés, des portées imprévisibles, des contenus interchangeables. Face à cela, la newsletter impose une discipline salutaire — la régularité, l’utilité, un ton. Une lettre lue est une lettre attendue ; le remplissage, lui, se paie d’un désabonnement.</p>
<p>Le paradoxe est savoureux : à l’ère de l’intelligence artificielle et des réseaux tout-puissants, c’est la plus ancienne technologie du web qui offre aux créateurs ce que les plateformes leur reprennent — un public qui leur appartient vraiment.</p>
<p style="font-size:13px;color:#5c5852;margin-top:28px;border-top:1px solid #e3e0d8;padding-top:12px">Analyse — la rédaction du Radar Tech.</p>'
where slug = 'email-newsletter-reprend-pouvoir';
