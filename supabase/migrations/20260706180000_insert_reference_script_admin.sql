-- Insère la trame de premier appel (référentiel Méthode Wyngo) dans le compte admin,
-- pour qu'elle apparaisse dans l'onglet « Scripts d'ouverture » sans dépendre d'un bouton.
insert into public.call_scripts (owner_id, kind, title, content, category, is_shared, position)
select ur.user_id, 'script', $t$Appel à froid — Méthode Wyngo (5 phases)$t$, $c$PHASE 1 — La transparence du Fondateur (La rupture)

« Bonjour {{prenom}}, c'est {{expediteur}}, je suis le fondateur du cabinet Wyngo. »

→ Silence de 2 secondes. Il doit entendre "fondateur" et se dire que ce n'est pas un appel de call-center.

« Je préfère être d'une transparence totale avec vous : c'est un appel de prospection. Souvent, c'est le moment où on me dit qu'on n'a pas le temps. Mais en tant que dirigeant, je choisis personnellement les entreprises que je contacte, et je vous appelle pour une raison très précise concernant {{entreprise}}.

Est-ce que vous m'accordez 45 secondes pour vous expliquer pourquoi, et ensuite vous décidez si on raccroche ? »


PHASE 2 — Le "Tilt" Émotionnel (Le cœur du message)

→ OPTION A — Il a déjà un site internet (l'approche "La porte trop lourde")

« J'ai pris le temps de bien analyser votre site actuel. Franchement, visuellement il est très réussi, on sent vraiment l'ADN de votre entreprise et on voit que vous y avez mis du cœur.

Mais je vais vous partager une réflexion qui surprend souvent les entrepreneurs...

Aujourd'hui, votre site agit comme une magnifique vitrine d'une boutique dans la rue. Les gens s'arrêtent, ils trouvent ça beau, ils voient vos services... mais la porte du magasin est beaucoup trop lourde à pousser. Il manque cette mécanique psychologique invisible qui transforme un visiteur qui 'regarde' en un client qui se dit : 'C'est lui qu'il me faut, je l'appelle tout de suite'. C'est précisément cette bascule que je crée. »


→ OPTION B — Il n'a pas de site (l'approche "Le secret le mieux gardé")

« Je faisais des recherches sur les [Métier du prospect] dans la région, et j'ai vu que vous aviez une excellente réputation. Le problème, c'est qu'aujourd'hui, vous êtes le secret le mieux gardé de votre secteur.

Quand on ne vous connaît pas personnellement via le bouche-à-oreille, vous n'existez pas en ligne. Concrètement, vous avez des clients qui sortent leur carte bleue tous les jours pour vos services, mais ils finissent chez vos concurrents simplement parce qu'ils sont plus visibles que vous. »


→ OPTION C — Il a un site correct mais introuvable sur Google (l'approche "La boutique dans l'impasse")

« J'ai regardé votre site, il est correct. Mais j'ai fait un test tout simple : j'ai tapé sur Google "[votre métier] + Toulouse"… et vous n'apparaissez nulle part.

C'est comme avoir une belle boutique, mais dans une impasse où personne ne passe. Vous existez, mais chaque jour des dizaines de personnes cherchent exactement ce que vous faites — et c'est vos concurrents qu'elles trouvent, pas vous. C'est précisément ce que je viens corriger : vous rendre visible là où ça compte. »


PHASE 3 — La Vision de l'Entrepreneur

« Ma vision en fondant Wyngo, c'était d'en finir avec les sites "cartes de visite" qui coûtent de l'argent et ne font rien. Mon cabinet construit des commerciaux digitaux qui travaillent 24h/24 pour vous ramener du chiffre d'affaires. Mon obsession, c'est une seule chose : vous faire arriver en tête quand vos clients vous cherchent sur Google.

Et il y a une urgence que peu voient venir : Google passe aux réponses par intelligence artificielle. Demain, l'IA ne recommandera qu'une poignée d'entreprises par recherche. Pour en faire partie, il faut un site conçu pour ça — et c'est exactement ce qu'on fait. »

→ Silence de 1 à 2 secondes.

« Mais mon but, ce n'est absolument pas de vous forcer la main pour vous vendre quelque chose aujourd'hui. »


PHASE 4 — L'Offre Irrésistible (La preuve par l'action)

« Je vous propose une démarche qu'on est quasiment les seuls à faire, et c'est du risque zéro pour vous. Laissez-moi travailler de mon côté. Je vais concevoir une maquette sur-mesure, un vrai prototype pensé uniquement pour la croissance de {{entreprise}}. Je vous l'envoie dans 48 heures, totalement à mes frais.

Vous la regardez tranquillement. Si ça vous fait l'effet 'Wahou' et que vous voyez le potentiel, on en discute. Si ça ne vous plaît pas, ou que ce n'est pas le moment, on en reste là et on se serre la main virtuellement.

Ça vous paraît juste de fonctionner comme ça ? »


PHASE 5 — L'Engagement en douceur (VERROUILLER le prochain pas)

→ S'il dit oui :

« Super. Concrètement voilà comment on procède : on bloque 20 minutes ensemble pour que je cerne votre activité et le profil exact des clients que vous voulez attirer — c'est ce qui me permet de frapper juste sur la maquette.

Et si le courant passe, l'étape d'après c'est notre marque de fabrique, ce qu'aucune agence ne fait : je viens une demi-journée chez vous, sur place, pour vraiment capter votre univers, vos clients, votre ambiance. Un site qui vous ressemble, ça se comprend sur le terrain, pas derrière un écran.

Pour ce premier échange, vous êtes plutôt disponible [PROPOSER JOUR A — ex. mardi matin] ou [JOUR B — ex. jeudi après-midi] ? »

→ RÈGLE D'OR DU CLOSE : propose TOUJOURS 2 créneaux précis. Jamais "quand ça vous arrange" (= flou = ça ne se fait jamais). Il choisit, tu confirmes la date à voix haute, tu raccroches. L'objectif de l'appel est atteint : le prochain pas est calé.$c$, 'prise_contact', false, 0
from public.user_roles ur
where ur.role = 'admin'
  and not exists (
    select 1 from public.call_scripts cs
    where cs.owner_id = ur.user_id and cs.title = $t$Appel à froid — Méthode Wyngo (5 phases)$t$
  );
