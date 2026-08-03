/**
 * Script de référence et banque d'objections — méthode Group Arsène.
 * Inséré dans la base à la demande de l'utilisateur via le bouton
 * "Importer le script de référence" sur la page /scripts.
 *
 * Les variables {{prenom}} {{entreprise}} {{expediteur}} sont remplacées
 * automatiquement quand on lance le Mode appel depuis la fiche d'un prospect.
 */

export type SeedScript = {
  kind: "script" | "objection";
  title: string;
  content: string;
  category: string;
};

export const REFERENCE_CALL_SCRIPT: SeedScript = {
  kind: "script",
  title: "Appel à froid — Méthode Group Arsène (5 phases)",
  category: "prise_contact",
  content: `PHASE 1 — La transparence du Fondateur (La rupture)

« Bonjour {{prenom}}, c'est {{expediteur}}, je suis le fondateur du cabinet Group Arsène. »

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

« Ma vision en fondant Group Arsène, c'était d'en finir avec les sites "cartes de visite" qui coûtent de l'argent et ne font rien. Mon cabinet construit des commerciaux digitaux qui travaillent 24h/24 pour vous ramener du chiffre d'affaires. Mon obsession, c'est une seule chose : vous faire arriver en tête quand vos clients vous cherchent sur Google.

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

→ RÈGLE D'OR DU CLOSE : propose TOUJOURS 2 créneaux précis. Jamais "quand ça vous arrange" (= flou = ça ne se fait jamais). Il choisit, tu confirmes la date à voix haute, tu raccroches. L'objectif de l'appel est atteint : le prochain pas est calé.`,
};

export const REFERENCE_OBJECTIONS: SeedScript[] = [
  {
    kind: "objection",
    title: "« Je n'ai pas le temps »",
    category: "timing",
    content: `« Je comprends parfaitement, c'est précisément pour cette raison que je vous demande seulement 45 secondes — pas une minute. Vous décidez après si vous voulez en savoir plus. Si dans 45 secondes vous me dites "non merci", on raccroche et je ne vous rappellerai jamais. C'est juste ? »`,
  },
  {
    kind: "objection",
    title: "« Envoyez-moi un email »",
    category: "esquive",
    content: `« Bien sûr, je peux vous envoyer un email — mais entre nous, vous savez ce qui se passe : il va atterrir parmi 200 autres et vous ne le lirez jamais. Si ça ne vous dérange pas, laissez-moi vous expliquer en 60 secondes pourquoi je vous appelle vous précisément, et si ça ne vous parle pas, je vous laisse tranquille définitivement. »`,
  },
  {
    kind: "objection",
    title: "« C'est trop cher »",
    category: "prix",
    content: `« La question n'est pas "combien ça coûte" mais "combien ça vous rapporte". Sur nos derniers projets, le retour sur investissement moyen constaté est de 7 semaines. Donc concrètement, dans 2 mois votre site est rentabilisé, et après chaque mois est du pur bénéfice. Vous préférez payer 0 € pour un site qui ne fait rien ou investir une fois pour un site qui ramène du CA ? »`,
  },
  {
    kind: "objection",
    title: "« J'ai déjà un site / un prestataire »",
    category: "concurrent",
    content: `« Si votre site actuel vous ramène déjà du chiffre d'affaires concret chaque mois, ne touchez à rien — vous êtes au top. Mais si vous me dites honnêtement qu'il est là juste pour "exister", alors on a un vrai sujet à se dire. Combien de clients votre site vous ramène concrètement ces 30 derniers jours ? »`,
  },
  {
    kind: "objection",
    title: "« Je dois en parler à mon associé / ma femme »",
    category: "decideur",
    content: `« C'est la meilleure démarche, c'est exactement ce que je ferais à votre place. Justement, plutôt que de leur en parler à froid, laissez-moi vous envoyer la maquette en 48 heures comme prévu. Vous la regardez ensemble, vous décidez ensemble. Comme ça vous arrivez avec quelque chose de concret à discuter, pas une promesse théorique. Ça vous semble juste ? »`,
  },
  {
    kind: "objection",
    title: "« Rappelez-moi dans 3 mois »",
    category: "timing",
    content: `« Pas de problème, je note. Juste une question avant qu'on raccroche : qu'est-ce qui aura changé dans 3 mois ? Parce que si c'est une question d'agenda, on prend juste 15 minutes la semaine prochaine. Si c'est une question budget, on peut aussi en parler maintenant — on n'est pas obligés de démarrer tout de suite. Qu'est-ce qui se cache vraiment derrière les 3 mois ? »`,
  },
  {
    kind: "objection",
    title: "« Le bouche-à-oreille me suffit »",
    category: "besoin",
    content: `« C'est une super base, ça prouve que vos clients sont contents. Mais le bouche-à-oreille a une limite : il ne touche que les gens qui vous connaissent déjà. Tous ceux qui cherchent votre métier sur Google sans vous connaître — eux, ils tombent sur vos concurrents. Un bon site, c'est votre bouche-à-oreille qui tourne 24h/24, même auprès de gens qui n'ont jamais entendu parler de vous. »`,
  },
  {
    kind: "objection",
    title: "« Je m'en occupe moi-même / on me l'a déjà fait »",
    category: "concurrent",
    content: `« Et c'est tout à votre honneur d'avoir lancé quelque chose. La vraie question, ce n'est pas "qui l'a fait", c'est : est-ce qu'il vous ramène des clients, ou est-ce qu'il est juste "en ligne" ? Aujourd'hui, faire un site, tout le monde peut. Faire un site qui vous met en tête sur Google et qui transforme les visiteurs en clients, c'est un autre métier — c'est le mien. Laissez-moi vous le prouver avec une maquette, gratuitement, et vous comparez. »`,
  },
  {
    kind: "objection",
    title: "Voicemail (message à laisser)",
    category: "voicemail",
    content: `« Bonjour {{prenom}}, c'est {{expediteur}}, fondateur du cabinet Group Arsène à Toulouse. Je vous appelle au sujet de {{entreprise}}, j'ai une idée précise concernant votre présence en ligne et je préférerais vous en parler de vive voix plutôt que par email. Je rappelle demain entre 10h et 11h, sinon vous pouvez me joindre directement au [votre numéro]. Excellente journée. »`,
  },
];
