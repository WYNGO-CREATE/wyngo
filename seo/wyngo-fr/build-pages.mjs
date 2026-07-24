// ─────────────────────────────────────────────────────────────────────────
// build-pages.mjs — Génère les pages de réponse de wyngo.fr
//
// POURQUOI : wyngo.fr était UNE seule page. Une page = une seule porte
// d'entrée pour Google et pour les aperçus IA. Ces pages ciblent chacune une
// question réellement tapée par les prospects, et y répondent en tête de page
// (c'est cet extrait que les aperçus IA citent).
//
// RÈGLE ABSOLUE : aucun chiffre, aucune promesse qui ne soit déjà sur wyngo.fr.
// On ne fabrique pas de tarif, de délai ni de référence client.
//
// Usage : node build-pages.mjs   (puis vercel deploy --prod)
// ─────────────────────────────────────────────────────────────────────────
import { writeFileSync } from "node:fs";

const SITE = "https://wyngo.fr";
const TEL = "+33619379269";
const TEL_AFF = "06 19 37 92 69";
const KG = "https://www.google.com/search?kgmid=/g/11zcsg1p32";
const MAJ = "2026-07-24";

// Identité visuelle reprise à l'identique du site.
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#F7F4EC;--bg2:#F0ECE0;--card:#FCFBF6;--ink:#141410;--mut:#14141099;--mut2:#14141066;--line:#14141021;--accent:#1B4BE3}
body{background:var(--bg);color:var(--ink);font:16px/1.65 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:760px;margin:0 auto;padding:0 24px}
nav{border-bottom:1px solid var(--line);background:var(--bg)}
nav .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
.wm{font:600 20px/1 Inter,sans-serif;letter-spacing:-.02em}
.wm-tag{display:block;font-size:11px;color:var(--mut2);margin-top:3px;letter-spacing:.02em}
nav a{color:var(--mut);text-decoration:none;font-size:14px}
nav a:hover{color:var(--ink)}
header{padding:64px 0 40px}
.bc{font-size:13px;color:var(--mut2);margin-bottom:20px}
.bc a{color:var(--mut);text-decoration:none}.bc a:hover{color:var(--ink)}
h1{font:400 clamp(30px,5vw,44px)/1.15 Georgia,'Times New Roman',serif;letter-spacing:-.02em;margin-bottom:20px}
.lede{font-size:19px;line-height:1.6;color:var(--ink);border-left:3px solid var(--accent);padding-left:20px;margin-bottom:8px}
main{padding-bottom:72px}
h2{font:400 clamp(22px,3.4vw,28px)/1.25 Georgia,serif;margin:44px 0 14px;letter-spacing:-.01em}
h3{font:600 17px/1.4 Inter,sans-serif;margin:26px 0 8px}
p{margin-bottom:14px;color:#141410cc}
ul{margin:0 0 16px 20px}li{margin-bottom:8px;color:#141410cc}
strong{color:var(--ink);font-weight:600}
a{color:var(--accent)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:24px;margin:28px 0}
.faq{border-top:1px solid var(--line);padding-top:18px;margin-top:14px}
.faq h3{margin-top:0}
.cta{background:var(--ink);color:#F7F4EC;border-radius:16px;padding:34px;margin:48px 0 0;text-align:center}
.cta h2{color:#F7F4EC;margin:0 0 10px}
.cta p{color:#F7F4ECb3;margin-bottom:22px}
.btn{display:inline-block;background:var(--accent);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px}
.rel{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.rel a{font-size:14px;background:var(--bg2);border:1px solid var(--line);padding:8px 14px;border-radius:999px;text-decoration:none;color:var(--ink)}
footer{border-top:1px solid var(--line);padding:28px 0;font-size:13px;color:var(--mut2)}
footer a{color:var(--mut)}
@media(max-width:600px){header{padding:40px 0 28px}.lede{font-size:17px}}
`;

// Chaque page vise une question réelle. `reponse` est LA réponse directe que
// les aperçus IA extraient : concise, factuelle, autoportante.
const PAGES = [
  {
    slug: "creation-site-internet-toulouse",
    title: "Création de site internet à Toulouse — Wyngo",
    h1: "Création de site internet à Toulouse",
    desc: "Sites internet sur-mesure pour artisans, commerçants et TPE à Toulouse. Immersion sur le terrain, textes et photos inclus, code source remis.",
    reponse:
      "Wyngo est un cabinet de présence digitale basé à Toulouse qui conçoit des sites internet sur-mesure pour les artisans, commerçants, professions libérales et TPE. La particularité de sa méthode : une journée d'immersion dans l'entreprise du client, pendant laquelle les textes sont rédigés et les photos produites sur place. Le code source est remis au client à la livraison.",
    sections: [
      { h: "Une méthode qui commence sur le terrain", p: [
        "La plupart des sites échouent pour une raison simple : ils sont écrits depuis un bureau, par quelqu'un qui n'a jamais vu le métier de près. Le résultat est une brochure interchangeable, qui pourrait appartenir à n'importe quel concurrent.",
        "Wyngo procède autrement. Le travail commence par une <strong>journée d'immersion</strong> dans votre entreprise : on observe comment vous travaillez, ce que vous dites à vos clients, ce qui vous distingue réellement. Les textes sont rédigés à partir de ce que vous dites vraiment, et les photos sont produites sur place — pas achetées sur une banque d'images.",
      ]},
      { h: "Ce que comprend la prestation", p: [
        "Tout le travail est inclus, sans ligne surprise :",
      ], ul: [
        "Une journée d'immersion dans votre entreprise",
        "La rédaction complète de vos textes",
        "La production de vos photos",
        "L'optimisation du référencement local",
        "La remise du code source — le site vous appartient entièrement",
      ]},
      { h: "Pour qui ?", p: [
        "Artisans et commerçants, professions libérales, startups et PME de Toulouse et sa périphérie — jusqu'à une trentaine de kilomètres. Chaque métier a ses codes : un site de boulangerie ne se construit pas comme un site de cabinet d'avocats.",
      ]},
    ],
    faq: [
      { q: "Combien de temps faut-il pour créer un site internet ?", a: "Chez Wyngo, la première maquette est présentée sous 48 heures et la mise en ligne intervient sous 21 jours. Ce rythme est possible parce que le cabinet ne sélectionne que 9 entrepreneurs par trimestre." },
      { q: "Le site m'appartient-il vraiment ?", a: "Oui. Le code source vous est remis à la livraison : vous n'êtes prisonnier d'aucun prestataire et pouvez faire évoluer votre site où vous le souhaitez." },
      { q: "Faut-il payer avant de voir quelque chose ?", a: "Non. Aucun euro n'est demandé avant que vous validiez la première maquette. Vous ne payez que si le travail vous convainc." },
    ],
  },
  {
    slug: "prix-creation-site-internet-toulouse",
    title: "Prix d'un site internet à Toulouse — Wyngo",
    h1: "Combien coûte un site internet pour une TPE ?",
    desc: "Ce qui détermine réellement le prix d'un site internet professionnel : le contenu, les photos, le référencement et le suivi. Et la garantie Wyngo : 0 € avant validation de la maquette.",
    reponse:
      "Le prix d'un site internet professionnel dépend surtout de ce qui n'est pas visible : qui rédige les textes, qui produit les photos, si le référencement local est traité, et si un suivi est assuré après la mise en ligne. Un site livré sans contenu propre coûte moins cher à produire, mais laisse tout le travail au client. Chez Wyngo, aucun paiement n'est demandé avant que le client ait validé la première maquette.",
    sections: [
      { h: "Les quatre postes qui font vraiment le prix", p: [
        "Comparer deux devis de sites internet n'a aucun sens si on ne compare pas ce qu'ils contiennent. Quatre postes expliquent l'essentiel de l'écart :",
      ], ul: [
        "<strong>Le contenu</strong> — des textes rédigés spécifiquement pour votre métier, ou des paragraphes génériques à remplir vous-même ?",
        "<strong>Les visuels</strong> — des photos de votre entreprise, ou des images de banque que vos concurrents utilisent aussi ?",
        "<strong>Le référencement local</strong> — le site est-il conçu pour ressortir sur les recherches de votre ville, ou simplement mis en ligne ?",
        "<strong>Le suivi</strong> — quelqu'un mesure-t-il les résultats après la livraison, ou le site est-il abandonné le jour de la mise en ligne ?",
      ]},
      { h: "Le piège du site pas cher", p: [
        "Un site à bas coût n'est pas une économie s'il ne ramène personne. Le coût réel d'un site invisible, c'est l'ensemble des clients qui ont cherché votre métier dans votre ville et ont trouvé un concurrent. Ce coût-là ne figure sur aucun devis.",
      ]},
      { h: "La garantie Wyngo", p: [
        "Pour lever le risque, le cabinet applique une règle simple : <strong>aucun euro n'est demandé avant que vous ayez validé la première maquette</strong>. Vous voyez d'abord, vous décidez ensuite. Et le code source vous est remis, donc vous n'êtes jamais captif.",
      ]},
    ],
    faq: [
      { q: "Qu'est-ce qui est inclus dans le prix d'un site Wyngo ?", a: "L'intégralité du travail : une journée d'immersion, la rédaction de vos textes, la production de vos photos, l'optimisation du référencement local, et la remise du code source — le site vous appartient en entier." },
      { q: "Comment être sûr du retour sur investissement ?", a: "Parce qu'on ne construit pas une vitrine mais un outil de conversion : chaque page, chaque image, chaque ligne a un rôle — faire passer un visiteur à l'action. Et les résultats sont mesurés chaque mois." },
      { q: "Y a-t-il un acompte à verser ?", a: "Non. Aucun paiement n'est demandé avant la validation de la première maquette." },
    ],
  },
  {
    slug: "referencement-local-google-toulouse",
    title: "Être visible sur Google à Toulouse : référencement local — Wyngo",
    h1: "Comment être visible sur Google quand on est une entreprise locale ?",
    desc: "Les leviers réels du référencement local à Toulouse : fiche Google Business, cohérence des informations, avis clients et contenu ancré dans la ville.",
    reponse:
      "Pour qu'une entreprise locale apparaisse sur Google, quatre éléments comptent avant tout : une fiche Google Business complète et vérifiée, des informations strictement identiques partout sur le web (nom, adresse, téléphone), des avis clients authentiques et réguliers, et un site dont le contenu est réellement ancré dans la ville et le métier. La proximité géographique du chercheur joue aussi un rôle déterminant.",
    sections: [
      { h: "La fiche Google Business passe avant le site", p: [
        "Pour une recherche locale, c'est souvent la fiche Google Business — pas le site — qui décide de votre visibilité. Une fiche incomplète, sans photos ni horaires, sans catégorie précise, ne ressort pas. C'est le premier chantier, avant toute refonte.",
      ]},
      { h: "La cohérence des informations", p: [
        "Google recoupe en permanence votre nom, votre adresse et votre téléphone à travers tout le web. La moindre variation — un numéro différent ici, une orthographe changée là — affaiblit le lien entre vos différentes présences. <strong>Un seul numéro, une seule orthographe, partout.</strong>",
      ]},
      { h: "Les avis, levier le plus sous-estimé", p: [
        "Les avis clients pèsent lourd dans le classement local, et surtout ils déterminent le clic. À classement égal, une entreprise avec vingt avis récents l'emporte sur une entreprise sans avis. C'est le levier le moins coûteux et le plus rapide à activer.",
      ]},
      { h: "Un contenu réellement local", p: [
        "Un site qui ne nomme jamais sa ville, ses quartiers, ses interventions concrètes, ne donne à Google aucune raison de le rattacher à un territoire. Le contenu doit dire où vous travaillez et pour qui.",
      ]},
    ],
    faq: [
      { q: "Combien de temps pour voir des résultats en référencement local ?", a: "Le référencement local demande de la constance : les effets d'une fiche complétée et d'avis réguliers se voient généralement en quelques semaines, tandis que l'autorité d'un site se construit sur plusieurs mois." },
      { q: "Faut-il un site pour apparaître sur Google Maps ?", a: "Non, une fiche Google Business suffit pour apparaître sur Maps. Mais un site cohérent avec la fiche renforce nettement la crédibilité de l'entreprise aux yeux de Google et des clients." },
      { q: "Les avis clients influencent-ils vraiment le classement ?", a: "Oui. Le nombre, la fraîcheur et la régularité des avis comptent parmi les signaux les plus influents du classement local, en plus de leur effet direct sur la décision du client." },
    ],
  },
  {
    slug: "site-internet-artisan-commercant",
    title: "Site internet pour artisan et commerçant — Wyngo Toulouse",
    h1: "Site internet pour artisan et commerçant",
    desc: "Un site conçu pour un métier manuel ne se construit pas comme une vitrine d'entreprise. Immersion sur le terrain, photos réelles, référencement local. Wyngo, Toulouse.",
    reponse:
      "Pour un artisan ou un commerçant, un site internet efficace repose sur trois choses : des photos réelles du travail accompli, des textes qui parlent le langage des clients plutôt que le jargon du métier, et un référencement ancré dans la ville où l'activité s'exerce. Wyngo produit ces éléments sur place, lors d'une journée d'immersion dans l'entreprise.",
    sections: [
      { h: "Votre travail se montre, il ne se décrit pas", p: [
        "Un artisan se juge sur ce qu'il produit. Aucune description, aussi bien écrite soit-elle, ne remplace la photo d'un chantier terminé, d'une vitrine soignée, d'une pièce fabriquée. C'est pour cette raison que les photos sont produites sur place, chez vous, et non achetées.",
      ]},
      { h: "Parler comme vos clients, pas comme votre métier", p: [
        "Vos clients ne cherchent pas les termes techniques de votre profession : ils décrivent leur problème avec leurs mots. Un site qui reprend ces mots-là est trouvé ; un site rédigé en jargon reste invisible.",
      ]},
      { h: "Chaque métier a ses codes", p: [
        "Une boulangerie a besoin de donner faim en trois secondes. Un plombier doit rassurer et être joignable immédiatement. Un cabinet d'avocats doit inspirer confiance et autorité. Le même modèle de site ne peut pas servir ces trois intentions.",
      ]},
    ],
    faq: [
      { q: "Faut-il un site quand on a déjà une fiche Google ?", a: "La fiche Google fait connaître votre existence ; le site convainc. L'une amène le visiteur, l'autre transforme sa visite en prise de contact. Les deux se renforcent mutuellement." },
      { q: "Qui écrit les textes de mon site ?", a: "Wyngo les rédige, à partir d'une journée d'immersion dans votre entreprise. Vous n'avez pas de contenu à fournir ni de formulaire à remplir." },
      { q: "Et si je ne suis pas à l'aise avec l'informatique ?", a: "C'est précisément le principe : le cabinet vient chez vous et prend le travail en charge de bout en bout. Vous validez, vous ne produisez pas." },
    ],
  },
  {
    slug: "refonte-site-internet-toulouse",
    title: "Refonte de site internet à Toulouse — Wyngo",
    h1: "Quand faut-il refaire son site internet ?",
    desc: "Les signaux qui indiquent qu'un site coûte plus qu'il ne rapporte : illisible sur mobile, invisible sur Google, lent, sans données structurées. Diagnostic et refonte à Toulouse.",
    reponse:
      "Un site doit être refait lorsqu'il ne remplit plus sa fonction : s'il s'affiche mal sur téléphone, s'il n'apparaît pas sur les recherches de votre métier dans votre ville, s'il met plusieurs secondes à charger, ou s'il ne contient aucune donnée structurée permettant à Google et aux moteurs de réponse par IA de le comprendre. Ces quatre défauts se vérifient objectivement, sans jugement esthétique.",
    sections: [
      { h: "Les signaux qui ne trompent pas", p: [
        "L'apparence d'un site est subjective ; son efficacité ne l'est pas. Quatre défauts se mesurent :",
      ], ul: [
        "<strong>Il est cassé sur mobile</strong> — or l'essentiel des recherches locales se fait au téléphone.",
        "<strong>Il est lent</strong> — au-delà de quelques secondes, une grande partie des visiteurs ferment la page avant de l'avoir vue.",
        "<strong>Il est invisible</strong> — votre métier + votre ville ne le fait pas remonter.",
        "<strong>Il n'a pas de données structurées</strong> — sans elles, l'entreprise est quasi invisible pour les aperçus IA de Google.",
      ]},
      { h: "Refondre, ce n'est pas redécorer", p: [
        "Changer les couleurs d'un site qui ne convertit pas ne change rien. Une refonte utile reprend le problème à la racine : ce que vos clients cherchent, ce qu'ils doivent comprendre en trois secondes, et l'action qu'on attend d'eux.",
      ]},
      { h: "Ce que vous récupérez", p: [
        "À la livraison, le code source vous est remis. Vous n'êtes captif d'aucun prestataire, et votre site reste le vôtre — c'est notre manière de vous obliger à nous garder pour la qualité, pas par contrainte.",
      ]},
    ],
    faq: [
      { q: "Comment savoir si mon site est bien référencé ?", a: "Cherchez votre métier suivi de votre ville, en navigation privée. Si votre site n'apparaît ni dans les premiers résultats ni sur la carte, le référencement est à reprendre." },
      { q: "Peut-on garder son nom de domaine lors d'une refonte ?", a: "Oui, le nom de domaine se conserve : c'est même recommandé, car il porte l'ancienneté et la notoriété accumulées auprès de Google." },
      { q: "Que deviennent mes anciennes pages ?", a: "Elles doivent être redirigées vers les nouvelles, sans quoi le référencement acquis est perdu. C'est une étape technique incontournable de toute refonte sérieuse." },
    ],
  },
  {
    slug: "site-ou-page-facebook",
    title: "Site internet ou page Facebook : que choisir — Wyngo",
    h1: "Site internet ou page Facebook : lequel pour votre entreprise ?",
    desc: "Ce qu'apporte une page Facebook, ce qu'apporte un site internet, et pourquoi les deux remplissent des rôles distincts. Comparatif pour les professionnels.",
    reponse:
      "Une page Facebook et un site internet répondent à deux besoins distincts. Le réseau social entretient le lien avec une audience qui vous connaît déjà ; le site vous rend visible auprès des personnes qui recherchent votre activité sans vous connaître. Sur Facebook, vous dépendez d'une plateforme et de ses règles ; un site demeure votre propriété. Les deux sont complémentaires et ne se substituent pas l'un à l'autre.",
    sections: [
      { h: "Le réseau social fidélise une audience acquise", p: [
        "Une page Facebook est précieuse pour entretenir la relation avec votre clientèle existante : présenter une réalisation, annoncer une actualité, répondre à un message. Mais elle s'adresse avant tout à des personnes qui vous connaissent déjà. Un prospect qui recherche « plombier à proximité » n'atteint pas votre page Facebook.",
      ]},
      { h: "Le site capte une demande nouvelle", p: [
        "C'est la distinction déterminante. Un site correctement référencé apparaît lorsqu'une personne recherche votre activité sans connaître votre nom. C'est là que se génèrent les nouveaux contacts : non parmi ceux qui vous suivent déjà, mais parmi ceux qui ignorent encore votre existence.",
      ]},
      { h: "Sur une plateforme, vous êtes hébergé, non propriétaire", p: [
        "Votre page Facebook ne vous appartient pas. Les règles évoluent, la portée de vos publications décline, un compte peut être restreint sans préavis. Un site est votre propriété : nul ne peut vous en priver, et son adresse reste la vôtre durablement.",
      ]},
    ],
    faq: [
      { q: "Une page Facebook suffit-elle pour une entreprise ?", a: "Elle peut convenir au démarrage, mais vous restez invisible pour toutes les personnes qui recherchent votre activité sur Google sans connaître votre nom. Un site capte cette demande que le réseau social ne voit pas." },
      { q: "Faut-il fermer sa page Facebook si l'on possède un site ?", a: "Non : les deux se complètent. Le réseau social entretient la relation, le site attire les nouveaux clients. L'idéal est qu'ils se renvoient mutuellement." },
      { q: "Un site est-il plus contraignant à gérer qu'une page Facebook ?", a: "Pas avec Wyngo : le site est conçu, rédigé et mis en ligne pour vous. Vous n'avez aucune gestion technique à assurer — c'est le principe même de la prestation." },
    ],
  },
  {
    slug: "creer-site-sans-rien-connaitre-informatique",
    title: "Créer un site internet sans compétences techniques — Wyngo",
    h1: "Créer un site internet sans compétences techniques",
    desc: "Ni le temps, ni l'envie de vous former aux outils ? Wyngo conçoit l'intégralité du site : textes, photos, mise en ligne. Vous validez le résultat.",
    reponse:
      "Disposer d'un site internet professionnel ne requiert aucune compétence technique dès lors que la réalisation est entièrement déléguée. Chez Wyngo, vous n'intervenez sur aucun outil : le cabinet se déplace une journée dans votre entreprise, rédige vos textes, réalise vos photographies et met le site en ligne. Votre rôle se limite à valider le résultat.",
    sections: [
      { h: "Le frein n'est pas vous, c'est la méthode courante", p: [
        "La plupart des solutions reposent sur votre autonomie : choisir un modèle, rédiger vos textes, trouver des visuels, maîtriser des réglages. Pour un professionnel déjà accaparé par son métier, cela représente une seconde activité à temps plein. Rien d'étonnant à ce que tant de sites restent inachevés.",
      ]},
      { h: "Vous validez, vous ne produisez pas", p: [
        "La méthode de Wyngo inverse cette logique. Le cabinet se déplace une journée dans votre entreprise, observe votre manière de travailler et recueille votre discours. C'est <strong>lui</strong> qui rédige les textes et réalise les photographies. Aucun formulaire à compléter, aucun contenu à fournir.",
      ]},
      { h: "Le site demeure votre propriété", p: [
        "À la livraison, le code source vous est remis : le site vous appartient intégralement. Vous ne dépendez d'aucun prestataire. Et pour toute évolution, vous disposez d'un interlocuteur unique qui vous répond personnellement — non d'un service d'assistance anonyme.",
      ]},
    ],
    faq: [
      { q: "Je ne maîtrise pas l'informatique, est-ce un obstacle ?", a: "Non, c'est précisément le public visé. Vous n'ouvrez aucun logiciel et ne paramétrez rien. Le cabinet prend l'ensemble en charge et vous soumet un résultat à valider." },
      { q: "Que dois-je préparer en amont ?", a: "Rien. Les textes et les photographies sont produits sur place, lors de la journée d'immersion. Il suffit d'être disponible pour évoquer votre métier." },
      { q: "Et pour une modification ultérieure ?", a: "Vous disposez d'un interlocuteur unique chez Wyngo, qui vous répond personnellement. Le code source vous appartenant, vous n'êtes jamais bloqué." },
    ],
  },
  {
    slug: "site-internet-qui-rapporte-des-clients",
    title: "Pourquoi un site ne génère aucun client — Wyngo",
    h1: "Pourquoi un site internet ne génère-t-il aucun client ?",
    desc: "Disposer d'un site ne suffit pas : encore faut-il qu'il soit trouvé et qu'il incite au contact. Les trois causes les plus fréquentes d'un site improductif.",
    reponse:
      "Un site qui ne génère aucun client échoue presque toujours pour l'une de ces trois raisons : il n'est pas référencé et demeure introuvable, il n'inspire pas confiance faute de se distinguer, ou il n'oriente pas le visiteur vers une action précise. Un site n'est pas une vitrine que l'on installe puis délaisse : c'est un dispositif qui doit conduire un prospect jusqu'à la prise de contact.",
    sections: [
      { h: "Première cause : il n'est pas trouvé", p: [
        "Un site soigné que Google n'affiche jamais ne produit rien. S'il n'apparaît pas lorsqu'un prospect recherche votre activité dans votre secteur, aucun visiteur n'y accède — et un site sans visiteurs ne peut générer aucun contact. Le référencement n'est pas une option, c'est la condition d'accès.",
      ]},
      { h: "Deuxième cause : il n'inspire pas confiance", p: [
        "Un visiteur se forge un jugement en quelques secondes. Des visuels de banque d'images que vos concurrents emploient également, des textes convenus qui pourraient décrire n'importe quelle entreprise : tout cela renvoie l'image d'un prestataire interchangeable. Ce qui rassure, c'est l'authentique — votre visage, vos réalisations, vos mots.",
      ]},
      { h: "Troisième cause : il n'indique pas la marche à suivre", p: [
        "Beaucoup de sites négligent l'essentiel : préciser au visiteur ce que l'on attend de lui. Appeler ? Demander un devis ? Par quel moyen ? Un site performant guide le visiteur vers une action claire, à chaque page. À défaut, même un visiteur convaincu repart sans laisser de trace.",
      ]},
    ],
    faq: [
      { q: "Comment identifier pourquoi un site ne fonctionne pas ?", a: "En vérifiant trois points : sa présence sur Google pour votre activité, la confiance qu'il inspire dès les premières secondes, et la clarté du moyen de vous contacter. Une défaillance sur l'un des trois suffit à tout bloquer." },
      { q: "Un site improductif peut-il être redressé ?", a: "Souvent, oui. Nombre de sites disposent d'une base saine mais présentent un défaut précis — invisibilité sur Google, ou absence d'appel à l'action. Corriger ce point suffit parfois à débloquer les contacts." },
      { q: "En combien de temps un site génère-t-il des clients ?", a: "Cela dépend de votre marché, mais un site bien référencé et clair commence à produire des contacts à mesure qu'il gagne en visibilité, sur quelques semaines à quelques mois." },
    ],
  },
  {
    slug: "presence-en-ligne-petite-entreprise",
    title: "Présence en ligne d'une TPE : l'essentiel — Wyngo",
    h1: "Qu'est-ce qu'une présence en ligne efficace pour une TPE ?",
    desc: "Inutile d'être partout. Une présence en ligne efficace repose sur trois piliers : être trouvé, inspirer confiance, faciliter le contact.",
    reponse:
      "Pour une petite entreprise, une présence en ligne efficace ne consiste pas à occuper toutes les plateformes. Elle repose sur trois fondamentaux : être trouvé lorsqu'un prospect recherche votre activité, inspirer confiance en quelques secondes, et faciliter la prise de contact. Un site clair associé à une fiche Google à jour couvre ces trois besoins bien mieux qu'une présence dispersée sur de multiples réseaux.",
    sections: [
      { h: "Être trouvé", p: [
        "Le point de départ : lorsqu'un client potentiel recherche votre activité à proximité, vous devez apparaître. Cela suppose une fiche Google à jour et un site que le moteur comprend et positionne. Sans cette visibilité, tout le reste demeure invisible.",
      ]},
      { h: "Inspirer confiance", p: [
        "Une fois trouvé, il faut convaincre. Des photographies authentiques, un discours juste, quelques avis de clients satisfaits : voilà ce qui transforme un visiteur circonspect en client qui vous contacte. La confiance ne se décrète pas, elle se démontre.",
      ]},
      { h: "Faciliter le contact", p: [
        "Le dernier pilier est le plus négligé. Un numéro apparent, un formulaire simple, une adresse claire : le visiteur convaincu doit pouvoir vous joindre sans effort. Chaque obstacle entre son intention et son geste représente un client perdu.",
      ]},
      { h: "Le reste est secondaire", p: [
        "Il n'est pas nécessaire d'être présent sur tous les réseaux, de publier quotidiennement ou de suivre chaque tendance. Une petite entreprise gagne à accomplir peu de choses, mais bien : une présence solide sur ces trois piliers vaut mieux que dix profils partiellement renseignés.",
      ]},
    ],
    faq: [
      { q: "Faut-il être présent sur tous les réseaux sociaux ?", a: "Non. Mieux vaut une présence soignée là où vos clients vous recherchent qu'une dispersion sur de multiples plateformes que vous n'avez pas le temps d'alimenter. La qualité prime sur le nombre." },
      { q: "Un site suffit-il, ou faut-il aussi une fiche Google ?", a: "Les deux se complètent : la fiche Google assure votre présence sur la carte et dans les recherches locales, le site convainc et détaille votre offre. L'idéal est de disposer des deux, cohérents entre eux." },
      { q: "Par où commencer lorsqu'on part de zéro ?", a: "Par les fondations : une fiche Google complète et un site clair, cohérents l'un avec l'autre. C'est le socle sur lequel tout le reste s'appuie ensuite." },
    ],
  },
  {
    slug: "audit-site-internet",
    title: "Audit de site internet : le diagnostic complet — Wyngo",
    h1: "Audit de site internet : que faut-il examiner ?",
    desc: "Un audit évalue performance, référencement, mobile et conversion d'un site. Les points de contrôle qui décident de son efficacité réelle.",
    reponse:
      "Un audit de site internet consiste à évaluer objectivement quatre dimensions : la performance technique (vitesse, mobile, sécurité), le référencement (indexation, balises, données structurées), la qualité éditoriale et la capacité de conversion. Chacune se mesure sans jugement esthétique. L'audit révèle pourquoi un site existant ne produit pas les résultats attendus, et hiérarchise les corrections par impact.",
    sections: [
      { h: "Ce qu'un audit mesure réellement", p: [
        "L'apparence d'un site relève du goût ; son efficacité se mesure. Un audit sérieux passe en revue des critères vérifiables : le temps de chargement, l'affichage sur mobile, la présence du protocole HTTPS, les balises de titre et de description, les données structurées lisibles par Google et les moteurs de réponse par IA, la profondeur du contenu, et la clarté des appels à l'action.",
      ]},
      { h: "Distinguer le symptôme de la cause", p: [
        "« Mon site ne rapporte rien » est un symptôme. L'audit en identifie la cause précise : est-il introuvable faute d'indexation ? Trop lent, au point de perdre les visiteurs avant l'affichage ? Dépourvu des signaux que Google attend ? On ne corrige efficacement que ce que l'on a d'abord diagnostiqué.",
      ]},
      { h: "Un diagnostic hiérarchisé, pas une liste", p: [
        "Un audit utile ne se contente pas d'énumérer des défauts : il les classe par gravité et par impact commercial. Certains points bloquent toute visibilité et exigent une correction immédiate ; d'autres relèvent de l'optimisation progressive. Cette hiérarchisation est ce qui transforme un constat en plan d'action.",
      ]},
    ],
    faq: [
      { q: "À quoi sert un audit de site internet ?", a: "À comprendre, preuves à l'appui, pourquoi un site ne performe pas — et à savoir quelles corrections auront le plus d'effet. C'est l'étape qui précède toute refonte ou optimisation raisonnée." },
      { q: "Faut-il un audit avant de refaire son site ?", a: "C'est vivement recommandé. Refondre sans diagnostic revient à traiter des symptômes au hasard. L'audit indique ce qui doit être conservé, corrigé ou reconstruit." },
      { q: "Un site récent a-t-il besoin d'un audit ?", a: "Souvent, oui. L'ancienneté ne garantit rien : un site récent peut être invisible sur Google, lent sur mobile ou dépourvu de données structurées. Seul l'examen le dit." },
    ],
  },
  {
    slug: "optimiser-referencement-site-existant",
    title: "Optimiser le référencement d'un site existant — Wyngo",
    h1: "Comment optimiser le référencement d'un site déjà en ligne ?",
    desc: "Optimiser un site existant sans tout refaire : indexation, balises, données structurées, contenu, maillage. Les réglages qui gagnent en visibilité.",
    reponse:
      "Optimiser le référencement d'un site existant consiste à corriger, sans le reconstruire, les éléments qui limitent sa visibilité : vérifier son indexation par Google, ajuster les balises de titre et de description, ajouter les données structurées manquantes, enrichir un contenu trop pauvre et renforcer les liens entre les pages. Ces réglages se réalisent sur le site en place et produisent des effets mesurables en quelques semaines.",
    sections: [
      { h: "S'assurer d'abord que Google voit le site", p: [
        "Avant toute optimisation, une vérification s'impose : Google indexe-t-il réellement les pages ? Un site absent de l'index ne peut se positionner sur aucune requête. Cela se contrôle dans Search Console. Sans cette base, tout autre réglage est prématuré.",
      ]},
      { h: "Les réglages à fort effet de levier", p: [
        "Certaines corrections demandent peu d'effort pour un gain notable :",
      ], ul: [
        "<strong>Balises de titre et de description</strong> — ce que Google affiche dans ses résultats, et ce qui décide du clic.",
        "<strong>Données structurées</strong> — sans elles, un site reste quasi invisible pour les réponses par IA de Google.",
        "<strong>Contenu</strong> — un site trop pauvre en texte ne donne à Google aucune matière pour le positionner.",
        "<strong>Maillage interne</strong> — des liens cohérents entre les pages renforcent leur autorité mutuelle.",
      ]},
      { h: "Optimiser, ou refaire ?", p: [
        "Tout ne se règle pas par l'optimisation. Un site construit sur une base technique obsolète, illisible sur mobile ou impossible à faire évoluer, atteint vite ses limites. La règle est simple : on optimise une base saine, on refait une base défaillante. Un audit préalable tranche la question.",
      ]},
    ],
    faq: [
      { q: "Peut-on améliorer son référencement sans refaire le site ?", a: "Souvent, oui. Si la base technique est saine, un travail sur l'indexation, les balises, les données structurées et le contenu suffit à gagner en visibilité, sans reconstruction." },
      { q: "Combien de temps avant de voir les effets d'une optimisation ?", a: "Les corrections techniques sont prises en compte en quelques jours à quelques semaines par Google ; les gains de positionnement se consolident ensuite sur plusieurs semaines." },
      { q: "Comment savoir si mon site mérite d'être optimisé ou refait ?", a: "Par un audit. Il évalue si la base est récupérable ou si les fondations elles-mêmes limitent le site, et oriente vers la solution la plus rentable." },
    ],
  },
  {
    slug: "site-internet-lent-performance",
    title: "Site internet lent : diagnostic et solutions — Wyngo",
    h1: "Pourquoi un site internet lent fait fuir les clients",
    desc: "Un site lent perd ses visiteurs et se fait pénaliser par Google. Les causes fréquentes de lenteur et les leviers pour restaurer la performance d'un site.",
    reponse:
      "Un site lent perd une part importante de ses visiteurs avant même l'affichage, et Google intègre la vitesse de chargement à son classement. Les causes les plus fréquentes sont des images trop lourdes, l'absence de compression, un hébergement inadapté et un code alourdi par des outils superflus. Restaurer la performance passe par la correction de ces points, mesurables objectivement.",
    sections: [
      { h: "La lenteur a un coût direct", p: [
        "Au-delà de deux à trois secondes de chargement, une proportion croissante de visiteurs abandonnent. Pour une recherche locale, souvent effectuée sur mobile en situation de mobilité, ce délai est fatal : le prospect revient à la liste des résultats et choisit un concurrent. La vitesse n'est pas un détail de confort, c'est un facteur de conversion.",
      ]},
      { h: "Les causes les plus fréquentes", p: [
        "La lenteur provient rarement d'une seule origine. Les responsables habituels : des images non compressées et livrées à leur taille d'origine, l'absence de compression des fichiers, un hébergement mutualisé saturé, et l'accumulation de scripts tiers (widgets, traceurs, animations) qui s'exécutent avant l'affichage.",
      ]},
      { h: "Une performance qui se mesure", p: [
        "Ces facteurs sont quantifiables : Google publie des indicateurs de performance qu'il utilise lui-même pour classer les sites. Un diagnostic chiffré remplace les impressions par des données, et indique précisément quels leviers activer pour ramener le temps de chargement dans les limites acceptables.",
      ]},
    ],
    faq: [
      { q: "La vitesse d'un site influence-t-elle le référencement ?", a: "Oui. Google intègre officiellement des indicateurs de performance à son classement, en particulier sur mobile. À contenu équivalent, un site rapide est avantagé." },
      { q: "Quelles sont les principales causes d'un site lent ?", a: "Le plus souvent : des images trop lourdes, l'absence de compression, un hébergement inadapté et un excès de scripts tiers exécutés au chargement." },
      { q: "Peut-on accélérer un site sans le refaire entièrement ?", a: "Fréquemment, oui. Compresser les images, activer la compression des fichiers et alléger les scripts superflus suffit souvent à améliorer nettement la performance." },
    ],
  },
  {
    slug: "site-internet-invisible-sur-google",
    title: "Mon site n'apparaît pas sur Google : causes — Wyngo",
    h1: "Pourquoi mon site n'apparaît pas sur Google ?",
    desc: "Un site peut être en ligne sans être visible sur Google. Les causes techniques les plus fréquentes — indexation, balises, contenu — et la manière de les corriger.",
    reponse:
      "Un site peut être parfaitement en ligne sans apparaître sur Google. Les causes les plus fréquentes sont techniques : les pages ne sont pas indexées, une balise bloque leur exploration, le contenu est trop pauvre pour être jugé pertinent, ou le site est trop récent pour être encore évalué. Chacune se vérifie dans Google Search Console, et se corrige méthodiquement.",
    sections: [
      { h: "En ligne n'est pas synonyme d'indexé", p: [
        "Une confusion fréquente : un site accessible par son adresse n'est pas nécessairement présent dans l'index de Google. Tant qu'une page n'est pas indexée, elle ne peut apparaître sur aucune recherche. La première vérification consiste donc à confirmer, dans Search Console, que Google connaît et a retenu les pages.",
      ]},
      { h: "Les blocages techniques courants", p: [
        "Plusieurs éléments peuvent empêcher, involontairement, l'apparition d'un site : une balise « noindex » oubliée qui demande à Google de l'ignorer, un fichier robots.txt trop restrictif, l'absence de sitemap, ou des balises de titre manquantes. Ces réglages sont invisibles pour le visiteur mais déterminants pour le moteur.",
      ]},
      { h: "Pertinence et ancienneté", p: [
        "Une fois le site techniquement irréprochable, restent deux facteurs. La pertinence : un contenu trop mince ne donne à Google aucune raison de positionner le site sur une requête. Et le temps : un site récent traverse une période d'évaluation durant laquelle sa visibilité se construit progressivement, à mesure que la confiance s'installe.",
      ]},
    ],
    faq: [
      { q: "Comment savoir si mon site est indexé par Google ?", a: "En tapant « site:votredomaine.fr » dans Google, ou en consultant Search Console. Si aucune page ne ressort, le site n'est pas indexé et doit être soumis pour exploration." },
      { q: "Mon site est en ligne mais introuvable, est-ce normal ?", a: "Au début, oui : un site neuf n'est pas indexé instantanément. Passé quelques semaines sans apparaître, il faut vérifier les blocages techniques et l'indexation." },
      { q: "Que faire si mon site n'apparaît toujours pas ?", a: "Vérifier l'indexation dans Search Console, lever les éventuels blocages (noindex, robots.txt), soumettre un sitemap et renforcer le contenu. Un audit identifie précisément l'obstacle." },
    ],
  }
];

const esc = (s) => String(s).replace(/&(?!\w+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const txt = (s) => String(s).replace(/<[^>]+>/g, "");

function render(p, autres) {
  const url = `${SITE}/${p.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url, url, name: p.title, description: p.desc,
        inLanguage: "fr-FR", datePublished: MAJ, dateModified: MAJ,
        isPartOf: { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "Wyngo" },
        about: { "@id": `${SITE}/#organization` },
        primaryImageOfPage: { "@type": "ImageObject", url: `${SITE}/favicon.png` },
        speakable: { "@type": "SpeakableSpecification", cssSelector: [".lede", "h1"] },
      },
      {
        "@type": "Organization", "@id": `${SITE}/#organization`,
        name: "Wyngo", alternateName: "Cabinet Wyngo", url: SITE,
        legalName: "Hugo Malet", foundingDate: "2026-05-14",
        telephone: TEL, email: "contact@wyngo.fr",
        identifier: [{ "@type": "PropertyValue", propertyID: "SIREN", value: "105481386" }],
        founder: { "@type": "Person", name: "Hugo Malet" },
        areaServed: { "@type": "GeoCircle",
          geoMidpoint: { "@type": "GeoCoordinates", latitude: 43.6045, longitude: 1.4442 },
          geoRadius: "30000", description: "Toulouse et 30 km alentour" },
        sameAs: ["https://www.linkedin.com/company/wyngofr/", KG],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Wyngo", item: SITE },
          { "@type": "ListItem", position: 2, name: p.h1, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: p.faq.map((f) => ({
          "@type": "Question", name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  const corps = p.sections.map((s) => `
    <h2>${s.h}</h2>
    ${(s.p || []).map((x) => `<p>${x}</p>`).join("\n    ")}
    ${s.ul ? `<ul>${s.ul.map((li) => `<li>${li}</li>`).join("")}</ul>` : ""}`).join("\n");

  const faqHtml = p.faq.map((f) => `
      <div class="faq"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join("");

  const liens = autres.map((a) => `<a href="/${a.slug}">${esc(a.h1)}</a>`).join("");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Wyngo">
<meta property="og:locale" content="fr_FR">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}/og.png">
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
<nav><div class="wrap">
  <a href="/" style="text-decoration:none;color:inherit"><span class="wm">Wyngo</span><span class="wm-tag">Cabinet de présence digitale</span></a>
  <a href="/#contact">Soumettre une candidature</a>
</div></nav>

<header><div class="wrap">
  <div class="bc"><a href="/">Wyngo</a> › ${esc(p.h1)}</div>
  <h1>${esc(p.h1)}</h1>
  <p class="lede">${esc(p.reponse)}</p>
</div></header>

<main><div class="wrap">
${corps}

  <h2>Questions fréquentes</h2>
  ${faqHtml}

  <div class="card">
    <h3>À lire aussi</h3>
    <div class="rel">${liens}</div>
  </div>

  <div class="cta">
    <h2>Parlons de votre projet</h2>
    <p>Wyngo accompagne 9 entrepreneurs par trimestre, à Toulouse et 30 km alentour.</p>
    <a class="btn" href="/#contact">Soumettre une candidature</a>
  </div>
</div></main>

<footer><div class="wrap">
  <p><strong>Wyngo</strong> — cabinet de présence digitale, Toulouse et 30 km alentour.<br>
  <a href="tel:${TEL}">${TEL_AFF}</a> · <a href="mailto:contact@wyngo.fr">contact@wyngo.fr</a></p>
</div></footer>
</body>
</html>`;
}

// ── Génération ──
for (const p of PAGES) {
  const i = PAGES.indexOf(p);
  // Maillage cyclique : chaque page renvoie vers les 4 suivantes (en bouclant).
  // Les liens internes se répartissent ainsi sur tout le site plutôt que de
  // pointer toujours vers les 4 mêmes pages.
  const autres = [...PAGES.slice(i + 1), ...PAGES.slice(0, i)].slice(0, 4);
  writeFileSync(`${p.slug}.html`, render(p, autres));
  console.log("✓", `${p.slug}.html`);
}

// robots.txt — autorise EXPLICITEMENT les robots des IA (aperçus IA, ChatGPT,
// Claude, Perplexity). Sans mention, l'accès est permis par défaut, mais une
// autorisation explicite lève toute ambiguïté et déclare le sitemap.
writeFileSync("robots.txt", `# wyngo.fr
User-agent: *
Allow: /

# Moteurs de réponse par IA — accès explicitement autorisé
User-agent: Google-Extended
Allow: /
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-Web
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: Bingbot
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);
console.log("✓ robots.txt");

// sitemap.xml
const urls = [{ loc: SITE + "/", prio: "1.0" }, ...PAGES.map((p) => ({ loc: `${SITE}/${p.slug}`, prio: "0.8" }))];
writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${MAJ}</lastmod><priority>${u.prio}</priority></url>`).join("\n")}
</urlset>
`);
console.log("✓ sitemap.xml");

// llms.txt — résumé structuré destiné aux agents IA (standard émergent).
writeFileSync("llms.txt", `# Wyngo

> Cabinet de présence digitale basé à Toulouse. Conçoit des sites internet sur-mesure pour artisans, commerçants, professions libérales et TPE, à Toulouse et dans un rayon de 30 km.

Wyngo se distingue par une méthode d'immersion : une journée passée dans l'entreprise du client, pendant laquelle les textes sont rédigés et les photos produites sur place. Le code source est remis au client à la livraison. Aucun paiement n'est demandé avant validation de la première maquette. Le cabinet accompagne 9 entrepreneurs par trimestre.

- Entité légale : Hugo Malet (enseigne Wyngo), SIREN 105481386, immatriculée le 14 mai 2026
- Téléphone : ${TEL_AFF}
- Email : contact@wyngo.fr
- Zone : Toulouse et 30 km alentour

## Pages
${PAGES.map((p) => `- [${p.h1}](${SITE}/${p.slug}) : ${p.desc}`).join("\n")}

## À propos
- [Site principal](${SITE}/) : présentation du cabinet, méthode, études de cas
- [Le Radar Tech](https://leradartech.fr/article/wyngo-decouverte-2026/) : article de presse consacré à Wyngo
`);
console.log("✓ llms.txt");
console.log(`\n${PAGES.length} pages + robots.txt + sitemap.xml + llms.txt générés.`);
